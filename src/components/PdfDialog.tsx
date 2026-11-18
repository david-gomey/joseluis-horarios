import { useMemo, useState } from 'react'
import { addDays, fromISO, longDate, mondayOf, monthLabel, pdfFileName, sundayOf, weekMonth, weekTitle, weeksInRange, weeksOfMonth } from '../lib/dates'
import { previousOpenSundays } from '../lib/schedule'
import type { ISODate } from '../lib/types'
import { defaultHeading } from '../pdf/buildPdf'
import { useStore } from '../store'
import { Modal } from './Modal'

export function PdfDialog({ monday, onClose }: { monday: ISODate; onClose(): void }) {
  const data = useStore((s) => s.data)
  const wm = weekMonth(monday)
  const thisMonth = weeksOfMonth(wm.y, wm.m)
  const nextMonth = weeksOfMonth(wm.m === 11 ? wm.y + 1 : wm.y, (wm.m + 1) % 12)

  const [start, setStart] = useState<ISODate>(thisMonth.start)
  const [end, setEnd] = useState<ISODate>(thisMonth.end)
  const [heading, setHeading] = useState('')
  const [sundays, setSundays] = useState(2)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const s = mondayOf(start)
  const e = sundayOf(end < start ? start : end)
  const weeks = weeksInRange(s, e)
  const autoHeading = defaultHeading(data, s, e)
  const prev = useMemo(() => (sundays ? previousOpenSundays(data, s, sundays) : []), [data, s, sundays])

  const preset = (r: { start: ISODate; end: ISODate }) => {
    setStart(r.start)
    setEnd(r.end)
  }

  const generate = async (mode: 'download' | 'open') => {
    setBusy(true)
    setError(null)
    // La ventana se abre ya (si se espera, el navegador la bloquea)
    const win = mode === 'open' ? window.open('', '_blank') : null
    try {
      const { generatePdfBlob } = await import('../pdf/generate')
      const blob = await generatePdfBlob(data, { start: s, end: e, previousSundays: sundays, heading })
      const url = URL.createObjectURL(blob)
      if (win) {
        win.location.href = url
      } else {
        const a = document.createElement('a')
        a.href = url
        a.download = pdfFileName(s, e, data.pdfHeading)
        document.body.appendChild(a)
        a.click()
        a.remove()
      }
      setTimeout(() => URL.revokeObjectURL(url), 60_000)
    } catch (err) {
      win?.close()
      setError(`No se ha podido generar el PDF: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal title="Generar PDF" onClose={onClose} wide>
      <div className="chips">
        <button className="chip" onClick={() => preset(thisMonth)}>
          {monthLabel(wm.y, wm.m)}
        </button>
        <button className="chip" onClick={() => preset({ start: thisMonth.start, end: nextMonth.end })}>
          {monthLabel(wm.y, wm.m)} y {monthLabel(weekMonth(nextMonth.start).y, weekMonth(nextMonth.start).m).toLowerCase()}
        </button>
        <button className="chip" onClick={() => preset({ start: monday, end: addDays(monday, 6) })}>
          Solo la semana que estoy viendo
        </button>
      </div>

      <div className="form-grid">
        <label>
          Desde la semana del
          <input type="date" value={start} onChange={(ev) => ev.target.value && setStart(ev.target.value)} />
        </label>
        <label>
          Hasta la semana del
          <input type="date" value={end} onChange={(ev) => ev.target.value && setEnd(ev.target.value)} />
        </label>
        <label className="span-2">
          Título
          <input value={heading} placeholder={autoHeading} onChange={(ev) => setHeading(ev.target.value)} />
        </label>
        <label className="span-2">
          Domingos de apertura previos (en la primera página)
          <select value={sundays} onChange={(ev) => setSundays(Number(ev.target.value))}>
            <option value={0}>No incluir</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                Los {n === 1 ? 'último' : `${n} últimos`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="pdf-summary">
        <strong>
          {weeks.length} {weeks.length === 1 ? 'página' : 'páginas'}
        </strong>{' '}
        (una por semana): {weekTitle(weeks[0]).replace('Semana del', 'del')}
        {weeks.length > 1 && <> … {weekTitle(weeks[weeks.length - 1]).replace('Semana del', 'del')}</>}
        {sundays > 0 && (
          <div className="muted small">
            {prev.length
              ? `Domingos previos: ${prev.map((g) => longDate(g.date)).join(', ')}`
              : `No hay domingos trabajados antes del ${longDate(s)} en el calendario.`}
          </div>
        )}
        {fromISO(e).getTime() - fromISO(s).getTime() > 1000 * 60 * 60 * 24 * 7 * 26 && (
          <div className="form-error small">Son muchas semanas; ¿seguro que las fechas están bien?</div>
        )}
      </div>

      {error && <p className="form-error">{error}</p>}

      <div className="modal-foot">
        <span className="muted small">{pdfFileName(s, e, data.pdfHeading)}</span>
        <span className="spacer" />
        <button className="btn" disabled={busy} onClick={() => generate('open')}>
          Ver
        </button>
        <button className="btn primary" disabled={busy} onClick={() => generate('download')}>
          {busy ? 'Generando…' : 'Descargar PDF'}
        </button>
      </div>
    </Modal>
  )
}
