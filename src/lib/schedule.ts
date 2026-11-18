import { addDays, daysInRange, isSunday } from './dates'
import { classify, segmentsMinutes } from './shifts'
import type { CellKind, Data, Employee, Entry, ISODate, Segment, Template } from './types'

export const KIND_LABEL: Record<CellKind, string> = {
  manana: 'Mañana',
  tarde: 'Tarde',
  partido: 'Partido',
  festivo: 'Festivo',
  libre: 'Libre',
  vacaciones: 'Vacaciones',
  baja: 'Baja',
}

/** Orden de la leyenda del PDF */
export const LEGEND_BASE: CellKind[] = ['manana', 'tarde', 'partido', 'festivo', 'libre']

export interface Cell {
  kind: CellKind
  segments: Segment[]
  /** true si no hay nada guardado y el valor sale por defecto (libre, o festivo si el día lo es) */
  implicit: boolean
}

export function entryToCell(entry: Entry): Cell {
  if (entry.type === 'turno') return { kind: classify(entry.segments), segments: entry.segments, implicit: false }
  return { kind: entry.type, segments: [], implicit: false }
}

export function resolveCell(data: Data, date: ISODate, employeeId: string): Cell {
  const entry = data.schedule[date]?.[employeeId]
  if (entry) return entryToCell(entry)
  return { kind: data.holidays[date] ? 'festivo' : 'libre', segments: [], implicit: true }
}

export function isWorking(cell: Cell): boolean {
  return cell.segments.length > 0
}

export function cellMinutes(cell: Cell): number {
  return segmentsMinutes(cell.segments)
}

export function templateKind(t: Template) {
  return classify(t.segments)
}

export interface EmployeeStats {
  employee: Employee
  minutes: number
  daysWorked: number
  sundaysWorked: number
  holidaysWorked: number
  libres: number
  vacaciones: number
  baja: number
}

export function periodStats(data: Data, start: ISODate, end: ISODate): EmployeeStats[] {
  const days = daysInRange(start, end)
  return data.employees.map((employee) => {
    const s: EmployeeStats = { employee, minutes: 0, daysWorked: 0, sundaysWorked: 0, holidaysWorked: 0, libres: 0, vacaciones: 0, baja: 0 }
    for (const d of days) {
      const cell = resolveCell(data, d, employee.id)
      if (isWorking(cell)) {
        s.minutes += cellMinutes(cell)
        s.daysWorked++
        if (isSunday(d)) s.sundaysWorked++
        if (data.holidays[d]) s.holidaysWorked++
      } else if (cell.kind === 'libre' && !cell.implicit) s.libres++
      else if (cell.kind === 'vacaciones') s.vacaciones++
      else if (cell.kind === 'baja') s.baja++
    }
    return s
  })
}

export function weekMinutes(data: Data, monday: ISODate, employeeId: string): number {
  let total = 0
  for (let i = 0; i < 7; i++) total += cellMinutes(resolveCell(data, addDays(monday, i), employeeId))
  return total
}

export interface SundayGroup {
  date: ISODate
  people: { employee: Employee; cell: Cell }[]
}

/**
 * Domingos anteriores a `before` en los que trabajó alguien (los `count` más recientes),
 * en orden cronológico. Es la sección «Domingos de apertura previos» del PDF.
 */
export function previousOpenSundays(data: Data, before: ISODate, count: number, lookbackWeeks = 52): SundayGroup[] {
  const result: SundayGroup[] = []
  let d = addDays(before, -1)
  while (!isSunday(d)) d = addDays(d, -1)
  for (let i = 0; i < lookbackWeeks && result.length < count; i++, d = addDays(d, -7)) {
    const people = data.employees
      .map((employee) => ({ employee, cell: resolveCell(data, d, employee.id) }))
      .filter((p) => isWorking(p.cell))
    if (people.length) result.push({ date: d, people })
  }
  return result.reverse()
}

/** Tipos que aparecen en un periodo (para añadir Vacaciones/Baja a la leyenda solo si se usan) */
export function kindsUsed(data: Data, start: ISODate, end: ISODate): Set<CellKind> {
  const kinds = new Set<CellKind>()
  for (const d of daysInRange(start, end)) for (const e of data.employees) kinds.add(resolveCell(data, d, e.id).kind)
  return kinds
}
