import { useState, type FormEvent } from 'react'
import { appUrl, authErrorText } from '../auth'
import { supabase } from '../lib/supabase'

type Mode = 'entrar' | 'registro' | 'olvido'

export function AuthScreen() {
  const [mode, setMode] = useState<Mode>('entrar')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    setError(null)
    setInfo(null)
    try {
      if (mode === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      } else if (mode === 'registro') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: appUrl() },
        })
        if (error) throw error
        if (!data.session) {
          setInfo('Te hemos enviado un email para confirmar la cuenta. Ábrelo, pulsa el enlace y vuelve aquí para entrar.')
          setMode('entrar')
        }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: appUrl() })
        if (error) throw error
        setInfo('Si hay una cuenta con ese email, te llegará un enlace para poner una contraseña nueva.')
      }
    } catch (err) {
      setError(authErrorText(err instanceof Error ? err.message : String(err)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <div className="brand big">
          <span className="brand-mark" aria-hidden />
          Horarios
        </div>
        <h1>{mode === 'entrar' ? 'Entrar' : mode === 'registro' ? 'Crear cuenta' : 'Recuperar contraseña'}</h1>
        <label className="field">
          Email
          <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        {mode !== 'olvido' && (
          <label className="field">
            Contraseña
            <input
              type="password"
              autoComplete={mode === 'registro' ? 'new-password' : 'current-password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
        )}
        {error && <p className="form-error">{error}</p>}
        {info && <p className="form-info">{info}</p>}
        <button className="btn primary block" type="submit" disabled={busy}>
          {busy ? 'Un momento…' : mode === 'entrar' ? 'Entrar' : mode === 'registro' ? 'Crear cuenta' : 'Enviar enlace'}
        </button>
        <div className="auth-links">
          {mode !== 'entrar' && (
            <button type="button" className="link" onClick={() => setMode('entrar')}>
              Ya tengo cuenta
            </button>
          )}
          {mode !== 'registro' && (
            <button type="button" className="link" onClick={() => setMode('registro')}>
              Crear una cuenta
            </button>
          )}
          {mode === 'entrar' && (
            <button type="button" className="link" onClick={() => setMode('olvido')}>
              He olvidado la contraseña
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export function NewPasswordScreen({ onDone }: { onDone(): void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!supabase) return
    setBusy(true)
    const { error } = await supabase.auth.updateUser({ password })
    setBusy(false)
    if (error) return setError(authErrorText(error.message))
    onDone()
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit}>
        <h1>Nueva contraseña</h1>
        <label className="field">
          Contraseña nueva
          <input type="password" autoComplete="new-password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button className="btn primary block" type="submit" disabled={busy}>
          Guardar contraseña
        </button>
      </form>
    </div>
  )
}
