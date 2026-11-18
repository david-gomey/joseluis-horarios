import { useState } from 'react'
import { DAY_NAMES, addDays, mondayOf, shortDate, todayISO, weekDays, weekTitle } from '../lib/dates'
import { isWorking, resolveCell, weekMinutes } from '../lib/schedule'
import { classify, formatHours, formatSegments } from '../lib/shifts'
import type { CellKind, Entry, ISODate } from '../lib/types'
import { useStore } from '../store'
import { CellEditor } from './CellEditor'
import { CellTile } from './CellTile'

interface Brush {
  key: string
  label: string
  kind: CellKind | 'borrar'
  entry: Entry | null
}

export function WeekView(props: { monday: ISODate; setMonday(m: ISODate): void; goToEmployees(): void }) {
  const { monday, setMonday, goToEmployees } = props
  const data = useStore((s) => s.data)
  const { setEntry, toggleHoliday, copyWeek, clearWeek } = useStore.getState()
  const [brush, setBrush] = useState<Brush | null>(null)
  const [editing, setEditing] = useState<{ date: ISODate; employeeId: string } | null>(null)

  const days = weekDays(monday)
  const today = todayISO()
  const weekHasEntries = days.some((d) => data.schedule[d] && Object.keys(data.schedule[d]).length)

  const brushes: Brush[] = [
    ...data.templates.map((t) => ({
      key: t.id,
      label: formatSegments(t.segments),
      kind: classify(t.segments),
      entry: { type: 'turno', segments: t.segments } as Entry,
    })),
    { key: 'libre', label: 'Libre', kind: 'libre', entry: { type: 'libre' } },
    { key: 'festivo', label: 'Festivo', kind: 'festivo', entry: { type: 'festivo' } },
    { key: 'vacaciones', label: 'Vacaciones', kind: 'vacaciones', entry: { type: 'vacaciones' } },
    { key: 'baja', label: 'Baja', kind: 'baja', entry: { type: 'baja' } },
    { key: 'borrar', label: 'Borrar', kind: 'borrar', entry: null },
  ]

  const onCell = (date: ISODate, employeeId: string) => {
    if (brush) setEntry(date, employeeId, brush.entry)
    else setEditing({ date, employeeId })
  }

  const onCopy = (weeksBack: number) => {
    const which = weeksBack === 1 ? 'la semana anterior' : `hace ${weeksBack} semanas`
    if (weekHasEntries && !confirm(`Esta semana ya tiene horarios. ¿Sustituirlos por los de ${which}?`)) return
    copyWeek(addDays(monday, -7 * weeksBack), monday)
  }

  const onClear = () => {
    if (confirm('¿Vaciar todos los horarios de esta semana? (Se puede deshacer)')) clearWeek(monday)
  }

  if (data.employees.length === 0) {
    return (
      <section className="empty-state">
        <h1>Empieza añadiendo a las dependientas</h1>
        <p>Después podrás poner el horario de cada una día a día y generar el PDF semanal.</p>
        <button className="btn primary" onClick={goToEmployees}>
          Añadir dependientas
        </button>
      </section>
    )
  }

  return (
    <section className="week">
      <div className="week-nav">
        <div className="week-nav-arrows">
          <button className="btn icon" onClick={() => setMonday(addDays(monday, -7))} aria-label="Semana anterior">
            ‹
          </button>
          <button className="btn icon" onClick={() => setMonday(addDays(monday, 7))} aria-label="Semana siguiente">
            ›
          </button>
        </div>
        <h1 className="week-title">{weekTitle(monday)}</h1>
        <div className="week-nav-tools">
          <button className="btn ghost" onClick={() => setMonday(mondayOf(today))}>
            Hoy
          </button>
          <label className="date-jump">
            <span className="sr-only">Ir a la semana del día</span>
            <input
              type="date"
              value={monday}
              onChange={(e) => e.target.value && setMonday(mondayOf(e.target.value))}
            />
          </label>
        </div>
      </div>

      <div className="week-actions">
        <button className="btn" onClick={() => onCopy(1)}>
          Copiar semana anterior
        </button>
        <button className="btn" onClick={() => onCopy(2)} title="Útil si los turnos rotan cada dos semanas">
          Copiar de hace 2 semanas
        </button>
        <button className="btn ghost danger-text" onClick={onClear} disabled={!weekHasEntries}>
          Vaciar semana
        </button>
      </div>

      <div className={brush ? 'brushbar active' : 'brushbar'}>
        <span className="brushbar-label">
          {brush ? (
            <>
              <strong>Pincel:</strong> toca las casillas para poner «{brush.label}»
            </>
          ) : (
            <>
              <strong>Relleno rápido:</strong> elige un turno y toca casillas
            </>
          )}
        </span>
        <div className="chips">
          {brushes.map((b) => (
            <button
              key={b.key}
              className={`chip k-${b.kind}${brush?.key === b.key ? ' selected' : ''}`}
              onClick={() => setBrush(brush?.key === b.key ? null : b)}
              aria-pressed={brush?.key === b.key}
            >
              {b.label}
            </button>
          ))}
          {brush && (
            <button className="btn small" onClick={() => setBrush(null)}>
              Terminar
            </button>
          )}
        </div>
      </div>

      <div className="grid-scroll">
        <table className="grid">
          <thead>
            <tr>
              <th className="col-name" />
              {days.map((d, i) => {
                const holiday = !!data.holidays[d]
                return (
                  <th key={d} className={d === today ? 'is-today' : undefined}>
                    <button
                      className={holiday ? 'day-head holiday' : 'day-head'}
                      onClick={() => toggleHoliday(d)}
                      title={holiday ? 'Quitar festivo' : 'Marcar como festivo'}
                    >
                      <span className="day-name">{DAY_NAMES[i]}</span>
                      <span className="day-date">
                        {shortDate(d)}
                        {holiday ? ' · festivo' : ''}
                      </span>
                    </button>
                  </th>
                )
              })}
              <th className="col-hours">Horas</th>
            </tr>
          </thead>
          <tbody>
            {data.employees.map((e) => {
              const minutes = weekMinutes(data, monday, e.id)
              const target = e.weeklyHours ? e.weeklyHours * 60 : null
              const diff = target === null ? 0 : minutes - target
              return (
                <tr key={e.id}>
                  <th scope="row" className="col-name">
                    {e.name}
                  </th>
                  {days.map((d) => (
                    <td key={d}>
                      <button
                        className={brush ? 'cell-btn painting' : 'cell-btn'}
                        onClick={() => onCell(d, e.id)}
                        aria-label={`${e.name}, ${DAY_NAMES[days.indexOf(d)]} ${shortDate(d)}`}
                      >
                        <CellTile cell={resolveCell(data, d, e.id)} />
                      </button>
                    </td>
                  ))}
                  <td className="col-hours">
                    <span className={diff > 0 ? 'hours over' : diff < 0 ? 'hours under' : 'hours'}>
                      {formatHours(minutes)}
                    </span>
                    {target !== null && <span className="hours-target">de {e.weeklyHours} h</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <th className="col-name">Trabajando</th>
              {days.map((d) => {
                const n = data.employees.filter((e) => isWorking(resolveCell(data, d, e.id))).length
                return (
                  <td key={d} className="coverage">
                    {n} {n === 1 ? 'persona' : 'personas'}
                  </td>
                )
              })}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <p className="hint">
        Toca una casilla para elegir el horario. Toca el nombre de un día para marcarlo como festivo.
      </p>

      {editing && (
        <CellEditor date={editing.date} employeeId={editing.employeeId} onClose={() => setEditing(null)} />
      )}
    </section>
  )
}
