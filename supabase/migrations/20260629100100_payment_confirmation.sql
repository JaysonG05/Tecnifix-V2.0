-- ─────────────────────────────────────────────────────────────
-- Tecnifix — Confirmación de pago de doble lado
--
-- El cliente reporta el pago (Yappy/efectivo) → queda 'pending_confirmation'.
-- El técnico confirma la recepción → pasa a 'paid'/'completed'.
-- Antes el cliente podía marcar 'paid' sin verificación alguna.
--
-- Este script solo asegura que las columnas de estado ACEPTEN el nuevo valor
-- 'pending_confirmation'. Es idempotente y a prueba de fallos: si tus columnas
-- son TEXT sin CHECK (lo habitual aquí), no hay nada que cambiar y el flujo ya
-- funciona; este script ajusta los CHECK solo si existen.
-- ─────────────────────────────────────────────────────────────

-- service_requests.payment_status — añadir 'pending_confirmation' al CHECK si lo hubiera.
do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.service_requests'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%payment_status%'
  loop
    execute format('alter table public.service_requests drop constraint %I', con.conname);
  end loop;

  alter table public.service_requests
    add constraint service_requests_payment_status_check
    check (payment_status in (
      'unpaid', 'pending', 'pending_confirmation', 'escrow', 'paid', 'refunded'
    ));
exception
  when undefined_table then null;  -- tabla no existe en este entorno
  when others then
    raise notice 'service_requests payment_status check omitido: %', sqlerrm;
end $$;

-- payments.status — mismo ajuste.
do $$
declare
  con record;
begin
  for con in
    select conname
    from pg_constraint
    where conrelid = 'public.payments'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.payments drop constraint %I', con.conname);
  end loop;

  alter table public.payments
    add constraint payments_status_check
    check (status in (
      'pending', 'pending_confirmation', 'completed', 'failed', 'refunded'
    ));
exception
  when undefined_table then null;
  when others then
    raise notice 'payments status check omitido: %', sqlerrm;
end $$;
