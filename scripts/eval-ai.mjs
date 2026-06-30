// ─────────────────────────────────────────────────────────────
// Tecnifix — Banco de evaluación de las features de IA
//
// Convierte las conductas esperadas de cada Edge Function en checks
// ejecutables. Úsalo para medir si un cambio de prompt / effort /
// few-shot mejora o empeora la calidad antes de darlo por bueno.
//
// Requisitos: las funciones deben estar DESPLEGADAS y .env debe tener
//   VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY (o pásalas por entorno).
//
// Uso:
//   node scripts/eval-ai.mjs            # corre todos los casos
//   node scripts/eval-ai.mjs bio        # filtra por nombre de función
//
// Nota: la salida de un LLM varía entre corridas; los checks son
// tolerantes (contratos estructurales + heurísticas), no exactos.
// ─────────────────────────────────────────────────────────────
import { readFileSync } from 'node:fs'

// --- Cargar credenciales desde .env (o del entorno) ----------
function loadEnv() {
  const env = { ...process.env }
  try {
    for (const line of readFileSync(new URL('../.env', import.meta.url), 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/)
      if (m && !(m[1] in env)) env[m[1]] = m[2].replace(/^["']|["']$/g, '')
    }
  } catch { /* sin .env: usamos solo el entorno */ }
  return env
}
const ENV = loadEnv()
const URL_BASE = ENV.VITE_SUPABASE_URL
const ANON = ENV.VITE_SUPABASE_ANON_KEY
if (!URL_BASE || !ANON) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (en .env o entorno).')
  process.exit(2)
}

async function invoke(fn, body) {
  const res = await fetch(`${URL_BASE}/functions/v1/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}`, apikey: ANON },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data?.error) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}

// --- Casos de evaluación: { fn, name, body, checks[] } -------
// Cada check: { label, ok: (out) => boolean }
const has = (s) => typeof s === 'string' && s.trim().length > 0
const RATING_RE = /\b\d(?:[.,]\d)?\s*(?:estrellas?|★)|\bcalificaci[oó]n\b/i

const CASES = [
  {
    fn: 'generate-bio', name: 'bio · técnico con buenas stats',
    body: {
      name: 'Carlos Him', trades: ['Electricidad'], years_experience: '8', city: 'David',
      notes: 'instalaciones residenciales y comerciales, atiendo emergencias, doy garantía',
      average_rating: 4.8, total_reviews: 32, total_jobs: 64, response_time_minutes: 45,
    },
    checks: [
      { label: 'todos los campos presentes', ok: (o) => ['professional_title', 'professional_title_en', 'slogan', 'bio', 'bio_en'].every((k) => has(o[k])) },
      { label: 'la bio aprovecha las stats reales', ok: (o) => RATING_RE.test(o.bio) || /trabajos|trayectoria|experiencia/i.test(o.bio) },
      { label: 'sin emojis', ok: (o) => !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(o.bio + o.slogan) },
    ],
  },
  {
    fn: 'generate-bio', name: 'bio · técnico nuevo (sin métricas)',
    body: { name: 'María Pérez', trades: ['Limpieza'], years_experience: '3', city: 'Changuinola', notes: 'limpieza profunda de hogares y oficinas' },
    checks: [
      { label: 'campos presentes', ok: (o) => has(o.bio) && has(o.professional_title) },
      { label: 'NO inventa calificación ni nº de trabajos', ok: (o) => !RATING_RE.test(o.bio) && !/\b\d+\s+trabajos\b/i.test(o.bio) },
    ],
  },
  {
    fn: 'summarize-reviews', name: 'reseñas · mixtas → contras honestas',
    body: {
      technician_name: 'Ejemplo', reviews: [
        { rating: 5, comment: 'Llegó puntual y dejó todo limpio.' },
        { rating: 5, comment: 'Excelente trabajo, precio justo.' },
        { rating: 4, comment: 'Buen trabajo, aunque tardó en llegar.' },
        { rating: 3, comment: 'Resolvió el problema pero el precio fue más alto de lo esperado.' },
      ],
    },
    checks: [
      { label: 'verdict y summary presentes', ok: (o) => has(o.verdict) && has(o.summary) },
      { label: 'refleja contras (cons no vacío)', ok: (o) => Array.isArray(o.cons) && o.cons.length >= 1 },
      { label: 'incluye pros', ok: (o) => Array.isArray(o.pros) && o.pros.length >= 1 },
    ],
  },
  {
    fn: 'compare-technicians', name: 'comparar · recomienda uno de la lista',
    body: {
      problem: 'se daña el aire acondicionado y gotea',
      technicians: [
        { name: 'Ana Solís', title: 'Técnica A/C', rating: 4.9, reviews: 40, jobs: 90, years: 10, price_min: 40, price_max: 200, response_time: 30, verified: true, province: 'Panamá' },
        { name: 'Luis Ortega', title: 'Refrigeración', rating: 4.3, reviews: 8, jobs: 15, years: 4, price_min: 30, price_max: 150, response_time: 90, verified: false, province: 'Panamá' },
      ],
    },
    checks: [
      { label: 'recomienda a un técnico de la lista', ok: (o) => ['Ana Solís', 'Luis Ortega'].includes(o?.recommendation?.name) },
      { label: 'tabla con una fila por técnico', ok: (o) => Array.isArray(o.table) && o.table.length === 2 },
    ],
  },
  {
    fn: 'triage-chat', name: 'triage · emergencia de gas → prioriza seguridad',
    body: { messages: [{ role: 'user', content: 'Huele mucho a gas en la cocina, es urgente. Estoy en Panamá.' }] },
    checks: [
      { label: 'detecta emergencia', ok: (o) => o?.decision?.emergency === true || /emergencia|peligro|gas/i.test(o?.reply || '') },
      { label: 'da consejo de seguridad o cierra el caso', ok: (o) => has(o?.decision?.safetyTip) || o?.done === true || (o?.ask && has(o.ask.field)) },
    ],
  },
]

// --- Runner --------------------------------------------------
const filter = process.argv[2]
const cases = filter ? CASES.filter((c) => c.fn.includes(filter) || c.name.includes(filter)) : CASES

let passed = 0, failed = 0
for (const c of cases) {
  process.stdout.write(`\n▶ ${c.fn} — ${c.name}\n`)
  try {
    const out = await invoke(c.fn, c.body)
    for (const chk of c.checks) {
      let ok = false
      try { ok = chk.ok(out) } catch { ok = false }
      ok ? passed++ : failed++
      console.log(`   ${ok ? '✅' : '❌'} ${chk.label}`)
    }
  } catch (err) {
    failed += c.checks.length
    console.log(`   ⚠️  no se pudo invocar: ${err.message}`)
  }
}

console.log(`\n── Resultado: ${passed} ✅ / ${failed} ❌ ──`)
process.exit(failed ? 1 : 0)
