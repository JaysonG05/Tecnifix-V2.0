-- ─────────────────────────────────────────────────────────────
-- Tecnifix — Web Push: suscripciones + envío automático
-- Ejecuta este SQL en el SQL Editor de Supabase.
-- ─────────────────────────────────────────────────────────────

-- 1) Tabla de suscripciones push (una por dispositivo/navegador).
create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_push_subscriptions_user on public.push_subscriptions(user_id);

-- 2) RLS: cada usuario gestiona solo sus propias suscripciones.
--    (La Edge Function send-push usa la service role y omite RLS.)
alter table public.push_subscriptions enable row level security;

drop policy if exists "push own select" on public.push_subscriptions;
drop policy if exists "push own insert" on public.push_subscriptions;
drop policy if exists "push own update" on public.push_subscriptions;
drop policy if exists "push own delete" on public.push_subscriptions;

create policy "push own select" on public.push_subscriptions
  for select using (auth.uid() = user_id);
create policy "push own insert" on public.push_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "push own update" on public.push_subscriptions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push own delete" on public.push_subscriptions
  for delete using (auth.uid() = user_id);

-- 3) Envío automático: cada fila nueva en `notifications` dispara la
--    Edge Function send-push vía pg_net (HTTP). Así el usuario recibe
--    el push aunque tenga la app cerrada.
--
--    ⚠️ Reemplaza:
--       - TU-PROYECTO        → el ref de tu proyecto (xxxx.supabase.co)
--       - TU_PUSH_SECRET     → el mismo valor que pusiste en
--                              `supabase secrets set PUSH_WEBHOOK_SECRET=...`
create extension if not exists pg_net;

create or replace function public.notify_push()
returns trigger
language plpgsql
security definer
as $$
begin
  perform net.http_post(
    url     := 'https://TU-PROYECTO.functions.supabase.co/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', 'TU_PUSH_SECRET'
    ),
    body    := jsonb_build_object(
      'user_id', NEW.user_id,
      'title',   NEW.title,
      'body',    NEW.body,
      'data',    NEW.data
    )
  );
  return NEW;
end;
$$;

drop trigger if exists trg_notify_push on public.notifications;
create trigger trg_notify_push
  after insert on public.notifications
  for each row execute function public.notify_push();
