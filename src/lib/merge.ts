import type { Data } from './types'

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** Junta listas con id: si aquí se tocó la lista, manda la nuestra, más lo que el otro añadió */
function mergeList<T extends { id: string }>(base: T[], local: T[], remote: T[]): T[] {
  if (same(base, local)) return remote
  const known = new Set([...base, ...local].map((x) => x.id))
  return [...local, ...remote.filter((x) => !known.has(x.id))]
}

/**
 * Cuando otro dispositivo guardó antes que nosotros: aplica sobre su versión (`remote`)
 * solo lo que cambiamos aquí desde la última versión común (`base`).
 * Los horarios y festivos se juntan casilla a casilla, así que si cada una tocó días
 * o personas distintas no se pierde nada; si las dos tocaron la misma casilla, gana la nuestra.
 */
export function rebase(base: Data, local: Data, remote: Data): Data {
  const out: Data = structuredClone(remote)

  const dates = new Set([...Object.keys(base.schedule), ...Object.keys(local.schedule)])
  for (const date of dates) {
    const b = base.schedule[date] ?? {}
    const l = local.schedule[date] ?? {}
    for (const emp of new Set([...Object.keys(b), ...Object.keys(l)])) {
      if (same(b[emp], l[emp])) continue
      if (l[emp]) {
        out.schedule[date] ??= {}
        out.schedule[date][emp] = l[emp]
      } else if (out.schedule[date]) {
        delete out.schedule[date][emp]
        if (Object.keys(out.schedule[date]).length === 0) delete out.schedule[date]
      }
    }
  }

  for (const date of new Set([...Object.keys(base.holidays), ...Object.keys(local.holidays)])) {
    if (same(base.holidays[date], local.holidays[date])) continue
    if (local.holidays[date]) out.holidays[date] = local.holidays[date]
    else delete out.holidays[date]
  }

  out.employees = mergeList(base.employees, local.employees, remote.employees)
  out.templates = mergeList(base.templates, local.templates, remote.templates)
  if (base.pdfHeading !== local.pdfHeading) out.pdfHeading = local.pdfHeading
  return out
}
