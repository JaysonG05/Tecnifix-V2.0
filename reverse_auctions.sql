-- ─────────────────────────────────────────────────────────────
-- Tecnifix — Subasta inversa (reverse auction)
-- El cliente publica un trabajo y los técnicos pujan a la baja.
-- Ejecutar en Supabase → SQL Editor.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.reverse_auctions (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  description     text,
  category_slug   text,
  province        text,
  budget_max      numeric(10,2),
  status          text not null default 'open'
                    check (status in ('open', 'awarded', 'closed', 'cancelled')),
  awarded_bid_id  uuid,
  created_at      timestamptz not null default now(),
  closes_at       timestamptz
);

create table if not exists public.auction_bids (
  id            uuid primary key default gen_random_uuid(),
  auction_id    uuid not null references public.reverse_auctions(id) on delete cascade,
  bidder_id     uuid not null references auth.users(id) on delete cascade,
  bidder_name   text,
  bidder_avatar text,
  rating        numeric(2,1),
  verified      boolean default false,
  eta_minutes   integer,
  amount        numeric(10,2) not null check (amount > 0),
  message       text,
  created_at    timestamptz not null default now(),
  unique (auction_id, bidder_id)  -- una puja vigente por técnico
);

create index if not exists idx_auctions_status  on public.reverse_auctions(status, created_at desc);
create index if not exists idx_bids_auction      on public.auction_bids(auction_id, amount asc);

-- ───────── RLS ─────────
alter table public.reverse_auctions enable row level security;
alter table public.auction_bids     enable row level security;

-- Subastas abiertas visibles para cualquier usuario autenticado (para que los técnicos pujen).
drop policy if exists "auctions_select_open" on public.reverse_auctions;
create policy "auctions_select_open" on public.reverse_auctions
  for select using (status = 'open' or client_id = auth.uid());

drop policy if exists "auctions_insert_own" on public.reverse_auctions;
create policy "auctions_insert_own" on public.reverse_auctions
  for insert with check (client_id = auth.uid());

drop policy if exists "auctions_update_own" on public.reverse_auctions;
create policy "auctions_update_own" on public.reverse_auctions
  for update using (client_id = auth.uid());

-- Pujas: visibles para el dueño de la subasta y para quien pujó.
drop policy if exists "bids_select" on public.auction_bids;
create policy "bids_select" on public.auction_bids
  for select using (
    bidder_id = auth.uid()
    or exists (select 1 from public.reverse_auctions a where a.id = auction_id and a.client_id = auth.uid())
  );

drop policy if exists "bids_insert_own" on public.auction_bids;
create policy "bids_insert_own" on public.auction_bids
  for insert with check (bidder_id = auth.uid());

-- Realtime: el cliente recibe las pujas en vivo.
alter publication supabase_realtime add table public.auction_bids;
