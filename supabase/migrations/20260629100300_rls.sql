-- ─────────────────────────────────────────────────────────────
-- Tecnifix — Políticas RLS (Row Level Security)
--
-- Toda la confianza del sistema descansa en RLS: el cliente Vite escribe
-- directo a las tablas con la anon key, así que la base de datos es la que
-- DEBE impedir que un usuario lea o modifique datos de otro.
--
-- Este script es IDEMPOTENTE (drop policy if exists → create) y está envuelto
-- por tabla en bloques DO, de modo que una tabla ausente no aborta el resto.
-- Asume los nombres de columna observados en el código (client_id,
-- technician_id, user_id, payer_id, reviewer_id, etc.).
--
-- ⚠️ IMPORTANTE: pruébalo primero en un entorno de staging o en horario de bajo
-- tráfico. Activar RLS sin las políticas correctas bloquea el acceso. Tras
-- correrlo, verifica los flujos clave (crear solicitud, pagar, reseñar).
-- ─────────────────────────────────────────────────────────────

-- ── Helpers ───────────────────────────────────────────────────
-- SECURITY DEFINER: corren saltando RLS, así evitan recursión al consultar
-- profiles dentro de políticas sobre profiles.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ¿El usuario actual tuvo un servicio COMPLETADO con este técnico? Requisito
-- para poder dejarle una reseña (evita reseñas falsas de quien nunca lo contrató).
create or replace function public.has_completed_service_with(p_technician uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.service_requests
    where client_id = auth.uid()
      and technician_id = p_technician
      and status = 'completed'
  );
$$;

-- ── Triggers de integridad ────────────────────────────────────
-- 1) Nadie puede auto-ascenderse a admin ni cambiar su rol salvo un admin.
create or replace function public.tg_prevent_role_escalation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_admin() then
    raise exception 'No autorizado a cambiar el rol.';
  end if;
  return new;
end $$;

-- 2) El cliente NO puede marcar un pago como 'paid'/'escrow': solo el técnico
--    de la solicitud o un admin. El cliente solo puede dejarlo en
--    'pending_confirmation' (reportar el pago).
create or replace function public.tg_protect_payment_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.payment_status is distinct from old.payment_status
     and new.payment_status in ('paid', 'escrow')
     and auth.uid() = old.client_id
     and auth.uid() is distinct from old.technician_id
     and not public.is_admin() then
    raise exception 'El pago debe confirmarlo el técnico.';
  end if;
  return new;
end $$;

do $$ begin
  drop trigger if exists prevent_role_escalation on public.profiles;
  create trigger prevent_role_escalation
    before update on public.profiles
    for each row execute function public.tg_prevent_role_escalation();
exception when undefined_table then null; end $$;

do $$ begin
  drop trigger if exists protect_payment_status on public.service_requests;
  create trigger protect_payment_status
    before update on public.service_requests
    for each row execute function public.tg_protect_payment_status();
exception when undefined_table then null; end $$;

-- ── PROFILES ──────────────────────────────────────────────────
-- Lectura pública (el marketplace muestra nombres/foto de técnicos a cualquiera).
-- Escritura solo de la propia fila (+ trigger anti-escalada de rol).
do $$ begin
  alter table public.profiles enable row level security;
  drop policy if exists tecnifix_profiles_select on public.profiles;
  drop policy if exists tecnifix_profiles_insert on public.profiles;
  drop policy if exists tecnifix_profiles_update on public.profiles;
  create policy tecnifix_profiles_select on public.profiles for select using (true);
  create policy tecnifix_profiles_insert on public.profiles for insert
    with check (id = auth.uid());
  create policy tecnifix_profiles_update on public.profiles for update
    using (id = auth.uid() or public.is_admin())
    with check (id = auth.uid() or public.is_admin());
exception when undefined_table then null; end $$;

-- ── TECHNICIAN_PROFILES y tablas hijas del técnico ────────────
-- Lectura pública (perfil público); escritura solo del propio técnico o admin.
do $$
declare t text;
begin
  foreach t in array array[
    'technician_profiles','technician_gallery','technician_categories',
    'technician_documents','technician_verification_steps',
    'technician_coverage_areas','technician_questionnaire',
    'certificates','service_catalog'
  ] loop
    begin
      -- columna dueña: user_id en technician_profiles, technician_id en el resto.
      execute format('alter table public.%I enable row level security', t);
      execute format('drop policy if exists tecnifix_%1$s_select on public.%1$s', t);
      execute format('drop policy if exists tecnifix_%1$s_write on public.%1$s', t);
      execute format('create policy tecnifix_%1$s_select on public.%1$s for select using (true)', t);
      if t = 'technician_profiles' then
        execute format($p$create policy tecnifix_%1$s_write on public.%1$s for all
          using (user_id = auth.uid() or public.is_admin())
          with check (user_id = auth.uid() or public.is_admin())$p$, t);
      else
        execute format($p$create policy tecnifix_%1$s_write on public.%1$s for all
          using (technician_id = auth.uid() or public.is_admin())
          with check (technician_id = auth.uid() or public.is_admin())$p$, t);
      end if;
    exception when undefined_table then null;
             when undefined_column then raise notice '% : columna esperada ausente, política omitida', t;
    end;
  end loop;
