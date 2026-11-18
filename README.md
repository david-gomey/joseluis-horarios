# Horarios de la tienda

Aplicación web para preparar los horarios semanales de las dependientas y sacar el PDF para colgar en la tienda.

## Qué hace

- **Dependientas**: alta, baja, orden y horas de contrato semanales (opcional).
- **Turnos habituales**: 9:00–17:00, 14:00–22:00, partido 10:00–14:00 / 18:00–22:00… El color (mañana, tarde, partido) sale solo.
- **Calendario semanal**: una fila por dependienta y una columna por día.
  - Toca una casilla para elegir turno, Libre, Festivo, Vacaciones o Baja, o escribir un horario a medida.
  - Se puede aplicar a ese día, de lunes a viernes, de lunes a sábado o a toda la semana.
  - **Relleno rápido**: elige un turno y ve tocando casillas.
  - **Copiar semana anterior** o **de hace 2 semanas** (para turnos que rotan).
  - Toca el nombre de un día para marcarlo como **festivo**.
  - Horas por dependienta en la semana (en rojo si se pasa de su contrato) y cuántas trabajan cada día.
  - **Deshacer** (también con Ctrl/Cmd+Z).
- **Resumen** por mes o año: horas, días, domingos y festivos trabajados de cada una, para repartirlos de forma justa.
- **Generar PDF**: una página A4 apaisada por semana, igual que el modelo de diciembre de 2026 a enero de 2027, con la sección «Domingos de apertura previos» en la primera página.
- **Copia de seguridad**: descargar y cargar todos los datos en un archivo JSON.

## Dónde se guardan los datos

Con Supabase configurado (variables en `.env.local`), hay que entrar con email y contraseña, y los datos se guardan en la nube:

- Cada tienda es una fila de la tabla `stores` con todos sus datos en un JSON (`data`).
- `store_members` indica quién puede verla y editarla. Desde *Ajustes → Compartir* se da acceso a otra cuenta por su email.
- Si dos dispositivos guardan a la vez, gana el primero y el otro recarga sus datos (campo `revision`).
- Los cambios hechos en otro dispositivo aparecen solos (Realtime).
- Las políticas RLS impiden que nadie más vea los datos.

Sin Supabase, la app funciona igual, pero guarda solo en el navegador.

El esquema está en [`supabase/migrations`](supabase/migrations).

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y rellena la URL y la clave publicable de Supabase
npm run dev                  # http://localhost:5173
npm test                     # tests de la lógica (fechas, turnos, resúmenes)
npm run build                # genera dist/ para publicar
```

Para generar el PDF desde la terminal a partir de una copia de seguridad:

```bash
npx tsx scripts/render-pdf.tsx copia.json 2026-12-07 2027-01-31 horarios.pdf 2
```

La carpeta `datos/` no se sube al repositorio, porque el repositorio es público y ahí van los horarios reales.

## Tecnología

React + TypeScript + Vite, estado con Zustand, PDF con `@react-pdf/renderer` y tipografía Fira Sans, datos en Supabase (Postgres + Auth + Realtime).
