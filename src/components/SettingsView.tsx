import { useEffect, useRef, useState, type FormEvent } from 'react'
import { signOut } from '../auth'
import { todayISO } from '../lib/dates'
import { parseBackup } from '../lib/defaults'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'

export function SettingsView({ email, userId }: { email: string | null; userId: string | null }) {
  const data = useStore((s) => s.data)
  const { setPdfHeading, replaceData } = useStore.getState()
  const [heading, setHeading] = useState(data.pdfHeading)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMsg, setImportMsg] = useState<string | null>(null)

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `horarios-copia-${todayISO()}.json`
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
  }

  const importBackup = async (file: File) => {
    try {
      const parsed = parseBackup(JSON.parse(await file.text()))
      const msg = `Se sustituirán los datos actuales por los de «${file.name}» (${parsed.employees.length} dependientas). ¿Seguir?`
      if (!confirm(msg)) return
      replaceData(parsed)
      setHeading(parsed.pdfHeading)
      setImportMsg('Copia cargada. Si te has equivocado, pulsa «Deshacer».')
    } catch (e) {
      setImportMsg(e instanceof Error ? e.message : 'No se ha podido leer el archivo')
    }
  }

  return (
    <section className="panel settings">
      <h1>Ajustes</h1>

      {supabase && (
        <div className="card">
          <h2>Cuenta</h2>
          <p>
            Has entrado como <strong>{email}</strong>. Los horarios se guardan en la nube y se ven igual en cualquier
            dispositivo en el que entres.
          </p>
          <button className="btn" onClick={() => void signOut()}>
            Cerrar sesión
          </button>
        </div>
      )}

      {supabase && <ShareCard userId={userId} />}

      <div className="card">
        <h2>PDF</h2>
        <label className="field">
          Texto de la cabecera
          <input
            value={heading}
            onChange={(e) => setHeading(e.target.value)}
            onBlur={() => heading.trim() !== data.pdfHeading && setPdfHeading(heading.trim() || 'Horarios')}
            placeholder="Horarios"
          />
        </label>
        <p className="muted small">
          Sale arriba en cada página, seguido de los meses: «{(heading.trim() || 'Horarios').toUpperCase()} · DICIEMBRE
          2026 – ENERO 2027». También da nombre al archivo.
        </p>
      </div>

      <div className="card">
        <h2>Copia de seguridad</h2>
        <p className="muted">
          {supabase
            ? 'Los datos ya están en la nube, pero puedes descargar una copia en un archivo cuando quieras.'
            : 'Los datos solo están guardados en este navegador. Descarga una copia de vez en cuando para no perderlos.'}
        </p>
        <div className="row-gap">
          <button className="btn" onClick={exportBackup}>
            Descargar copia
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            Cargar copia…
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void importBackup(f)
              e.target.value = ''
            }}
          />
        </div>
        {importMsg && <p className="small">{importMsg}</p>}
      </div>
    </section>
  )
}

interface Member {
  user_id: string
  email: string
  role: 'owner' | 'editor'
}

function ShareCard({ userId }: { userId: string | null }) {
  const storeId = useStore((s) => s.storeId)
  const [members, setMembers] = useState<Member[]>([])
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    if (!supabase || !storeId) return
    const { data, error } = await supabase.rpc('list_store_members', { p_store: storeId })
    if (!error) setMembers(data as Member[])
  }

  useEffect(() => {
    void load()
  }, [storeId]) // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase || !storeId || !email.trim()) return
    setBusy(true)
    const { error } = await supabase.rpc('add_store_member', { p_store: storeId, p_email: email.trim() })
    setBusy(false)
    if (error) return setMsg(error.message)
    setMsg(`Listo: ${email.trim()} ya puede ver y editar los horarios.`)
    setEmail('')
    void load()
  }

  const remove = async (m: Member) => {
    if (!supabase || !storeId || !confirm(`¿Quitar el acceso a ${m.email}?`)) return
    const { error } = await supabase.rpc('remove_store_member', { p_store: storeId, p_user: m.user_id })
    if (error) setMsg(error.message)
    void load()
  }

  const iAmOwner = members.some((m) => m.role === 'owner' && m.user_id === userId)

  return (
    <div className="card">
      <h2>Compartir</h2>
      <p className="muted">
        Para que otra persona pueda ver y editar los horarios: primero tiene que crear su cuenta en esta app; después
        escribe aquí su email.
      </p>
      <ul className="members">
        {members.map((m) => (
          <li key={m.user_id}>
            <span>{m.email}</span>
            <span className="muted small">{m.role === 'owner' ? 'Dueña' : 'Puede editar'}</span>
            {iAmOwner && m.role !== 'owner' && (
              <button className="btn ghost small danger-text" onClick={() => void remove(m)}>
                Quitar
              </button>
            )}
          </li>
        ))}
      </ul>
      <form className="add-row" onSubmit={add}>
        <input type="email" placeholder="email@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} aria-label="Email" />
        <button className="btn" type="submit" disabled={busy || !email.trim()}>
          Dar acceso
        </button>
      </form>
      {msg && <p className="small">{msg}</p>}
    </div>
  )
}
