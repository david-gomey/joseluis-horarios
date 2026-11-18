import { useState } from 'react'
import { MONTHS, fromISO, monthLabel, toISO } from '../lib/dates'
import { periodStats } from '../lib/schedule'
import { formatHours } from '../lib/shifts'
import type { ISODate } from '../lib/types'
import { useStore } from '../store'

type Mode = 'mes' | 'ano'

export function SummaryView({ initialDate }: { initialDate: ISODate }) {
  const data = useStore((s) => s.data)
  const d0 = fromISO(initialDate)
  const [year, setYear] = useState(d0.getFullYear())
  const [month, setMonth] = useState(d0.getMonth())
  const [mode, setMode] = useState<Mode>('mes')

  const start = mode === 'mes' ? toISO(new Date(year, month, 1, 12)) : `${year}-01-01`
  const end = mode === 'mes' ? toISO(new Date(year, month + 1, 0, 12)) : `${year}-12-31`
  const stats = periodStats(data, start, end)

  const shift = (delta: number) => {
    if (mode === 'ano') return setYear(year + delta)
    const d = new Date(year, month + delta, 1)
    setYear(d.getFullYear())
    setMonth(d.getMonth())
  }

  return (
    <section className="panel">
      <h1>Resumen</h1>
      <p className="muted">
        Para repartir bien domingos y festivos, y comprobar las horas de cada una. Solo cuenta lo que está en el
        calendario.
      </p>

      <div className="summary-nav">
        <div className="segmented">
          <button className={mode === 'mes' ? 'active' : ''} onClick={() => setMode('mes')}>
            Mes
          </button>
          <button className={mode === 'ano' ? 'active' : ''} onClick={() => setMode('ano')}>
            Año
          </button>
        </div>
        <button className="btn icon" onClick={() => shift(-1)} aria-label="Anterior">
          ‹
        </button>
        <strong className="summary-period">{mode === 'mes' ? monthLabel(year, month) : year}</strong>
        <button className="btn icon" onClick={() => shift(1)} aria-label="Siguiente">
          ›
        </button>
      </div>

      <div className="table-scroll">
        <table className="stats">
          <thead>
            <tr>
              <th>Dependienta</th>
              <th>Horas</th>
              <th>Días trabajados</th>
              <th>Domingos</th>
              <th>Festivos trabajados</th>
              <th>Libres</th>
              <th>Vacaciones</th>
              <th>Baja</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.employee.id}>
                <th scope="row">{s.employee.name}</th>
                <td>{formatHours(s.minutes)}</td>
                <td>{s.daysWorked}</td>
                <td>{s.sundaysWorked}</td>
                <td>{s.holidaysWorked}</td>
                <td>{s.libres}</td>
                <td>{s.vacaciones || '—'}</td>
                <td>{s.baja || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="hint">
        «Libres» cuenta los días marcados como libre explícitamente. Periodo: {mode === 'mes' ? `del 1 al último día de ${MONTHS[month]}` : `todo ${year}`}.
      </p>
    </section>
  )
}
