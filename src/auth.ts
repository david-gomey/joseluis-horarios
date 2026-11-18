import type { Session } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import { useStore } from './store'
import { flushSave, startSync, stopSync } from './sync'

export interface AuthState {
  loading: boolean
  session: Session | null
  /** Ha llegado desde el email de «He olvidado la contraseña» */
  recovery: boolean
}

export function useAuth(): AuthState & { clearRecovery(): void } {
  const [state, setState] = useState<AuthState>({ loading: !!supabase, session: null, recovery: false })

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setState((s) => ({ ...s, loading: false, session: data.session }))
      if (data.session) void startSync(data.session.user.id)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      setState((s) => ({ ...s, loading: false, session, recovery: s.recovery || event === 'PASSWORD_RECOVERY' }))
      if (session) void startSync(session.user.id)
      if (event === 'SIGNED_OUT') {
        stopSync()
        useStore.getState().resetLocal()
      }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  return { ...state, clearRecovery: () => setState((s) => ({ ...s, recovery: false })) }
}

export async function signOut() {
  await flushSave()
  await supabase?.auth.signOut()
}

/** URL a la que vuelven los enlaces de los emails (confirmar cuenta, cambiar contraseña) */
export function appUrl() {
  return window.location.origin + window.location.pathname
}

export function authErrorText(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'Email o contraseña incorrectos.'
  if (m.includes('email not confirmed')) return 'Falta confirmar el email: abre el enlace que te hemos enviado.'
  if (m.includes('already registered')) return 'Ya existe una cuenta con ese email. Prueba a entrar.'
  if (m.includes('password should be at least')) return 'La contraseña debe tener al menos 6 caracteres.'
  if (m.includes('rate limit')) return 'Demasiados intentos seguidos. Espera unos minutos y vuelve a probar.'
  if (m.includes('unable to validate email')) return 'Ese email no parece válido.'
  return message
}
