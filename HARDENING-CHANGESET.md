# Changeset de endurecimiento (2026-06-29) → cómo llevarlo a tu GitHub

Esta carpeta es la **extracción de un ZIP**, no un clon de git, así que no se
puede hacer `push` directo sin sobrescribir el historial de tu repo. Por eso te
dejo un **paquete con exactamente los 31 archivos que cambié** en esta sesión:

- `tecnifix-hardening-changeset.tar.gz`

> Nota: el `Tecnifix-V2.0-main.zip` que estaba junto a la carpeta es una versión
> vieja del proyecto, por eso no sirvió para sacar un diff línea-a-línea. Estos
> son los archivos que toqué hoy; al copiarlos a tu repo, `git` te mostrará el
> diff limpio allí.

## Pasos (en tu repo ya clonado de GitHub)

```bash
cd /ruta/a/tu/repo-de-github          # tu clon real, el que SÍ tiene .git

# 1) Rama nueva para revisar antes de mezclar
git checkout -b endurecimiento-2026-06

# 2) Copia los archivos del changeset sobre el repo (respeta las rutas)
tar -xzf "/Users/selvajeirem/Documents/Tecnifix-V2.0-main/tecnifix-hardening-changeset.tar.gz" -C .

# 3) Revisa qué cambió (debe coincidir con la lista de abajo)
git status
git diff --stat

# 4) Instala dependencia de tests, valida y compila
npm install
npm test          # 19 tests deben pasar
npm run build     # debe compilar

# 5) Commit y push
git add -A
git commit -m "Endurecimiento: guard IA (rate limit), pago doble confirmación, moderación de reseñas, RLS, OTP teléfono real, tests, observabilidad"
git push -u origin endurecimiento-2026-06
```

Luego abre el Pull Request en GitHub (o haz merge a `main` si trabajas directo).

## Archivos incluidos (35)

**Nuevos (15)**
- `src/lib/client.js` — cliente Supabase base (extraído de supabase.js)
- `src/lib/verification.js` — subsistema KYC (extraído de supabase.js)
- `src/lib/supabaseExports.test.js` — smoke test de la superficie de exports
- `src/screens/requestDetail/modals.jsx` — modales extraídos de RequestDetailScreen
- `supabase/functions/_shared/guard.ts`
- `supabase/functions/send-otp/index.ts`
- `supabase/functions/verify-otp/index.ts`
- `supabase/migrations/20260629100000_ai_usage.sql`
- `supabase/migrations/20260629100100_payment_confirmation.sql`
- `supabase/migrations/20260629100200_reviews_moderation.sql`
- `supabase/migrations/20260629100300_rls.sql`
- `supabase/migrations/20260629100400_phone_otps.sql`
- `supabase/migrations/README.md`
- `src/lib/report.js`
- `src/lib/trust.test.js`

**Modificados (20)**
- `supabase/functions/generate-bio/index.ts`
- `supabase/functions/triage-chat/index.ts`
- `supabase/functions/quote-from-photo/index.ts`
- `supabase/functions/compare-technicians/index.ts`
- `supabase/functions/summarize-reviews/index.ts`
- `supabase/functions/business-pulse/index.ts`
- `supabase/functions/predict-demand/index.ts`
- `supabase/functions/price-intelligence/index.ts`
- `src/lib/supabase.js`
- `src/screens/RequestDetailScreen.jsx`
- `src/screens/TechProfileScreen.jsx`
- `src/screens/secondary/ProfileScreen.jsx`
- `src/screens/secondary/VerificationCenterScreen.jsx`
- `src/App.jsx`
- `src/main.jsx`
- `vite.config.js`
- `package.json`
- `package-lock.json`
- `.env.example`
- `PENDIENTES.md`

## Importante

- **NO** subas tu `.env` (credenciales). El changeset solo trae `.env.example`.
- Tras hacer merge, recuerda los pasos de despliegue del backend (ver
  `PENDIENTES.md`): correr las 5 migraciones y re-desplegar las funciones de IA
  + `send-otp`/`verify-otp`. Esos pasos viven en tu Supabase, no en GitHub.
- Si tu repo de GitHub está **más viejo** que esta carpeta (no solo le faltan mis
  cambios), al copiar verás más diferencias de las esperadas. En ese caso súbelo
  igual: tu carpeta local es la versión más reciente.
