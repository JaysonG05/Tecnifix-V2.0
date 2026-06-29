// Smoke test: tras dividir supabase.js en client.js + verification.js, verifica
// que TODA la superficie pública sigue exportándose desde './supabase.js'
// (atrapa exports rotos, imports circulares o símbolos perdidos al cargar).
import { describe, it, expect, vi } from 'vitest'

// El cliente real de supabase-js exige WebSocket (realtime), ausente en el
// runner de Node. Lo stubeamos: este test solo comprueba que la SUPERFICIE de
// exports sigue intacta tras dividir el módulo, no que las queries funcionen.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    from: () => ({}), rpc: () => ({}), auth: {}, storage: { from: () => ({}) },
    channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: () => {},
    functions: { invoke: () => ({}) },
  }),
}))

const api = await import('./supabase.js')

const OBJECTS = [
  'auth', 'ai', 'profiles', 'technicians', 'techCategories', 'certificatesApi',
  'favorites', 'reviews', 'serviceRequests', 'serviceCatalog', 'archiveApi',
  'receiptsApi', 'contracts', 'notifications', 'payments', 'admin', 'sosApi',
  'gamificationApi',
  // Re-exportados desde verification.js:
  'verificationApi', 'verificationAdminApi',
]

const CONSTS = [
  'VERIFICATION_GENERAL_STATUS', 'VERIFICATION_STEP_STATUS',
  'VERIFICATION_STEPS', 'PANAMA_PROVINCES',
]

describe('superficie pública de supabase.js', () => {
  it('exporta el cliente y la bandera de configuración', () => {
    expect(api.supabase).toBeTruthy()
    expect(typeof api.isSupabaseConfigured).toBe('boolean')
  })

  it('exporta todos los helpers de dominio como objetos', () => {
    for (const name of OBJECTS) {
      expect(api[name], `falta export: ${name}`).toBeTruthy()
      expect(typeof api[name], `${name} no es objeto`).toBe('object')
    }
  })

  it('re-exporta las constantes de verificación', () => {
    expect(Array.isArray(api.VERIFICATION_STEPS)).toBe(true)
    expect(api.VERIFICATION_STEPS.length).toBeGreaterThan(0)
    expect(Array.isArray(api.PANAMA_PROVINCES)).toBe(true)
    for (const name of CONSTS) expect(api[name], `falta const: ${name}`).toBeTruthy()
  })

  it('verificationApi conserva sus métodos clave', () => {
    for (const m of ['getStatus', 'saveStep', 'submitForReview', 'uploadDocument', 'sendPhoneOtp', 'verifyPhoneOtp']) {
      expect(typeof api.verificationApi[m], `verificationApi.${m}`).toBe('function')
    }
  })
})
