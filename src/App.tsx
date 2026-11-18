import { useEffect, useState } from 'react'
import { useAuth } from './auth'
import { AuthScreen, NewPasswordScreen } from './components/AuthScreen'
import { EmployeesView } from './components/EmployeesView'
import { PdfDialog } from './components/PdfDialog'
import { SettingsView } from './components/SettingsView'
import { SummaryView } from './components/SummaryView'
import { SyncBadge } from './components/SyncBadge'
import { TemplatesView } from './components/TemplatesView'
import { WeekView } from './components/WeekView'
import { mondayOf, todayISO } from './lib/dates'
import { supabase } from './lib/supabase'
import { useStore } from './store'

type Tab = 'calendario' | 'dependientas' | 'turnos' | 'resumen' | 'ajustes'

const TABS: { id: Tab; label: string }[] = [
  { id: 'calendario', label: 'Calendario' },
  { id: 'dependientas', label: 'Dependientas' },
  { id: 'turnos', label: 'Turnos' },
  { id: 'resumen', label: 'Resumen' },
  { id: 'ajustes', label: 'Ajustes' },
]

export function App() {
  const auth = useAuth()
  if (supabase && auth.loading) return <div className="splash">Cargando…</div>
  if (supabase && auth.recovery) return <NewPasswordScreen onDone={auth.clearRecovery} />
  if (supabase && !auth.session) return <AuthScreen />
  return <Main email={auth.session?.user.email ?? null} userId={auth.session?.user.id ?? null} />
}

function Main({ email, userId }: { email: string | null; userId: string | null }) {
  const [tab, setTab] = useState<Tab>('calendario')
  const [monday, setMonday] = useState(() => mondayOf(todayISO()))
  const [pdfOpen, setPdfOpen] = useState(false)
  const canUndo = useStore((s) => s.past.length > 0)
  const undo = useStore((s) => s.undo)
  const loading = useStore((s) => s.sync === 'loading')

  // Ctrl/Cmd + Z para deshacer (fuera de los campos de texto)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.closest('input, textarea, select')) return
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault()
        undo()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [undo])

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden />
          Horarios
        </div>
        <nav className="tabs" aria-label="Secciones">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'tab active' : 'tab'}
              aria-current={tab === t.id ? 'page' : undefined}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <div className="topbar-actions">
          <SyncBadge />
          <button className="btn ghost" onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl+Z)">
            ↶ <span className="hide-sm">Deshacer</span>
          </button>
          <button className="btn primary" onClick={() => setPdfOpen(true)}>
            Generar PDF
          </button>
        </div>
      </header>

      <main className="content">
        {loading ? (
          <div className="splash">Cargando los horarios…</div>
        ) : (
          <>
            {tab === 'calendario' && (
              <WeekView monday={monday} setMonday={setMonday} goToEmployees={() => setTab('dependientas')} />
            )}
            {tab === 'dependientas' && <EmployeesView />}
            {tab === 'turnos' && <TemplatesView />}
            {tab === 'resumen' && <SummaryView initialDate={monday} />}
            {tab === 'ajustes' && <SettingsView email={email} userId={userId} />}
          </>
        )}
      </main>

      {pdfOpen && <PdfDialog monday={monday} onClose={() => setPdfOpen(false)} />}
    </div>
  )
}
