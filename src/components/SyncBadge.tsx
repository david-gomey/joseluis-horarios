import { createPortal } from 'react-dom'
import { useStore } from '../store'

const LABELS = {
  local: { text: 'Guardado en este navegador', tone: 'muted' },
  loading: { text: 'Cargando…', tone: 'muted' },
  pending: { text: 'Guardando…', tone: 'muted' },
  saving: { text: 'Guardando…', tone: 'muted' },
  saved: { text: 'Guardado', tone: 'ok' },
  offline: { text: 'Sin conexión: se guardará al volver', tone: 'warn' },
  error: { text: 'Error al guardar', tone: 'error' },
} as const

export function SyncBadge() {
  const sync = useStore((s) => s.sync)
  const message = useStore((s) => s.syncMessage)
  const { text, tone } = LABELS[sync]
  return (
    <>
      <span className={`sync sync-${tone}`} title={text} role="status">
        <span className="sync-dot" aria-hidden />
        <span className="hide-sm">{text}</span>
      </span>
      {/* Fuera de la barra superior: su backdrop-filter descuadraría el position: fixed */}
      {message &&
        createPortal(
          <div className="toast" role="alert">
            <span>{message}</span>
            <button className="btn ghost small" onClick={() => useStore.setState({ syncMessage: null })}>
              Entendido
            </button>
          </div>,
          document.body,
        )}
    </>
  )
}
