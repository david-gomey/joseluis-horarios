import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined

/** null si no hay Supabase configurado: entonces la app guarda solo en este navegador */
export const supabase = url && key ? createClient(url, key) : null
