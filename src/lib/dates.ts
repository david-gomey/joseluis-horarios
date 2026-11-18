import type { ISODate } from './types'

export const DAY_NAMES = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
export const DAY_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
export const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]
export const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

const pad = (n: number) => String(n).padStart(2, '0')

export function toISO(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Crea la fecha a mediodía local para evitar sorpresas con cambios de hora */
export function fromISO(iso: ISODate): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12)
}

export function todayISO(): ISODate {
  return toISO(new Date())
}

export function addDays(iso: ISODate, n: number): ISODate {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** 0 = lunes … 6 = domingo */
export function dayIndex(iso: ISODate): number {
  return (fromISO(iso).getDay() + 6) % 7
}

export function isSunday(iso: ISODate): boolean {
  return dayIndex(iso) === 6
}

export function mondayOf(iso: ISODate): ISODate {
  return addDays(iso, -dayIndex(iso))
}

export function sundayOf(iso: ISODate): ISODate {
  return addDays(mondayOf(iso), 6)
}

export function weekDays(monday: ISODate): ISODate[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i))
}

/** Lunes de cada semana entre dos fechas (ambas incluidas) */
export function weeksInRange(start: ISODate, end: ISODate): ISODate[] {
  const weeks: ISODate[] = []
  for (let m = mondayOf(start); m <= end; m = addDays(m, 7)) weeks.push(m)
  return weeks
}

export function daysInRange(start: ISODate, end: ISODate): ISODate[] {
  const days: ISODate[] = []
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)
  return days
}

function parts(iso: ISODate) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m: m - 1, d }
}

/** «7 dic» */
export function shortDate(iso: ISODate): string {
  const { m, d } = parts(iso)
  return `${d} ${MONTHS_SHORT[m]}`
}

/** «29 de noviembre» */
export function longDate(iso: ISODate): string {
  const { m, d } = parts(iso)
  return `${d} de ${MONTHS[m]}`
}

/** «martes 8 de diciembre» */
export function fullDate(iso: ISODate): string {
  return `${DAY_NAMES[dayIndex(iso)].toLowerCase()} ${longDate(iso)}`
}

/**
 * «Semana del 7 al 13 de diciembre»
 * «Semana del 30 de noviembre al 6 de diciembre»
 * «Semana del 28 de diciembre de 2026 al 3 de enero de 2027»
 */
export function weekTitle(monday: ISODate): string {
  const a = parts(monday)
  const b = parts(addDays(monday, 6))
  if (a.y !== b.y) {
    return `Semana del ${a.d} de ${MONTHS[a.m]} de ${a.y} al ${b.d} de ${MONTHS[b.m]} de ${b.y}`
  }
  if (a.m !== b.m) {
    return `Semana del ${a.d} de ${MONTHS[a.m]} al ${b.d} de ${MONTHS[b.m]}`
  }
  return `Semana del ${a.d} al ${b.d} de ${MONTHS[a.m]}`
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/**
 * Mes al que «pertenece» una semana: el del jueves (como las semanas ISO).
 * Así la semana del 30 nov al 6 dic cuenta como de diciembre.
 */
export function weekMonth(monday: ISODate): { y: number; m: number } {
  const { y, m } = parts(addDays(mondayOf(monday), 3))
  return { y, m }
}

/** «Diciembre 2026 – Enero 2027», «Noviembre – Diciembre 2026» o «Diciembre 2026» */
export function periodLabel(start: ISODate, end: ISODate): string {
  const a = weekMonth(start)
  const b = weekMonth(end)
  if (a.y === b.y && a.m === b.m) return `${cap(MONTHS[a.m])} ${a.y}`
  if (a.y === b.y) return `${cap(MONTHS[a.m])} – ${cap(MONTHS[b.m])} ${a.y}`
  return `${cap(MONTHS[a.m])} ${a.y} – ${cap(MONTHS[b.m])} ${b.y}`
}

/** «Horarios_dic2026-ene2027.pdf» */
export function pdfFileName(start: ISODate, end: ISODate, prefix = 'Horarios'): string {
  const a = weekMonth(start)
  const b = weekMonth(end)
  const tag = (x: { y: number; m: number }) => `${MONTHS_SHORT[x.m]}${x.y}`
  const safe = prefix.trim().replace(/[^\p{L}\p{N}_-]+/gu, '_') || 'Horarios'
  return a.y === b.y && a.m === b.m ? `${safe}_${tag(a)}.pdf` : `${safe}_${tag(a)}-${tag(b)}.pdf`
}

/** Semanas cuyo jueves cae en el mes indicado (m: 0-11) */
export function weeksOfMonth(y: number, m: number): { start: ISODate; end: ISODate } {
  const first = toISO(new Date(y, m, 1, 12))
  let monday = mondayOf(first)
  if (weekMonth(monday).m !== m) monday = addDays(monday, 7)
  let last = monday
  while (weekMonth(addDays(last, 7)).m === m && weekMonth(addDays(last, 7)).y === y) last = addDays(last, 7)
  return { start: monday, end: addDays(last, 6) }
}

export function monthLabel(y: number, m: number): string {
  return `${cap(MONTHS[m])} ${y}`
}
