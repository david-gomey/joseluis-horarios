import { addDays, mondayOf, periodLabel, weeksInRange } from '../lib/dates'
import { kindsUsed, previousOpenSundays } from '../lib/schedule'
import type { Data, ISODate } from '../lib/types'
import type { SchedulePdfProps } from './SchedulePdf'

export interface PdfOptions {
  start: ISODate
  end: ISODate
  /** Número de domingos de apertura previos a incluir (0 = ninguno) */
  previousSundays: number
  /** Título personalizado; si está vacío se usa «Horarios · Diciembre 2026 – Enero 2027» */
  heading?: string
}

/** Prepara todo lo que necesita el documento a partir de los datos y las opciones */
export function buildPdfProps(data: Data, opts: PdfOptions): SchedulePdfProps {
  const start = mondayOf(opts.start)
  const weeks = weeksInRange(start, opts.end)
  const end = addDays(weeks[weeks.length - 1], 6)
  const heading = opts.heading?.trim() || defaultHeading(data, start, end)
  return {
    data,
    weeks,
    heading,
    previousSundays: opts.previousSundays > 0 ? previousOpenSundays(data, start, opts.previousSundays) : [],
    usedKinds: kindsUsed(data, start, end),
  }
}

export function defaultHeading(data: Data, start: ISODate, end: ISODate) {
  return `${data.pdfHeading.trim() || 'Horarios'} · ${periodLabel(start, end)}`
}
