-- Horarios de la tienda: esquema inicial
--
-- Cada tienda guarda todos sus datos (dependientas, turnos, festivos y horarios)
-- en un único documento JSON. `revision` sube en cada guardado y sirve para
-- detectar si otro dispositivo guardó antes (concurrencia optimista).

create schema if not exists private;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Mi tienda',
  data jsonb not null default '{}'::jsonb,
  revision integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

create table public.store_members (
  store_id uuid not null references public.stores (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now(),
  primary key (store_id, user_id)
);

create index store_members_user_id_idx on public.store_members (user_id);
create index stores_updated_by_idx on public.stores (updated_by);

alter table public.stores enable row level security;
alter table public.store_members enable row level security;

-- ¿Es la usuaria actual miembro de la tienda? (esquema privado: no se expone por la API)
create or replace function private.is_store_member(p_store uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.store_members m
    where m.store_id = p_store and m.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_store_member(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.is_store_member(uuid) to authenticated;

-- Al guardar: sube la revisión y apunta quién y cuándo
create or replace function private.touch_store()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.id := old.id;
  new.created_at := old.created_at;
  new.revision := old.revision + 1;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

create trigger stores_touch
before update on public.stores
for each row execute function private.touch_store();

-- Políticas: solo las miembros ven y modifican su tienda
create policy "Miembros ven su tienda" on public.stores
  for select to authenticated
  using ((select private.is_store_member(id)));

create policy "Miembros guardan su tienda" on public.stores
  for update to authenticated
  using ((select private.is_store_member(id)))
  with check ((select private.is_store_member(id)));

create policy "Miembros ven quién tiene acceso" on public.store_members
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_store_member(store_id)));

-- Crear una tienda y hacerse dueña de ella
create or replace function public.create_store(p_name text, p_data jsonb)
returns public.stores
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_store public.stores;
begin
  if auth.uid() is null then
    raise exception 'Hay que iniciar sesión';
  end if;
  insert into public.stores (name, data, updated_by)
  values (coalesce(nullif(trim(p_name), ''), 'Mi tienda'), coalesce(p_data, '{}'::jsonb), auth.uid())
  returning * into v_store;
  insert into public.store_members (store_id, user_id, role)
  values (v_store.id, auth.uid(), 'owner');
  return v_store;
end;
$$;

-- Dar acceso a otra persona (que ya se haya registrado) por su email
create or replace function public.add_store_member(p_store uuid, p_email text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
begin
  if not private.is_store_member(p_store) then
    raise exception 'No tienes acceso a esta tienda';
  end if;
  select u.id into v_user from auth.users u where lower(u.email) = lower(trim(p_email));
  if v_user is null then
    raise exception 'No hay ninguna cuenta con ese email. Primero tiene que registrarse en la app.';
  end if;
  insert into public.store_members (store_id, user_id, role)
  values (p_store, v_user, 'editor')
  on conflict do nothing;
end;
$$;

-- Lista de personas con acceso (con su email)
create or replace function public.list_store_members(p_store uuid)
returns table (user_id uuid, email text, role text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_store_member(p_store) then
    raise exception 'No tienes acceso a esta tienda';
  end if;
  return query
    select m.user_id, u.email::text, m.role
    from public.store_members m
    join auth.users u on u.id = m.user_id
    where m.store_id = p_store
    order by m.created_at;
end;
$$;

-- Quitar el acceso a alguien (solo la dueña; no se puede quitar a la dueña)
create or replace function public.remove_store_member(p_store uuid, p_user uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.store_members m
    where m.store_id = p_store and m.user_id = auth.uid() and m.role = 'owner'
  ) then
    raise exception 'Solo la dueña de la tienda puede quitar accesos';
  end if;
  delete from public.store_members m
  where m.store_id = p_store and m.user_id = p_user and m.role <> 'owner';
end;
$$;

revoke all on function public.create_store(text, jsonb) from public, anon;
revoke all on function public.add_store_member(uuid, text) from public, anon;
revoke all on function public.list_store_members(uuid) from public, anon;
revoke all on function public.remove_store_member(uuid, uuid) from public, anon;
grant execute on function public.create_store(text, jsonb) to authenticated;
grant execute on function public.add_store_member(uuid, text) to authenticated;
grant execute on function public.list_store_members(uuid) to authenticated;
grant execute on function public.remove_store_member(uuid, uuid) to authenticated;

-- Avisos en tiempo real cuando otro dispositivo guarda
alter publication supabase_realtime add table public.stores;
