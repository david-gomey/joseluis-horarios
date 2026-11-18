/**
 * Genera el PDF desde la terminal a partir de una copia de seguridad (JSON).
 * Útil para comprobar el diseño sin abrir la app:
 *
 *   npx tsx scripts/render-pdf.tsx datos/copia.json 2026-12-07 2027-01-31 salida.pdf [domingosPrevios]
 */
import { renderToFile } from '@react-pdf/renderer'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { parseBackup } from '../src/lib/defaults'
import { buildPdfProps } from '../src/pdf/buildPdf'
import { registerPdfFonts } from '../src/pdf/fonts'
import { SchedulePdf } from '../src/pdf/SchedulePdf'

const [file, start, end, out = 'horarios.pdf', sundays = '2'] = process.argv.slice(2)
if (!file || !start || !end) {
  console.error('Uso: npx tsx scripts/render-pdf.tsx copia.json AAAA-MM-DD AAAA-MM-DD [salida.pdf] [domingos]')
  process.exit(1)
}

const require = createRequire(import.meta.url)
const font = (w: number) => require.resolve(`@fontsource/fira-sans/files/fira-sans-latin-${w}-normal.woff`)
registerPdfFonts({ 400: font(400), 500: font(500), 600: font(600), 700: font(700) })

const data = parseBackup(JSON.parse(readFileSync(file, 'utf8')))
const props = buildPdfProps(data, { start, end, previousSundays: Number(sundays) })
await renderToFile(SchedulePdf(props), out)
console.log(`PDF generado: ${out} (${props.weeks.length} páginas)`)
