# Migraciones de base de datos — Tecnifix

El esquema base (tablas `profiles`, `technician_*`, `service_requests`, etc.) se
construyó manualmente en el SQL Editor de Supabase **antes** de adoptar
migraciones versionadas, por eso no existe una migración inicial aquí. Estas
migraciones cubren los cambios de **endurecimiento** posteriores y son
idempotentes (puedes correrlas más de una vez sin romper nada).

## Cómo aplicarlas

Opción A — Supabase CLI (recomendado):

```bash
supabase link --project-ref TU_PROJECT_REF
supabase db push
```

Opción B — SQL Editor: pega el contenido de cada archivo (en orden) y dale Run.

## Orden y propósito

| Orden | Archivo | Qué hace |
|---|---|---|
| 1 | `20260629100000_ai_usage.sql` | Tabla `ai_usage` que respalda el **rate limit** de las Edge Functions de IA (evita abuso/costos). |
| 2 | `20260629100100_payment_confirmation.sql` | Permite el estado `pending_confirmation` en pagos (confirmación de doble lado). |
| 3 | `20260629100200_reviews_moderation.sql` | Reseñas entran como `pending` (default + índice de la cola de moderación). |
| 4 | `20260629100300_rls.sql` | **Políticas RLS** + triggers de integridad (anti-escalada de rol, protección de `payment_status`). ⚠️ Pruébalo en staging primero y verifica los flujos clave. |
| 5 | `20260629100400_phone_otps.sql` | Tabla `phone_otps` para el **OTP real de teléfono** (códigos hasheados con expiración e intentos). |

## SQL heredado en la raíz del repo

Estos siguen viviendo en la raíz y se corren igual (una vez). No se movieron para
no cambiar su historial:

- `add_profile_visibility.sql`, `add_application_data.sql`
- `push_subscriptions.sql` (reemplaza `TU-PROYECTO`/`TU_PUSH_SECRET` antes)
- `conformity_acts.sql`, `reverse_auctions.sql`, `verification_center.sql`
- `seed_tecnicos_panama.sql` (datos de ejemplo), `supabase_phase1.sql`
- `diagnostico_solicitudes.sql` (solo lectura, diagnóstico)

A futuro, cualquier cambio de esquema nuevo debería entrar como una migración
numerada aquí, no como SQL suelto en la raíz.
