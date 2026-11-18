import { useState } from 'react'
import { fullDate, mondayOf, weekDays } from '../lib/dates'
import { resolveCell } from '../lib/schedule'
import { classify, formatSegments, sameSegments, validateSegments } from '../lib/shifts'
import type { Entry, ISODate, Segment, StatusKind } from '../lib/types'
import { useStore } from '../store'
import { Modal } from './Modal'

type Scope = 'dia' | 'lv' | 'ls' | 'ld'

const SCOPES: { id: Scope; label: string; days: number }[] = [
  { id: 'dia', label: 'Solo este día', days: 0 },
  { id: 'lv', label: 'Lunes a viernes', days: 5 },
  { id: 'ls', label: 'Lunes a sábado', days: 6 },
  { id: 'ld', label: 'Toda la semana', days: 7 },
]

const STATUSES: { type: StatusKind; label: string }[] = [
  { type: 'libre', label: 'Libre' },
  { type: 'festivo', label: 'Festivo' },
  { type: 'vacaciones', label: 'Vacaciones' },
  { type: 'baja', label: 'Baja' },
]

export function CellEditor(props: { date: ISODate; employeeId: string; onClose(): void }) {
  const { date, employeeId, onClose } = props
  const data = useStore((s) => s.data)
  const { setEntries, addTemplate } = useStore.getState()
  const employee = data.employees.find((e) => e.id === employeeId)!
  const current = resolveCell(data, date, employeeId)

  const [scope, setScope] = useState<Scope>('dia')
  const initial: Segment[] = current.segments.length ? current.segments : [{ start: '09:00', end: '17:00' }]
  const [segs, setSegs] = useState<Segment[]>(initial)
  const [saveTemplate, setSaveTemplate] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const targetDates = () => {
    if (scope === 'dia') return [date]
    const n = SCOPES.find((s) => s.id === scope)!.days
    // En los días festivos no se pisa nada al aplicar a varios días
    return weekDays(mondayOf(date))
      .slice(0, n)
      .filter((d) => d === date || !data.holidays[d])
  }

  const apply = (entry: Entry | null) => {
    setEntries(targetDates(), employeeId, entry)
    onClose()
  }

  const applyCustom = () => {
    const err = validateSegments(segs)
    if (err) return setError(err)
    if (saveTemplate && !data.templates.some((t) => sameSegments(t.segments, segs))) addTemplate(segs)
    apply({ type: 'turno', segments: segs })
  }

  const setSeg = (i: number, key: keyof Segment, value: string) =>
    setSegs(segs.map((s, j) => (j === i ? { ...s, [key]: value } : s)))

  const isCurrent = (segments: Segment[]) => !current.implicit && sameSegments(current.segments, segments)

  return (
    <Modal
      title={
        <>
          {employee.name} <span className="muted">· {fullDate(date)}</span>
        </>
      }
      onClose={onClose}
    >
      <div className="segmented" role="radiogroup" aria-label="Aplicar a">
        {SCOPES.map((s) => (
          <button
            key={s.id}
            role="radio"
            aria-checked={scope === s.id}
            className={scope === s.id ? 'active' : ''}
            onClick={() => setScope(s.id)}
          >
            {s.label}
          </button>
        ))}
      </div>

      <h3 className="modal-section">Turnos habituales</h3>
      <div className="chips">
        {data.templates.map((t) => (
          <button
            key={t.id}
            className={`chip k-${classify(t.segments)}${isCurrent(t.segments) ? ' selected' : ''}`}
            onClick={() => apply({ type: 'turno', segments: t.segments })}
          >
            {formatSegments(t.segments)}
          </button>
        ))}
      </div>

      <h3 className="modal-section">Otros</h3>
      <div className="chips">
        {STATUSES.map((s) => (
          <button
            key={s.type}
            className={`chip k-${s.type}${!current.implicit && current.kind === s.type ? ' selected' : ''}`}
            onClick={() => apply({ type: s.type })}
          >
            {s.label}
          </button>
        ))}
      </div>

      <h3 className="modal-section">Horario a medida</h3>
      <div className="custom-times">
        {segs.map((s, i) => (
          <div className="time-row" key={i}>
            <label>
              Entrada
              <input type="time" step={900} value={s.start} onChange={(e) => setSeg(i, 'start', e.target.value)} />
            </label>
            <label>
              Salida
              <input type="time" step={900} value={s.end} onChange={(e) => setSeg(i, 'end', e.target.value)} />
            </label>
            {segs.length > 1 && (
              <button className="btn ghost small" onClick={() => setSegs(segs.filter((_, j) => j !== i))}>
                Quitar tramo
              </button>
            )}
          </div>
        ))}
        {segs.length < 2 && (
          <button className="btn ghost small" onClick={() => setSegs([...segs, { start: '18:00', end: '22:00' }])}>
            + Añadir segundo tramo (partido)
          </button>
        )}
        <label className="check">
          <input type="checkbox" checked={saveTemplate} onChange={(e) => setSaveTemplate(e.target.checked)} />
          Guardar también como turno habitual
        </label>
        {error && <p className="form-error">{error}</p>}
      </div>

      <div className="modal-foot">
        <button className="btn ghost danger-text" onClick={() => apply(null)}>
          Dejar vacío
        </button>
        <span className="spacer" />
        <button className="btn" onClick={onClose}>
          Cancelar
        </button>
        <button className="btn primary" onClick={applyCustom}>
          Poner {formatSegments(segs)}
        </button>
      </div>
    </Modal>
  )
}