end $$;

-- verification_audit_logs: el técnico ve su historial; admin todo; inserción libre
-- a autenticados (la app registra eventos del propio flujo).
do $$ begin
  alter table public.verification_audit_logs enable row level security;
  drop policy if exists tecnifix_vaudit_select on public.verification_audit_logs;
  drop policy if exists tecnifix_vaudit_insert on public.verification_audit_logs;
  create policy tecnifix_vaudit_select on public.verification_audit_logs for select
    using (technician_id = auth.uid() or admin_id = auth.uid() or public.is_admin());
  create policy tecnifix_vaudit_insert on public.verification_audit_logs for insert
    with check (auth.uid() is not null);
exception when undefined_table then null; end $$;

-- ── SERVICE_REQUESTS ──────────────────────────────────────────
-- Solo las partes (cliente/técnico) o admin. Cliente crea; ambas partes
-- actualizan (el trigger protege payment_status). Cliente o admin borran.
do $$ begin
  alter table public.service_requests enable row level security;
  drop policy if exists tecnifix_sr_select on public.service_requests;
  drop policy if exists tecnifix_sr_insert on public.service_requests;
  drop policy if exists tecnifix_sr_update on public.service_requests;
  drop policy if exists tecnifix_sr_delete on public.service_requests;
  create policy tecnifix_sr_select on public.service_requests for select
    using (client_id = auth.uid() or technician_id = auth.uid() or public.is_admin());
  create policy tecnifix_sr_insert on public.service_requests for insert
    with check (client_id = auth.uid());
  create policy tecnifix_sr_update on public.service_requests for update
    using (client_id = auth.uid() or technician_id = auth.uid() or public.is_admin());
  create policy tecnifix_sr_delete on public.service_requests for delete
    using (client_id = auth.uid() or public.is_admin());
exception when undefined_table then null; end $$;

-- ── PAYMENTS ──────────────────────────────────────────────────
-- El pagador inserta solo estados de "reporte" (no 'completed'); el técnico
-- o admin confirman. Lectura solo de las partes.
do $$ begin
  alter table public.payments enable row level security;
  drop policy if exists tecnifix_pay_select on public.payments;
  drop policy if exists tecnifix_pay_insert on public.payments;
  drop policy if exists tecnifix_pay_update on public.payments;
  create policy tecnifix_pay_select on public.payments for select
    using (payer_id = auth.uid() or technician_id = auth.uid() or public.is_admin());
  create policy tecnifix_pay_insert on public.payments for insert
    with check (payer_id = auth.uid() and status in ('pending', 'pending_confirmation'));
  create policy tecnifix_pay_update on public.payments for update
    using (technician_id = auth.uid() or public.is_admin());
exception when undefined_table then null; end $$;

-- ── PAYMENT_PROOFS ────────────────────────────────────────────
do $$ begin
  alter table public.payment_proofs enable row level security;
  drop policy if exists tecnifix_proof_rw on public.payment_proofs;
  create policy tecnifix_proof_rw on public.payment_proofs for all
    using (
      uploaded_by = auth.uid() or public.is_admin() or exists (
        select 1 from public.service_requests s
        where s.id = payment_proofs.service_request_id
          and (s.client_id = auth.uid() or s.technician_id = auth.uid())
      )
    )
    with check (uploaded_by = auth.uid());
exception when undefined_table then null; end $$;

-- ── JOB_PHOTOS ────────────────────────────────────────────────
do $$ begin
  alter table public.job_photos enable row level security;
  drop policy if exists tecnifix_jobphoto_select on public.job_photos;
  drop policy if exists tecnifix_jobphoto_write on public.job_photos;
  create policy tecnifix_jobphoto_select on public.job_photos for select
    using (
      public.is_admin() or exists (
        select 1 from public.service_requests s
        where s.id = job_photos.service_request_id
          and (s.client_id = auth.uid() or s.technician_id = auth.uid())
      )
    );
  create policy tecnifix_jobphoto_write on public.job_photos for insert
    with check (uploaded_by = auth.uid());
exception when undefined_table then null; end $$;

