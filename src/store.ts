import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { addDays } from './lib/dates'
import { emptyData, newId } from './lib/defaults'
import type { Data, Employee, Entry, ISODate, Segment } from './lib/types'

export type SyncStatus = 'local' | 'loading' | 'saving' | 'saved' | 'pending' | 'offline' | 'error'

interface State {
  data: Data
  /** Historial para «Deshacer» (no se guarda) */
  past: Data[]

  // --- Sincronización con Supabase ---
  storeId: string | null
  revision: number | null
  /** Hay cambios locales que aún no están en la base de datos */
  dirty: boolean
  sync: SyncStatus
  syncMessage: string | null

  // --- Acciones ---
  undo(): void
  setEntry(date: ISODate, employeeId: string, entry: Entry | null): void
  setEntries(dates: ISODate[], employeeId: string, entry: Entry | null): void
  toggleHoliday(date: ISODate): void
  addEmployee(name: string): void
  updateEmployee(id: string, patch: Partial<Omit<Employee, 'id'>>): void
  removeEmployee(id: string): void
  moveEmployee(id: string, delta: number): void
  addTemplate(segments: Segment[]): void
  updateTemplate(id: string, segments: Segment[]): void
  removeTemplate(id: string): void
  moveTemplate(id: string, delta: number): void
  copyWeek(fromMonday: ISODate, toMonday: ISODate): void
  clearWeek(monday: ISODate): void
  setPdfHeading(text: string): void
  replaceData(data: Data): void
  /** Datos llegados de la base de datos: no generan historial ni se vuelven a guardar */
  applyRemote(data: Data, revision: number, storeId: string): void
  resetLocal(): void
}

const HISTORY = 50

function move<T extends { id: string }>(list: T[], id: string, delta: number) {
  const i = list.findIndex((x) => x.id === id)
  const j = i + delta
  if (i < 0 || j < 0 || j >= list.length) return
  const [item] = list.splice(i, 1)
  list.splice(j, 0, item)
}

export const useStore = create<State>()(
  persist(
    (set, get) => {
      /** Aplica un cambio sobre una copia de los datos y lo apunta en el historial */
      const mutate = (recipe: (draft: Data) => void) => {
        const { data, past } = get()
        const draft = structuredClone(data)
        recipe(draft)
        set({ data: draft, past: [...past.slice(-(HISTORY - 1)), data], dirty: true })
      }

      const writeEntry = (d: Data, date: ISODate, employeeId: string, entry: Entry | null) => {
        if (entry) {
          d.schedule[date] ??= {}
          d.schedule[date][employeeId] = entry
        } else if (d.schedule[date]) {
          delete d.schedule[date][employeeId]
          if (Object.keys(d.schedule[date]).length === 0) delete d.schedule[date]
        }
      }

      return {
        data: emptyData(),
        past: [],
        storeId: null,
        revision: null,
        dirty: false,
        sync: 'local',
        syncMessage: null,

        undo() {
          const { past } = get()
          if (!past.length) return
          set({ data: past[past.length - 1], past: past.slice(0, -1), dirty: true })
        },

        setEntry: (date, employeeId, entry) => mutate((d) => writeEntry(d, date, employeeId, entry)),

        setEntries: (dates, employeeId, entry) =>
          mutate((d) => dates.forEach((date) => writeEntry(d, date, employeeId, entry))),

        toggleHoliday: (date) =>
          mutate((d) => {
            if (d.holidays[date]) delete d.holidays[date]
            else d.holidays[date] = {}
          }),

        addEmployee: (name) => mutate((d) => void d.employees.push({ id: newId(), name: name.trim() })),

        updateEmployee: (id, patch) =>
          mutate((d) => {
            const e = d.employees.find((x) => x.id === id)
            if (e) Object.assign(e, patch)
          }),

        removeEmployee: (id) =>
          mutate((d) => {
            d.employees = d.employees.filter((e) => e.id !== id)
            for (const date of Object.keys(d.schedule)) {
              delete d.schedule[date][id]
              if (Object.keys(d.schedule[date]).length === 0) delete d.schedule[date]
            }
          }),

        moveEmployee: (id, delta) => mutate((d) => move(d.employees, id, delta)),

        addTemplate: (segments) => mutate((d) => void d.templates.push({ id: newId(), segments })),

        updateTemplate: (id, segments) =>
          mutate((d) => {
            const t = d.templates.find((x) => x.id === id)
            if (t) t.segments = segments
          }),

        removeTemplate: (id) => mutate((d) => void (d.templates = d.templates.filter((t) => t.id !== id))),

        moveTemplate: (id, delta) => mutate((d) => move(d.templates, id, delta)),

        copyWeek: (fromMonday, toMonday) =>
          mutate((d) => {
            for (let i = 0; i < 7; i++) {
              const from = addDays(fromMonday, i)
              const to = addDays(toMonday, i)
              const src = d.schedule[from]
              if (src && Object.keys(src).length) d.schedule[to] = structuredClone(src)
              else delete d.schedule[to]
            }
          }),

        clearWeek: (monday) =>
          mutate((d) => {
            for (let i = 0; i < 7; i++) delete d.schedule[addDays(monday, i)]
          }),

        setPdfHeading: (text) => mutate((d) => void (d.pdfHeading = text)),

        replaceData: (data) => mutate((d) => void Object.assign(d, data)),

        applyRemote: (data, revision, storeId) =>
          set({ data, revision, storeId, past: [], dirty: false }),

        resetLocal: () =>
          set({ data: emptyData(), past: [], storeId: null, revision: null, dirty: false, sync: 'local', syncMessage: null }),
      }
    },
    {
      name: 'horarios-tienda',
      version: 1,
      // Se guarda en el navegador como caché (y para poder usarla sin conexión)
      partialize: (s) => ({ data: s.data, storeId: s.storeId, revision: s.revision, dirty: s.dirty }),
    },
  ),
)
