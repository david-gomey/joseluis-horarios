import type { Segment, ShiftKind } from './types'

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + (m || 0)
}

/** «09:00» → «9:00» (como en el PDF) */
export function formatTime(time: string): string {
  const [h, m] = time.split(':')
  return `${Number(h)}:${(m ?? '00').padStart(2, '0')}`
}

/** Normaliza lo que escribe la usuaria: «9» → «09:00», «9:3» → «09:30», «930» → «09:30» */
export function normalizeTime(input: string): string | null {
  const s = input.trim().replace(/[.,h]/g, ':')
  let h: number
  let m: number
  if (/^\d{1,2}$/.test(s)) {
    h = Number(s)
    m = 0
  } else if (/^\d{3,4}$/.test(s)) {
    h = Number(s.slice(0, -2))
    m = Number(s.slice(-2))
  } else if (/^\d{1,2}:\d{1,2}$/.test(s)) {
    const [a, b] = s.split(':')
    h = Number(a)
    m = Number(b.length === 1 ? b + '0' : b)
  } else return null
  if (h > 24 || m > 59 || (h === 24 && m > 0)) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export const EN_DASH = '–'

/** «9:00 – 17:00» */
export function formatSegment(s: Segment): string {
  return `${formatTime(s.start)} ${EN_DASH} ${formatTime(s.end)}`
}

export function formatSegments(segs: Segment[], sep = ' / '): string {
  return segs.map(formatSegment).join(sep)
}

export function segmentMinutes(s: Segment): number {
  let d = toMinutes(s.end) - toMinutes(s.start)
  if (d <= 0) d += 24 * 60
  return d
}

export function segmentsMinutes(segs: Segment[]): number {
  return segs.reduce((acc, s) => acc + segmentMinutes(s), 0)
}

/**
 * Mañana / Tarde / Partido, igual que en el PDF de ejemplo:
 * - dos o más tramos → partido
 * - empieza antes de las 12:00 → mañana (9–17, 10–14…)
 * - empieza a las 12:00 o después → tarde (12–20, 14–22…)
 */
export function classify(segs: Segment[]): ShiftKind {
  if (segs.length >= 2) return 'partido'
  return toMinutes(segs[0]?.start ?? '00:00') < 12 * 60 ? 'manana' : 'tarde'
}

/** Valida los tramos y devuelve un mensaje de error o null si están bien */
export function validateSegments(segs: Segment[]): string | null {
  if (segs.length === 0) return 'Añade al menos un tramo'
  for (const s of segs) {
    if (!s.start || !s.end) return 'Falta alguna hora'
    if (toMinutes(s.end) <= toMinutes(s.start)) return `La salida (${formatTime(s.end)}) debe ser posterior a la entrada (${formatTime(s.start)})`
  }
  for (let i = 1; i < segs.length; i++) {
    if (toMinutes(segs[i].start) < toMinutes(segs[i - 1].end)) return 'Los tramos se solapan'
  }
  return null
}

export function sameSegments(a: Segment[], b: Segment[]): boolean {
  return a.length === b.length && a.every((s, i) => s.start === b[i].start && s.end === b[i].end)
}

export function sortSegments(segs: Segment[]): Segment[] {
  return [...segs].sort((x, y) => toMinutes(x.start) - toMinutes(y.start))
}

/** 2250 → «37,5 h»; 2400 → «40 h»; 2410 → «40 h 10 min» */
export function formatHours(minutes: number): string {
  if (minutes % 30 === 0) {
    const h = minutes / 60
    return `${Number.isInteger(h) ? h : h.toFixed(1).replace('.', ',')} h`
  }
  const h = Math.floor(minutes / 60)
  return `${h} h ${minutes % 60} min`
}