-- ── REVIEWS ───────────────────────────────────────────────────
-- Se ven solo las aprobadas (o las propias / admin). Insertar exige ser el
-- autor, estado 'pending' y haber tenido un servicio completado con el técnico.
-- Editar el estado de moderación: solo admin.
do $$ begin
  alter table public.reviews enable row level security;
  drop policy if exists tecnifix_reviews_select on public.reviews;
  drop policy if exists tecnifix_reviews_insert on public.reviews;
  drop policy if exists tecnifix_reviews_update on public.reviews;
  drop policy if exists tecnifix_reviews_delete on public.reviews;
  create policy tecnifix_reviews_select on public.reviews for select
    using (moderation_status = 'approved' or reviewer_id = auth.uid() or public.is_admin());
  create policy tecnifix_reviews_insert on public.reviews for insert
    with check (
      reviewer_id = auth.uid()
      and moderation_status = 'pending'
      and public.has_completed_service_with(technician_id)
    );
  create policy tecnifix_reviews_update on public.reviews for update
    using (public.is_admin()) with check (public.is_admin());
  create policy tecnifix_reviews_delete on public.reviews for delete
    using (public.is_admin());
exception when undefined_table then null;
         when undefined_column then raise notice 'reviews: columna esperada ausente'; end $$;

-- ── CONTRACTS ─────────────────────────────────────────────────
do $$ begin
  alter table public.contracts enable row level security;
  drop policy if exists tecnifix_contracts_select on public.contracts;
  drop policy if exists tecnifix_contracts_insert on public.contracts;
  create policy tecnifix_contracts_select on public.contracts for select
    using (client_id = auth.uid() or technician_id = auth.uid() or public.is_admin());
  create policy tecnifix_contracts_insert on public.contracts for insert
    with check (client_id = auth.uid());
exception when undefined_table then null; end $$;

-- ── CONFORMITY_ACTS ───────────────────────────────────────────
do $$ begin
  alter table public.conformity_acts enable row level security;
  drop policy if exists tecnifix_conformity_select on public.conformity_acts;
  drop policy if exists tecnifix_conformity_insert on public.conformity_acts;
  create policy tecnifix_conformity_select on public.conformity_acts for select
    using (client_id = auth.uid() or technician_id = auth.uid() or public.is_admin());
  create policy tecnifix_conformity_insert on public.conformity_acts for insert
    with check (client_id = auth.uid());
exception when undefined_table then null; end $$;

-- ── RECEIPTS ──────────────────────────────────────────────────
do $$ begin
  alter table public.receipts enable row level security;
  drop policy if exists tecnifix_receipts_select on public.receipts;
  drop policy if exists tecnifix_receipts_write on public.receipts;
  create policy tecnifix_receipts_select on public.receipts for select
    using (client_id = auth.uid() or technician_id = auth.uid() or public.is_admin());
  create policy tecnifix_receipts_write on public.receipts for all
    using (client_id = auth.uid() or technician_id = auth.uid() or public.is_admin())
    with check (client_id = auth.uid() or technician_id = auth.uid() or public.is_admin());
exception when undefined_table then null; end $$;

-- ── FAVORITES ─────────────────────────────────────────────────
do $$ begin
  alter table public.favorites enable row level security;
  drop policy if exists tecnifix_favorites_rw on public.favorites;
  create policy tecnifix_favorites_rw on public.favorites for all
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when undefined_table then null; end $$;

-- ── DISPUTES ──────────────────────────────────────────────────
do $$ begin
  alter table public.disputes enable row level security;
  drop policy if exists tecnifix_disputes_select on public.disputes;
  drop policy if exists tecnifix_disputes_insert on public.disputes;
  drop policy if exists tecnifix_disputes_update on public.disputes;
  create policy tecnifix_disputes_select on public.disputes for select
    using (
      opened_by = auth.uid() or public.is_admin() or exists (
        select 1 from public.service_requests s
        where s.id = disputes.service_request_id
          and (s.client_id = auth.uid() or s.technician_id = auth.uid())
      )
    );
  create policy tecnifix_disputes_insert on public.disputes for insert
    with check (opened_by = auth.uid());
  create policy tecnifix_disputes_update on public.disputes for update
    using (public.is_admin()) with check (public.is_admin());
exception when undefined_table then null; end $$;

-- ── NOTIFICATIONS ─────────────────────────────────────────────
-- Cada quien lee/actualiza SOLO sus notificaciones. La inserción se permite a
-- cualquier autenticado porque la app crea notificaciones para la otra parte
-- (p.ej. avisar al técnico de un pago). Recomendación futura: mover esa
-- creación a triggers/Edge Functions con service-role y cerrar este insert.
do $$ begin
  alter table public.notifications enable row level security;
  drop policy if exists tecnifix_notifs_select on public.notifications;
  drop policy if exists tecnifix_notifs_update on public.notifications;
  drop policy if exists tecnifix_notifs_insert on public.notifications;
  drop policy if exists tecnifix_notifs_delete on public.notifications;
  create policy tecnifix_notifs_select on public.notifications for select
    using (user_id = auth.uid() or public.is_admin());
  create policy tecnifix_notifs_update on public.notifications for update
    using (user_id = auth.uid()) with check (user_id = auth.uid());
  create policy tecnifix_notifs_insert on public.notifications for insert
    with check (auth.uid() is not null);
  create policy tecnifix_notifs_delete on public.notifications for delete
    using (user_id = auth.uid() or public.is_admin());
exception when undefined_table then null; end $$;
