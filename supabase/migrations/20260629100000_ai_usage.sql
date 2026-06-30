-- ─────────────────────────────────────────────────────────────
-- Tecnifix — Rate limiting de las Edge Functions de IA
--
-- Cada invocación de una función de IA (que cuesta dinero en Anthropic)
-- se registra aquí. El guard compartido (_shared/guard.ts) cuenta las
-- llamadas recientes por usuario/IP y corta con 429 si se excede.
--
-- Solo el service-role escribe/lee esta tabla (desde la Edge Function);
-- por eso RLS queda activado SIN políticas para el rol anónimo/autenticado.
-- ─────────────────────────────────────────────────────────────
create table if not exists public.ai_usage (
  id           bigint generated always as identity primary key,
  caller_id    text        not null,           -- user.id (uuid en texto) o "ip:1.2.3.4"
  caller_kind  text        not null default 'ip' check (caller_kind in ('user', 'ip')),
  function_name text       not null,
  created_at   timestamptz not null default now()
);

-- Índice para la consulta del rate limit: por llamante + función + ventana.
create index if not exists ai_usage_lookup_idx
  on public.ai_usage (caller_id, function_name, created_at desc);

alter table public.ai_usage enable row level security;
-- Sin políticas a propósito: ningún cliente puede leer/escribir; solo el
-- service-role (que salta RLS) lo toca desde las Edge Functions.

-- Limpieza: borra registros de más de 24h. Llama a esta función desde un
-- cron de Supabase (Dashboard → Database → Cron) si quieres mantenerla ligera:
--   select cron.schedule('ai-usage-cleanup', '0 * * * *', $$ select public.cleanup_ai_usage(); $$);
create or replace function public.cleanup_ai_usage()
returns void
language sql
security definer
set search_path = public
as $$
  delete from public.ai_usage where created_at < now() - interval '24 hours';
$$;
