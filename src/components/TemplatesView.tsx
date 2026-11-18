import { useEffect, useState } from 'react'
import { KIND_LABEL } from '../lib/schedule'
import { classify, formatSegments, formatHours, segmentsMinutes, sameSegments, validateSegments } from '../lib/shifts'
import type { Segment, Template } from '../lib/types'
import { useStore } from '../store'

export function TemplatesView() {
  const templates = useStore((s) => s.data.templates)
  const { addTemplate } = useStore.getState()
  const [draft, setDraft] = useState<Segment[]>([{ start: '09:00', end: '17:00' }])
  const [error, setError] = useState<string | null>(null)

  const onAdd = () => {
    const err = validateSegments(draft)
    if (err) return setError(err)
    if (templates.some((t) => sameSegments(t.segments, draft))) return setError('Ese turno ya está en la lista')
    setError(null)
    addTemplate(draft)
  }

  return (
    <section className="panel">
      <h1>Turnos habituales</h1>
      <p className="muted">
        Aparecen como botones al rellenar el calendario. El color sale solo: si empieza antes de las 12:00 es de
        mañana, si empieza más tarde es de tarde y si tiene dos tramos es partido.
      </p>

      <div className="add-template">
        <SegmentsEditor segments={draft} onChange={setDraft} />
        <button className="btn primary" onClick={onAdd}>
          Añadir turno
        </button>
        {error && <p className="form-error">{error}</p>}
      </div>

      <ul className="list">
        {templates.map((t, i) => (
          <TemplateRow key={t.id} template={t} first={i === 0} last={i === templates.length - 1} />
        ))}
      </ul>
    </section>
  )
}

function TemplateRow({ template, first, last }: { template: Template; first: boolean; last: boolean }) {
  const { updateTemplate, removeTemplate, moveTemplate } = useStore.getState()
  const [segs, setSegs] = useState(template.segments)
  // Si cambia desde fuera (deshacer, otro dispositivo) se refleja aquí
  useEffect(() => setSegs(template.segments), [template.segments])
  const kind = classify(template.segments)

  const onChange = (next: Segment[]) => {
    setSegs(next)
    if (!validateSegments(next)) updateTemplate(template.id, next)
  }

  return (
    <li className="list-row">
      <div className="reorder">
        <button className="btn icon ghost" disabled={first} onClick={() => moveTemplate(template.id, -1)} aria-label="Subir">
          ↑
        </button>
        <button className="btn icon ghost" disabled={last} onClick={() => moveTemplate(template.id, 1)} aria-label="Bajar">
          ↓
        </button>
      </div>
      <span className={`chip k-${kind} static`}>{formatSegments(template.segments)}</span>
      <span className="muted small">
        {KIND_LABEL[kind]} · {formatHours(segmentsMinutes(template.segments))}
      </span>
      <SegmentsEditor segments={segs} onChange={onChange} />
      <button
        className="btn ghost danger-text"
        onClick={() => confirm('¿Quitar este turno de la lista? Los horarios ya puestos no cambian.') && removeTemplate(template.id)}
      >
        Quitar
      </button>
    </li>
  )
}

function SegmentsEditor({ segments, onChange }: { segments: Segment[]; onChange(s: Segment[]): void }) {
  const set = (i: number, key: keyof Segment, v: string) =>
    onChange(segments.map((s, j) => (j === i ? { ...s, [key]: v } : s)))
  const error = validateSegments(segments)
  return (
    <div className="segments-editor">
      {segments.map((s, i) => (
        <span key={i} className="seg">
          <input type="time" step={900} value={s.start} onChange={(e) => set(i, 'start', e.target.value)} aria-label="Entrada" />
          –
          <input type="time" step={900} value={s.end} onChange={(e) => set(i, 'end', e.target.value)} aria-label="Salida" />
          {segments.length > 1 && (
            <button className="btn icon ghost" onClick={() => onChange(segments.filter((_, j) => j !== i))} aria-label="Quitar tramo">
              ×
            </button>
          )}
        </span>
      ))}
      {segments.length < 2 && (
        <button className="btn ghost small" onClick={() => onChange([...segments, { start: '18:00', end: '22:00' }])}>
          + tramo
        </button>
      )}
      {error && <span className="form-error small">{error}</span>}
    </div>
  )
}
