-- ─────────────────────────────────────────────────────────────
-- Tecnifix — OTP real de teléfono (verificación por SMS)
--
-- Reemplaza el placeholder 'internal_otp_ready'. Las Edge Functions send-otp /
-- verify-otp escriben/leen esta tabla con el service-role. El código NUNCA se
-- guarda en claro: se almacena un hash (SHA-256 con sal por fila).
--
-- Failsafe: si no corres este SQL ni despliegas las funciones, el paso de
-- teléfono cae a "revisión manual" (comportamiento anterior), sin romper nada.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.phone_otps (
  id          bigint generated always as identity primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  phone       text        not null,
  code_hash   text        not null,
  salt        text        not null,
  attempts    int         not null default 0,
  max_attempts int        not null default 5,
  verified_at timestamptz,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);

create index if not exists phone_otps_lookup_idx
  on public.phone_otps (user_id, created_at desc);

alter table public.phone_otps enable row level security;
-- Sin políticas: solo el service-role (Edge Functions) toca esta tabla.

-- Columnas en technician_profiles donde verify-otp marca el teléfono confirmado.
do $$ begin
  alter table public.technician_profiles
    add column if not exists phone_verified boolean not null default false;
  alter table public.technician_profiles
    add column if not exists verified_phone text;
exception when undefined_table then null; end $$;

-- Limpieza de OTPs vencidos/usados (>1 día). Opcional vía cron de Supabase.
create or replace function public.cleanup_phone_otps()
returns void language sql security definer set search_path = public as $$
  delete from public.phone_otps
  where created_at < now() - interval '1 day' or verified_at is not null;
$$;
