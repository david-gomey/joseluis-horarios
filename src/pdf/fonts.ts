import { Font } from '@react-pdf/renderer'

export type FontSources = Record<400 | 500 | 600 | 700, string>

let registered = false

/** Registra Fira Sans (la misma tipografía del PDF de ejemplo) */
export function registerPdfFonts(src: FontSources) {
  if (registered) return
  registered = true
  Font.register({
    family: 'Fira Sans',
    fonts: ([400, 500, 600, 700] as const).map((w) => ({ src: src[w], fontWeight: w })),
  })
  // Sin guiones de partición de palabras
  Font.registerHyphenationCallback((word) => [word])
}
