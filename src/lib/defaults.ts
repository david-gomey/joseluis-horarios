import type { Data, Segment, Template } from './types'

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const seg = (start: string, end: string): Segment => ({ start, end })

/** Turnos habituales de la tienda (sacados del PDF de diciembre–enero) */
export function defaultTemplates(): Template[] {
  return [
    [seg('09:00', '15:00')],
    [seg('09:00', '16:00')],
    [seg('09:00', '17:00')],
    [seg('10:00', '14:00')],
    [seg('10:00', '16:00')],
    [seg('10:00', '17:00')],
    [seg('12:00', '20:00')],
    [seg('14:00', '22:00')],
    [seg('15:00', '22:00')],
    [seg('16:00', '22:00')],
    [seg('10:00', '14:00'), seg('18:00', '22:00')],
  ].map((segments) => ({ id: newId(), segments }))
}

export function emptyData(): Data {
  return {
    version: 1,
    pdfHeading: 'Horarios',
    employees: [],
    templates: defaultTemplates(),
    holidays: {},
    schedule: {},
  }
}

/** Comprueba por encima que un JSON importado tiene la forma esperada */
export function parseBackup(json: unknown): Data {
  const d = json as Partial<Data>
  if (!d || typeof d !== 'object' || d.version !== 1 || !Array.isArray(d.employees) || !Array.isArray(d.templates)) {
    throw new Error('El archivo no parece una copia de seguridad de Horarios')
  }
  return {
    version: 1,
    pdfHeading: typeof d.pdfHeading === 'string' ? d.pdfHeading : 'Horarios',
    employees: d.employees,
    templates: d.templates,
    holidays: d.holidays ?? {},
    schedule: d.schedule ?? {},
  }
}
