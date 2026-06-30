-- ============================================================
--  conformity_acts.sql — Acta de Conformidad verificable
--  "Firma de obra" a prueba de manipulación: cuando el cliente
--  confirma que el trabajo quedó bien, firma un acta que guarda
--  firma manuscrita + geolocalización + timestamp + fotos
--  antes/después + un hash de integridad (SHA-256).
--
--  El hash sella el contenido: si algo cambia después, el hash
--  ya no coincide → prueba de que el acta no fue alterada.
--
--  A PRUEBA DE FALLOS: si NO corres este archivo, la app sigue
--  funcionando — el cliente igual confirma el trabajo, solo que
--  el acta no queda archivada (la app lo avisa, no se rompe).
--
--  Cómo correr: Supabase → SQL Editor → pega todo → Run.
-- ============================================================

create table if not exists public.conformity_acts (
  id                 uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  client_id          uuid not null references auth.users(id),
  technician_id      uuid references auth.users(id),
  amount             numeric,
  signature_data     text,            -- PNG de la firma manuscrita (data URL)
  geo_lat            numeric,
  geo_lng            numeric,
  geo_accuracy       numeric,         -- precisión en metros (si el navegador la da)
  before_photo_url   text,
  after_photo_url    text,
  integrity_hash     text not null,   -- SHA-256 del contenido sellado
  signed_at          timestamptz not null default now(),
  created_at         timestamptz not null default now(),
  unique (service_request_id)         -- un acta por solicitud
);

create index if not exists conformity_acts_request_idx
  on public.conformity_acts (service_request_id);

-- ── RLS ─────────────────────────────────────────────────────
alter table public.conformity_acts enable row level security;

-- El cliente y el técnico de la solicitud pueden VER el acta.
drop policy if exists "Partes ven el acta" on public.conformity_acts;
create policy "Partes ven el acta"
  on public.conformity_acts for select
  using (auth.uid() = client_id or auth.uid() = technician_id);

-- Solo el cliente firma su propia acta (y debe ser el cliente de esa solicitud).
drop policy if exists "Cliente firma su acta" on public.conformity_acts;
create policy "Cliente firma su acta"
  on public.conformity_acts for insert
  with check (
    auth.uid() = client_id
    and exists (
      select 1 from public.service_requests sr
      where sr.id = service_request_id and sr.client_id = auth.uid()
    )
  );

-- Las actas son inmutables: no hay políticas de UPDATE/DELETE (queda sellada).
