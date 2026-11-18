import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { DAY_NAMES, addDays, longDate, shortDate, weekTitle } from '../lib/dates'
import { HEADER_BG, HOLIDAY_INK, INK, KIND_COLORS, LINE, MUTED } from '../lib/palette'
import { KIND_LABEL, LEGEND_BASE, resolveCell, type Cell, type SundayGroup } from '../lib/schedule'
import { formatSegment } from '../lib/shifts'
import type { CellKind, Data, ISODate } from '../lib/types'

/*
 * Medidas tomadas del PDF de ejemplo (A4 apaisado, puntos):
 * márgenes de 40, columna de nombres de 104, 7 columnas de ~94 con 3 de separación a cada lado,
 * casillas con esquinas de 5 y líneas de 0,6 en #E3E5E8. Tipografía Fira Sans.
 */
const PAGE_W = 841.89
const PAGE_H = 595.28
const MARGIN = 40
const NAME_COL = 104
const TABLE_TOP = 139 // donde empieza la primera fila (debajo de la cabecera)
const TABLE_BOTTOM_LIMIT = PAGE_H - 60 // deja sitio a la leyenda
const ROW_PAD = 3
const MAX_CELL_H = 46
const SUNDAY_ROW_H = 50
const SUNDAY_SECTION_HEAD = 34
const PAIRS_PER_LINE = 3

