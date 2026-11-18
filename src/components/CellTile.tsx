import { KIND_LABEL, type Cell } from '../lib/schedule'
import { formatSegment } from '../lib/shifts'

/** Casilla de color igual que en el PDF */
export function CellTile({ cell, compact = false }: { cell: Cell; compact?: boolean }) {
  if (cell.implicit && cell.kind === 'libre') {
    return <span className="tile tile-empty" aria-label="Sin asignar (libre)" />
  }
  return (
    <span className={`tile k-${cell.kind}${cell.implicit ? ' tile-implicit' : ''}${compact ? ' tile-compact' : ''}`}>
      {cell.segments.length
        ? cell.segments.map((s, i) => <span key={i}>{formatSegment(s)}</span>)
        : KIND_LABEL[cell.kind]}
    </span>
  )
}
