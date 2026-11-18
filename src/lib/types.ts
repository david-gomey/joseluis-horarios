/** Fecha local en formato YYYY-MM-DD */
export type ISODate = string

/** Tramo horario, horas en formato HH:MM (24 h) */
export interface Segment {
  start: string
  end: string
}

export type ShiftKind = 'manana' | 'tarde' | 'partido'
export type StatusKind = 'libre' | 'festivo' | 'vacaciones' | 'baja'
export type CellKind = ShiftKind | StatusKind

/** Lo que se guarda para una dependienta en un día concreto */
export type Entry = { type: 'turno'; segments: Segment[] } | { type: StatusKind }

export interface Employee {
  id: string
  name: string
  /** Horas semanales de contrato (opcional), para comparar con lo planificado */
  weeklyHours?: number | null
}

/** Turno habitual que se puede aplicar con un toque */
export interface Template {
  id: string
  segments: Segment[]
}

export interface Holiday {
  name?: string
}

/**
 * Todos los datos de la app en un único documento.
 * Se guarda tal cual en el navegador y se exporta/importa como copia de seguridad;
 * así también es fácil moverlo a una base de datos más adelante.
 */
export interface Data {
  version: 1
  /** Texto que encabeza el PDF, p. ej. «Horarios» */
  pdfHeading: string
  employees: Employee[]
  templates: Template[]
  holidays: Record<ISODate, Holiday>
  /** schedule[fecha][idDependienta] */
  schedule: Record<ISODate, Record<string, Entry>>
}