const s = StyleSheet.create({
  page: {
    fontFamily: 'Fira Sans',
    paddingTop: 34,
    paddingHorizontal: MARGIN,
    color: INK,
  },
  eyebrow: { fontSize: 10, fontWeight: 500, color: MUTED },
  title: { fontSize: 22, fontWeight: 700, marginTop: 5 },
  header: {
    position: 'absolute',
    top: 96,
    left: MARGIN,
    right: MARGIN,
    height: 40,
    backgroundColor: HEADER_BG,
    borderRadius: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayHead: { flex: 1, alignItems: 'center' },
  dayName: { fontSize: 11, fontWeight: 600 },
  dayDate: { fontSize: 9.5, color: MUTED, marginTop: 1.5 },
  body: { position: 'absolute', top: TABLE_TOP - ROW_PAD, left: MARGIN, right: MARGIN },
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 0.6, borderBottomColor: LINE },
  name: { width: NAME_COL, paddingLeft: 10, fontWeight: 600 },
  cellWrap: { flex: 1, paddingHorizontal: 3, paddingVertical: ROW_PAD },
  cell: { borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  sundayTitle: { fontSize: 13, fontWeight: 700, marginTop: 16, marginBottom: 4 },
  sundayRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.6,
    borderBottomColor: LINE,
    paddingVertical: 5,
    alignItems: 'center',
  },
  sundayLabel: { width: NAME_COL, paddingLeft: 10 },
  pairs: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  pair: { width: 208, flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  pairName: { width: 74, fontSize: 11, fontWeight: 500 },
  footer: {
    position: 'absolute',
    left: MARGIN,
    right: MARGIN,
    bottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', marginRight: 17 },
  swatch: { width: 12, height: 12, borderRadius: 3, borderWidth: 0.6, marginRight: 5 },
  legendText: { fontSize: 9, color: MUTED },
  pageNum: { marginLeft: 'auto', fontSize: 8.5, color: MUTED },
})

function CellBox({ cell, height, fontSize }: { cell: Cell; height: number; fontSize: number }) {
  const c = KIND_COLORS[cell.kind]
  const isShift = cell.segments.length > 0
  return (
    <View style={[s.cell, { height, backgroundColor: c.bg }]}>
      {isShift ? (
        cell.segments.map((seg, i) => (
          <Text key={i} style={{ fontSize, fontWeight: 600, color: c.fg, lineHeight: 1.25 }}>
            {formatSegment(seg)}
          </Text>
        ))
      ) : (
        <Text style={{ fontSize: Math.min(9.5, fontSize), fontWeight: 500, color: c.fg }}>{KIND_LABEL[cell.kind]}</Text>
      )}
    </View>
  )
}

function Legend({ kinds }: { kinds: CellKind[] }) {
  return (
    <>
      {kinds.map((k) => (
        <View key={k} style={s.legendItem}>
          <View
            style={[
              s.swatch,
              { backgroundColor: KIND_COLORS[k].bg, borderColor: k === 'libre' ? LINE : KIND_COLORS[k].bg },
            ]}
          />
          <Text style={s.legendText}>{KIND_LABEL[k]}</Text>
        </View>
      ))}
    </>
  )
}

function sundaySectionHeight(groups: SundayGroup[]) {
  if (!groups.length) return 0
  const lines = groups.reduce((n, g) => n + Math.ceil(g.people.length / PAIRS_PER_LINE), 0)
  return SUNDAY_SECTION_HEAD + groups.length * 10 + lines * (SUNDAY_ROW_H - 10)
}

function WeekPage(props: {
  data: Data
  monday: ISODate
  heading: string
  sundays: SundayGroup[]
  legend: CellKind[]
  page: number
  pages: number
}) {
  const { data, monday, heading, sundays, legend, page, pages } = props
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const n = Math.max(data.employees.length, 1)
  const available = TABLE_BOTTOM_LIMIT - TABLE_TOP - sundaySectionHeight(sundays)
  const rowH = Math.max(18, Math.min(MAX_CELL_H + 2 * ROW_PAD, available / n))
  const cellH = rowH - 2 * ROW_PAD
  const fontSize = cellH >= 44 ? 10.5 : cellH >= 30 ? 10 : cellH >= 24 ? 9 : 8
  const nameSize = cellH >= 30 ? 12 : 10

  return (
    <Page size="A4" orientation="landscape" style={s.page}>
      <Text style={s.eyebrow}>{heading.toUpperCase()}</Text>
      <Text style={s.title}>{weekTitle(monday)}</Text>

      <View style={s.header}>
        <View style={{ width: NAME_COL }} />
        {days.map((d, i) => {
          const holiday = !!data.holidays[d]
          return (
            <View key={d} style={s.dayHead}>
              <Text style={[s.dayName, holiday ? { color: HOLIDAY_INK } : {}]}>{DAY_NAMES[i]}</Text>
              <Text style={[s.dayDate, holiday ? { color: HOLIDAY_INK } : {}]}>
                {shortDate(d)}
                {holiday ? ' · festivo' : ''}
              </Text>
            </View>
          )
        })}
      </View>

      <View style={s.body}>
        {data.employees.map((e) => (
          <View key={e.id} style={s.row} wrap={false}>
            <Text style={[s.name, { fontSize: nameSize }]}>{e.name}</Text>
            {days.map((d) => (
              <View key={d} style={s.cellWrap}>
                <CellBox cell={resolveCell(data, d, e.id)} height={cellH} fontSize={fontSize} />
              </View>
            ))}
          </View>
        ))}

        {sundays.length > 0 && (
          <View wrap={false}>
            <Text style={s.sundayTitle}>Domingos de apertura previos</Text>
            {sundays.map((g) => (
              <View key={g.date} style={s.sundayRow}>
                <View style={s.sundayLabel}>
                  <Text style={{ fontSize: 11, fontWeight: 600 }}>Domingo</Text>
                  <Text style={{ fontSize: 9.5, color: MUTED, marginTop: 1.5 }}>{longDate(g.date)}</Text>
                </View>
                <View style={s.pairs}>
                  {g.people.map((p) => (
                    <View key={p.employee.id} style={s.pair}>
                      <Text style={s.pairName}>{p.employee.name}</Text>
                      <View style={{ width: 102 }}>
                        <CellBox cell={p.cell} height={38} fontSize={10} />
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={s.footer} fixed>
        <Legend kinds={legend} />
        <Text style={s.pageNum}>
          {page} / {pages}
        </Text>
      </View>
    </Page>
  )
}

export interface SchedulePdfProps {
  data: Data
  weeks: ISODate[]
  /** Texto de la cabecera pequeña, p. ej. «Horarios · Diciembre 2026 – Enero 2027» */
  heading: string
  /** Domingos de apertura previos (solo en la primera página) */
  previousSundays: SundayGroup[]
  /** Tipos usados en el periodo (para añadir Vacaciones/Baja a la leyenda si aparecen) */
  usedKinds: Set<CellKind>
}

export function SchedulePdf({ data, weeks, heading, previousSundays, usedKinds }: SchedulePdfProps) {
  const legend: CellKind[] = [
    ...LEGEND_BASE,
    ...(['vacaciones', 'baja'] as CellKind[]).filter((k) => usedKinds.has(k)),
  ]
  return (
    <Document title={`${heading}`} author="Horarios" creator="Horarios" producer="Horarios">
      {weeks.map((monday, i) => (
        <WeekPage
          key={monday}
          data={data}
          monday={monday}
          heading={heading}
          sundays={i === 0 ? previousSundays : []}
          legend={legend}
          page={i + 1}
          pages={weeks.length}
        />
      ))}
    </Document>
  )
}

export const PDF_PAGE_SIZE = { width: PAGE_W, height: PAGE_H }
