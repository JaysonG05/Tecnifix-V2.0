-- ─────────────────────────────────────────────────────────────
-- Tecnifix — Moderación de reseñas
--
-- Las reseñas entran como 'pending' y solo se muestran tras aprobación de un
-- admin. Antes se insertaban 'approved' directamente desde el cliente, lo que
-- permitía reseñas falsas o abusivas. La RLS (ver 20260629100300_rls.sql)
-- impide además que un cliente se ponga 'approved' a sí mismo.
-- ─────────────────────────────────────────────────────────────

-- Default a 'pending' a nivel de base de datos (defensa en profundidad).
do $$
begin
  alter table public.reviews alter column moderation_status set default 'pending';
exception
  when undefined_table then null;
  when undefined_column then
    -- Si la columna no existe, créala.
    begin
      alter table public.reviews add column moderation_status text not null default 'pending';
    exception when others then raise notice 'reviews.moderation_status: %', sqlerrm;
    end;
end $$;

-- Índice para la cola de moderación del admin.
do $$
begin
  create index if not exists reviews_moderation_idx
    on public.reviews (moderation_status, created_at desc);
exception
  when undefined_table then null;
end $$;
