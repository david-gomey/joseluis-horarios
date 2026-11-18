import type { CellKind } from './types'

/** Colores sacados del PDF de ejemplo; se usan igual en la app y en el PDF generado */
export const KIND_COLORS: Record<CellKind, { bg: string; fg: string }> = {
  manana: { bg: '#FFF4DE', fg: '#7A4E00' },
  tarde: { bg: '#E3EEFB', fg: '#1D4E89' },
  partido: { bg: '#EEE7FA', fg: '#55308F' },
  festivo: { bg: '#FBE4E4', fg: '#9B2C2C' },
  vacaciones: { bg: '#E1F3E7', fg: '#1E6B3F' },
  baja: { bg: '#ECEDEF', fg: '#4B5563' },
  libre: { bg: '#FFFFFF', fg: '#A0A6AE' },
}

export const INK = '#1F2328'
export const MUTED = '#6B7280'
export const LINE = '#E3E5E8'
export const HEADER_BG = '#F4F5F7'
export const HOLIDAY_INK = '#9B2C2C'
