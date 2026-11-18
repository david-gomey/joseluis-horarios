import { describe, expect, it } from 'vitest'
import { emptyData } from './defaults'
import { rebase } from './merge'
import type { Data } from './types'

function base(): Data {
  const d = emptyData()
  d.employees = [
    { id: 'a', name: 'Ana' },
    { id: 'm', name: 'Marta' },
  ]
  d.schedule = { '2026-12-07': { a: { type: 'libre' }, m: { type: 'libre' } } }
  return d
}

describe('juntar cambios de dos dispositivos', () => {
  it('conserva los cambios de los dos si tocan casillas distintas', () => {
    const b = base()
    const local = structuredClone(b)
    local.schedule['2026-12-07'].a = { type: 'vacaciones' }
    local.holidays['2026-12-08'] = {}
    const remote = structuredClone(b)
    remote.schedule['2026-12-07'].m = { type: 'baja' }
    remote.schedule['2026-12-09'] = { a: { type: 'libre' } }

    const out = rebase(b, local, remote)
    expect(out.schedule['2026-12-07']).toEqual({ a: { type: 'vacaciones' }, m: { type: 'baja' } })
    expect(out.schedule['2026-12-09']).toEqual({ a: { type: 'libre' } })
    expect(out.holidays).toEqual({ '2026-12-08': {} })
  })

  it('aplica también los borrados hechos aquí', () => {
    const b = base()
    const local = structuredClone(b)
    delete local.schedule['2026-12-07']
    const remote = structuredClone(b)
    remote.pdfHeading = 'Tienda'
    const out = rebase(b, local, remote)
    expect(out.schedule['2026-12-07']).toBeUndefined()
    expect(out.pdfHeading).toBe('Tienda')
  })

  it('junta dependientas añadidas en los dos sitios', () => {
    const b = base()
    const local = structuredClone(b)
    local.employees.push({ id: 'k', name: 'Karina' })
    const remote = structuredClone(b)
    remote.employees.push({ id: 'v', name: 'Vanesa' })
    expect(rebase(b, local, remote).employees.map((e) => e.name)).toEqual(['Ana', 'Marta', 'Karina', 'Vanesa'])
    // si aquí no se tocó la lista, se queda la del otro dispositivo tal cual
    expect(rebase(b, structuredClone(b), remote).employees.map((e) => e.name)).toEqual(['Ana', 'Marta', 'Vanesa'])
  })
})
