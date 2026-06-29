# ✅ Pendientes de configuración (acciones del dueño)

Todo lo de abajo es **a prueba de fallos**: si no lo corres, la app no se rompe
— solo esa función específica avisa que falta. Hazlos cuando puedas.

---

## 1. SQL en Supabase → SQL Editor (pega, Run)

Corre cada archivo una vez (igual que el seed):

| Archivo | Para qué |
|---|---|
| `add_profile_visibility.sql` | Toggles de "qué se muestra en mi perfil" (panel del vendedor) |
| `add_application_data.sql` | Guardar el formulario de postulación del técnico |
| `push_subscriptions.sql` | Notificaciones push reales (tabla + RLS + trigger). **Antes de correrlo** reemplaza `TU-PROYECTO` y `TU_PUSH_SECRET` dentro del archivo |
| `conformity_acts.sql` | ✍️ Acta de conformidad verificable (firma + geo + fotos + hash). Sin correrlo, el cliente igual completa el servicio pero el acta no se archiva |
| `diagnostico_solicitudes.sql` | **Solo lee.** Diagnostica por qué falla "Nueva solicitud" — mándame el resultado |

### 1b. 🔒 Endurecimiento (carpeta `supabase/migrations/`, correr en orden)

Ver `supabase/migrations/README.md`. Son **idempotentes** (puedes correrlas más de una vez).

| Orden | Archivo | Para qué |
|---|---|---|
| 1 | `20260629100000_ai_usage.sql` | Rate limit de las funciones de IA (frena abuso/costos de Anthropic) |
| 2 | `20260629100100_payment_confirmation.sql` | Habilita el pago de **doble confirmación** (`pending_confirmation`) |
| 3 | `20260629100200_reviews_moderation.sql` | Las reseñas entran a moderación (`pending`) |
| 4 | `20260629100300_rls.sql` | **Políticas RLS** + triggers. ⚠️ Pruébalo en staging y verifica: crear solicitud, pagar, reseñar |
| 5 | `20260629100400_phone_otps.sql` | Tabla para el **OTP real de teléfono** (verificación por SMS) |

---

## 2. Edge Functions (necesitan el Supabase CLI)

> ⚠️ **Vuelve a desplegar TODAS las funciones de IA**: ahora comparten el guard
> `_shared/guard.ts` (autenticación + rate limit). El rate limit usa la tabla
> `ai_usage` (migración 1b); sin ella las funciones igual corren (failsafe) pero
> no limitan.

```bash
# Una vez: instalar y enlazar
supabase login
supabase link --project-ref TU_PROJECT_REF

# La key de Anthropic la comparten TODAS las funciones de IA (vive solo en el server)
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...   # tu key de console.anthropic.com

# Funciones de IA (cada una avisa sola si no está desplegada; la app no se rompe)
supabase functions deploy generate-bio          # ✨ Bio del vendedor (usa stats/reseñas reales + few-shot)
supabase functions deploy summarize-reviews     # Resumen de reseñas (few-shot)
supabase functions deploy compare-technicians   # Comparador de técnicos
supabase functions deploy quote-from-photo      # Cotización desde foto (visión)
supabase functions deploy triage-chat           # Asistente de triage conversacional
supabase functions deploy predict-demand        # 🔮 Predicción de demanda por zona (Insights del técnico)
supabase functions deploy price-intelligence    # 💰 Gemelo de precios justos (Asistente IA → pestaña 💰 Precio)
supabase functions deploy business-pulse        # 📊 Pulso semanal del negocio (Insights del técnico)

# El dueño crea cuentas de vendedor (➕ Crear cuenta de vendedor)
supabase functions deploy admin-create-vendor   # no necesita secrets

# 📱 OTP real de teléfono (verificación por SMS) — ver sección 2d
supabase functions deploy send-otp
supabase functions deploy verify-otp
```

> Cualquier función de IA que cambies (prompts, `effort`, few-shot) hay que volver a desplegarla para que el cambio surta efecto.

---

## 2b. Notificaciones push reales (app cerrada)

```bash
# 1) Generar el par de claves VAPID
npx web-push generate-vapid-keys     # te da una PÚBLICA y una PRIVADA

# 2) Secrets del servidor (la PRIVADA nunca va al cliente)
supabase secrets set VAPID_PUBLIC_KEY=...  VAPID_PRIVATE_KEY=...
supabase secrets set VAPID_SUBJECT=mailto:soporte@tecnifix.com
supabase secrets set PUSH_WEBHOOK_SECRET=una-cadena-larga-secreta   # el MISMO valor que pones en push_subscriptions.sql

# 3) Desplegar el emisor de push
supabase functions deploy send-push
```

Además: pon la clave **pública** en `.env` como `VITE_VAPID_PUBLIC_KEY=...` y vuelve a compilar (`npm run build`). Luego corre `push_subscriptions.sql` (sección 1). El usuario activa las push desde **⚙️ Ajustes → Notificaciones push**.

---

## 2c. Medir la calidad de la IA (opcional)

Con las funciones desplegadas y el `.env` con `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`:

```bash
npm run eval:ai            # corre los checks de calidad sobre las funciones
npm run eval:ai bio        # filtra por función
```

Úsalo para comprobar que un cambio de prompt/effort/few-shot no empeora la calidad.

---

## 2d. OTP real de teléfono (SMS)

Corre la migración `20260629100400_phone_otps.sql` (sección 1b) y despliega las
funciones `send-otp` / `verify-otp` (sección 2). Luego configura el proveedor SMS
(ahora mismo soporta **Twilio**):

```bash
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxx TWILIO_AUTH_TOKEN=xxxx
supabase secrets set TWILIO_FROM=+1XXXXXXXXXX        # o TWILIO_MESSAGING_SERVICE_SID=MGxxxx

# Para probar SIN proveedor: el código se devuelve en la respuesta y se
# autocompleta en pantalla (NO usar en producción).
supabase secrets set OTP_DEV_MODE=true
```

**Failsafe:** sin migración/funciones/proveedor, el paso de teléfono cae a
**revisión manual** (el usuario deja el código vacío y se envía igual). El
técnico verifica desde **Centro de verificación → 📱 Verificación de teléfono →
Enviar código por SMS**.

---

## 3. Hacerte administrador (una vez)

Supabase → **Table Editor** → tabla `profiles` → tu fila → cambia `role` a
**`admin`**. Luego en la app aparece **👤 Perfil → Panel de administrador**.

---

## Mapa rápido de "dónde está cada cosa"

- **Registrarse como vendedor:** Login → *Regístrate* → 🛠️ Soy técnico.
- **Aprobar postulaciones:** Panel admin → 🛠️ Técnicos → 📄 Ver documentos y postulación → ✓ Aprobar.
- **Crear cuenta de vendedor tú mismo:** Panel admin → 🛠️ Técnicos → ➕ Crear cuenta de vendedor.
- **Que el vendedor mejore su perfil con IA:** Editar perfil de técnico → ✨ Escribir por mí.
