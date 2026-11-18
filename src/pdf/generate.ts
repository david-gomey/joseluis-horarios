import { pdf } from '@react-pdf/renderer'
import f400 from '@fontsource/fira-sans/files/fira-sans-latin-400-normal.woff?url'
import f500 from '@fontsource/fira-sans/files/fira-sans-latin-500-normal.woff?url'
import f600 from '@fontsource/fira-sans/files/fira-sans-latin-600-normal.woff?url'
import f700 from '@fontsource/fira-sans/files/fira-sans-latin-700-normal.woff?url'
import type { Data } from '../lib/types'
import { buildPdfProps, type PdfOptions } from './buildPdf'
import { registerPdfFonts } from './fonts'
import { SchedulePdf } from './SchedulePdf'

/** Se carga bajo demanda (al pulsar «Generar PDF») para que la app arranque rápido */
export async function generatePdfBlob(data: Data, opts: PdfOptions): Promise<Blob> {
  registerPdfFonts({ 400: f400, 500: f500, 600: f600, 700: f700 })
  // pdf() espera directamente un <Document>, por eso se llama al componente como función
  return pdf(SchedulePdf(buildPdfProps(data, opts))).toBlob()
}
