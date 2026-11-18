import type { RealtimeChannel } from '@supabase/supabase-js'
import { parseBackup } from './lib/defaults'
import { supabase } from './lib/supabase'
import { useStore } from './store'

/**
 * Sincroniza el documento de la tienda con Supabase:
 * - al entrar descarga la tienda (o la crea con lo que hubiera en este navegador)
 * - cada cambio se guarda a los pocos segundos
 * - si otro dispositivo guarda, se recarga aquí automáticamente
 */

const SAVE_DELAY = 800
const RETRY_DELAY = 10_000

let saveTimer: ReturnType<typeof setTimeout> | null = null
let saving = false
let channel: RealtimeChannel | null = null
let unsubscribeStore: (() => void) | null = null
let currentUser: string | null = null

const errorText = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e))

function isNetworkError(e: unknown) {
  return !navigator.onLine || /fetch|network/i.test(errorText(e))
}

async function fetchStore() {
  const { data, error } = await supabase!
    .from('stores')
    .select('id, data, revision')
    .order('updated_at', { ascending: false })
    .limit(1)
  if (error) throw error
  return data[0] as { id: string; data: unknown; revision: number } | undefined
}

async function reloadFromRemote(message: string | null) {
  const row = await fetchStore()
  if (!row) return
  useStore.getState().applyRemote(parseBackup(row.data), row.revision, row.id)
  useStore.setState({ sync: 'saved', syncMessage: message })
}

function scheduleSave(delay = SAVE_DELAY) {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(save, delay)
}

async function save() {
  saveTimer = null
  const { data, revision, storeId, dirty } = useStore.getState()
  if (!supabase || !storeId || revision === null || !dirty) return
  if (saving) return scheduleSave()
  saving = true
  useStore.setState({ sync: 'saving' })
  try {
    const { data: rows, error } = await supabase
      .from('stores')
      .update({ data })
      .eq('id', storeId)
      .eq('revision', revision)
      .select('revision')
    if (error) throw error
    if (!rows.length) {
      // Otro dispositivo guardó antes: nos quedamos con su versión
      await reloadFromRemote(
        'Se han cargado cambios hechos desde otro dispositivo. Revisa tu último cambio por si hay que repetirlo.',
      )
      return
    }
    const stillSame = useStore.getState().data === data
    useStore.setState({
      revision: rows[0].revision,
      dirty: !stillSame,
      sync: stillSame ? 'saved' : 'pending',
      syncMessage: null,
    })
    if (!stillSame) scheduleSave()
  } catch (e) {
    const offline = isNetworkError(e)
    useStore.setState({
      sync: offline ? 'offline' : 'error',
      syncMessage: offline ? null : `No se ha podido guardar: ${errorText(e)}`,
    })
    scheduleSave(RETRY_DELAY)
  } finally {
    saving = false
  }
}

function subscribeRealtime(storeId: string) {
  channel?.unsubscribe()
  channel = supabase!
    .channel(`store-${storeId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'stores', filter: `id=eq.${storeId}` },
      (payload) => {
        const rev = (payload.new as { revision?: number }).revision ?? 0
        const s = useStore.getState()
        if (s.revision !== null && rev > s.revision && !saving && !s.dirty) {
          void reloadFromRemote(null)
        }
      },
    )
    .subscribe()
}

export async function startSync(userId: string) {
  if (!supabase) return
  if (currentUser === userId) return
  currentUser = userId
  useStore.setState({ sync: 'loading', syncMessage: null })
  try {
    const local = useStore.getState()
    const row = await fetchStore()
    if (!row) {
      // Primera vez: se sube lo que hubiera en este navegador (si no venía de otra cuenta)
      const initial = local.storeId ? useStore.getInitialState().data : local.data
      const { data: created, error } = await supabase.rpc('create_store', { p_name: 'Mi tienda', p_data: initial })
      if (error) throw error
      const store = created as { id: string; data: unknown; revision: number }
      useStore.getState().applyRemote(parseBackup(store.data), store.revision, store.id)
    } else if (local.storeId === row.id && local.revision === row.revision && local.dirty) {
      // Cambios hechos sin conexión sobre la última versión: se suben
      useStore.setState({ sync: 'pending' })
      scheduleSave(0)
    } else {
      useStore.getState().applyRemote(parseBackup(row.data), row.revision, row.id)
    }
    if (useStore.getState().sync === 'loading') useStore.setState({ sync: 'saved' })
    subscribeRealtime(useStore.getState().storeId!)
  } catch (e) {
    currentUser = null
    useStore.setState({
      sync: isNetworkError(e) ? 'offline' : 'error',
      syncMessage: `No se han podido cargar los datos: ${errorText(e)}`,
    })
    return
  }

  unsubscribeStore?.()
  unsubscribeStore = useStore.subscribe((s, prev) => {
    if (s.data !== prev.data && s.dirty) {
      useStore.setState({ sync: 'pending' })
      scheduleSave()
    }
  })
}

export function stopSync() {
  currentUser = null
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = null
  unsubscribeStore?.()
  unsubscribeStore = null
  channel?.unsubscribe()
  channel = null
}

/** Guarda ya lo pendiente (p. ej. antes de cerrar sesión) */
export async function flushSave() {
  if (saveTimer) {
    clearTimeout(saveTimer)
    await save()
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (useStore.getState().dirty) scheduleSave(0)
  })
  window.addEventListener('beforeunload', (ev) => {
    const s = useStore.getState()
    if (supabase && s.storeId && (s.dirty || saving)) {
      ev.preventDefault()
    }
  })
}
