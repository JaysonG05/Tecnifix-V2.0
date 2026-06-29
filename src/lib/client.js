// ─────────────────────────────────────────────────────────────
// Tecnifix — Cliente Supabase base
//
// Módulo raíz que crea la instancia de Supabase y el modo demo. Se separó de
// supabase.js para que otros módulos de la capa de datos (p.ej. verification.js)
// importen el cliente desde AQUÍ y se evite una dependencia circular con
// supabase.js (que re-exporta todo).
// ─────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js'
import { demoFrom, demoRpc } from './demoData.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

// Advertencia en consola en lugar de romper toda la app
if (!isSupabaseConfigured) {
  console.warn(
    '⚠️  Tecnifix: Faltan variables de entorno de Supabase.\n' +
    '   Copia .env.example como .env y rellena VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.\n' +
    '   Las encuentras en: supabase.com → tu proyecto → Settings → API\n' +
    '   Mientras tanto, la app corre en MODO DEMO con datos de ejemplo.'
  )
}

// Usamos una URL de marcador válida cuando faltan credenciales para que
// createClient NO lance excepción y la app pueda montar (modo demo).
export const supabase = createClient(
  SUPABASE_URL || 'https://demo.supabase.co',
  SUPABASE_ANON_KEY || 'demo-anon-key',
  {
    auth: {
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
  }
)

// En MODO DEMO interceptamos las consultas a tablas/RPC para devolver
// datos de ejemplo, de modo que toda la app sea navegable sin backend real.
if (!isSupabaseConfigured) {
  const realFrom = supabase.from.bind(supabase)
  supabase.from = (table) => {
    try { return demoFrom(table) } catch { return realFrom(table) }
  }
  supabase.rpc = (fn, args) => demoRpc(fn, args)
}
