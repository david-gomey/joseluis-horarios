import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayIndex,
  mondayOf,
  pdfFileName,
  periodLabel,
  shortDate,
  weekTitle,
  weeksInRange,
  weeksOfMonth,
} from './dates'
import { emptyData, parseBackup } from './defaults'
import { periodStats, previousOpenSundays, resolveCell, weekMinutes } from './schedule'
import { classify, formatHours, formatSegment, normalizeTime, segmentsMinutes, validateSegments } from './shifts'
import type { Data, Entry } from './types'

const seg = (start: string, end: string) => ({ start, end })
const turno = (...s: [string, string][]): Entry => ({ type: 'turno', segments: s.map(([a, b]) => seg(a, b)) })

describe('fechas', () => {
  it('calcula el lunes y el día de la semana', () => {
    expect(mondayOf('2026-12-13')).toBe('2026-12-07') // domingo → lunes anterior
    expect(mondayOf('2026-12-07')).toBe('2026-12-07')
    expect(dayIndex('2026-12-08')).toBe(1)
    expect(addDays('2026-12-28', 7)).toBe('2027-01-04')
  })

  it('no se descuadra con el cambio de hora', () => {
    expect(addDays('2027-03-27', 1)).toBe('2027-03-28')
    expect(addDays('2027-03-28', 1)).toBe('2027-03-29')
    expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
  })

  it('escribe los títulos de semana como en el PDF', () => {
    expect(weekTitle('2026-12-07')).toBe('Semana del 7 al 13 de diciembre')
    expect(weekTitle('2026-11-30')).toBe('Semana del 30 de noviembre al 6 de diciembre')
    expect(weekTitle('2026-12-28')).toBe('Semana del 28 de diciembre de 2026 al 3 de enero de 2027')
    expect(shortDate('2027-01-06')).toBe('6 ene')
  })

  it('titula el periodo y el archivo', () => {
    expect(periodLabel('2026-12-07', '2027-01-31')).toBe('Diciembre 2026 – Enero 2027')
    expect(periodLabel('2026-11-30', '2026-12-27')).toBe('Diciembre 2026')
    expect(periodLabel('2026-11-02', '2026-12-27')).toBe('Noviembre – Diciembre 2026')
    expect(pdfFileName('2026-12-07', '2027-01-31')).toBe('Horarios_dic2026-ene2027.pdf')
    expect(pdfFileName('2026-11-30', '2026-12-27', 'Tienda Centro')).toBe('Tienda_Centro_dic2026.pdf')
  })

  it('reparte semanas por mes según su jueves', () => {
    expect(weeksOfMonth(2026, 11)).toEqual({ start: '2026-11-30', end: '2027-01-03' })
    expect(weeksOfMonth(2027, 0)).toEqual({ start: '2027-01-04', end: '2027-01-31' })
    expect(weeksInRange('2026-12-07', '2027-01-31')).toHaveLength(8)
  })
})

describe('turnos', () => {
  it('clasifica mañana, tarde y partido como en el ejemplo', () => {
    expect(classify([seg('09:00', '17:00')])).toBe('manana')
    expect(classify([seg('10:00', '14:00')])).toBe('manana')
    expect(classify([seg('12:00', '20:00')])).toBe('tarde')
    expect(classify([seg('16:00', '22:00')])).toBe('tarde')
    expect(classify([seg('10:00', '14:00'), seg('18:00', '22:00')])).toBe('partido')
  })

  it('formatea horas y duraciones', () => {
    expect(formatSegment(seg('09:00', '17:00'))).toBe('9:00 – 17:00')
    expect(segmentsMinutes([seg('10:00', '14:00'), seg('18:00', '22:00')])).toBe(480)
    expect(formatHours(2400)).toBe('40 h')
    expect(formatHours(2250)).toBe('37,5 h')
    expect(formatHours(2410)).toBe('40 h 10 min')
  })

  it('normaliza horas escritas a mano', () => {
    expect(normalizeTime('9')).toBe('09:00')
    expect(normalizeTime('930')).toBe('09:30')
    expect(normalizeTime('9.3')).toBe('09:30')
    expect(normalizeTime('25')).toBeNull()
  })

  it('valida tramos', () => {
    expect(validateSegments([seg('09:00', '17:00')])).toBeNull()
    expect(validateSegments([seg('17:00', '09:00')])).toMatch(/posterior/)
    expect(validateSegments([seg('10:00', '15:00'), seg('14:00', '22:00')])).toMatch(/solapan/)
  })
})

function sample(): Data {
  const d = emptyData()
  d.employees = [
    { id: 'a', name: 'Ana', weeklyHours: 20 },
    { id: 'm', name: 'Marta' },
  ]
  d.holidays['2026-12-08'] = {}
  d.schedule = {
    '2026-11-22': { a: turno(['10:00', '14:00']) },
    '2026-11-29': { m: turno(['10:00', '14:00'], ['18:00', '22:00']) },
    '2026-12-06': { a: turno(['09:00', '17:00']), m: { type: 'libre' } },
    '2026-12-07': { a: turno(['10:00', '14:00']), m: turno(['14:00', '22:00']) },
    '2026-12-08': { m: turno(['10:00', '14:00']) }, // trabaja en festivo
    '2026-12-13': { m: turno(['09:00', '17:00']) },
  }
  return d
}

describe('calendario', () => {
  it('rellena festivo y libre cuando no hay nada guardado', () => {
    const d = sample()
    expect(resolveCell(d, '2026-12-08', 'a')).toMatchObject({ kind: 'festivo', implicit: true })
    expect(resolveCell(d, '2026-12-09', 'a')).toMatchObject({ kind: 'libre', implicit: true })
    expect(resolveCell(d, '2026-12-08', 'm')).toMatchObject({ kind: 'manana', implicit: false })
  })

  it('suma horas de la semana', () => {
    expect(weekMinutes(sample(), '2026-12-07', 'm')).toBe(8 * 60 + 4 * 60 + 8 * 60)
  })

  it('encuentra los domingos de apertura previos en orden', () => {
    const groups = previousOpenSundays(sample(), '2026-12-07', 2)
    expect(groups.map((g) => g.date)).toEqual(['2026-11-29', '2026-12-06'])
    expect(groups[1].people.map((p) => p.employee.name)).toEqual(['Ana'])
    expect(previousOpenSundays(sample(), '2026-12-07', 5).map((g) => g.date)).toEqual([
      '2026-11-22',
      '2026-11-29',
      '2026-12-06',
    ])
  })

  it('cuenta domingos y festivos trabajados', () => {
    const [ana, marta] = periodStats(sample(), '2026-12-01', '2026-12-31')
    expect(ana).toMatchObject({ daysWorked: 2, sundaysWorked: 1, holidaysWorked: 0 })
    expect(marta).toMatchObject({ daysWorked: 3, sundaysWorked: 1, holidaysWorked: 1, libres: 1 })
  })

  it('acepta solo copias de seguridad válidas', () => {
    expect(() => parseBackup({ foo: 1 })).toThrow()
    expect(parseBackup(JSON.parse(JSON.stringify(sample()))).employees).toHaveLength(2)
  })
})
