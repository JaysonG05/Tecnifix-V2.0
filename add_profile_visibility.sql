-- ─────────────────────────────────────────────────────────────
-- Tecnifix — Panel del vendedor: control de qué se muestra en el perfil
-- Ejecuta este SQL en Supabase → SQL Editor (igual que el seed).
-- Agrega una columna JSONB donde el técnico guarda qué secciones de su
-- perfil público quiere mostrar/ocultar cuando un cliente lo abre.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE technician_profiles
  ADD COLUMN IF NOT EXISTS profile_visibility jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN technician_profiles.profile_visibility IS
  'Visibilidad de secciones del perfil público. Claves: prices, certificates, social, gallery, reviews, contact. Falta o true = visible; false = oculto.';

-- (Opcional) Exponer la columna en la vista pública technicians_full si existe.
-- Si tu vista technicians_full está definida con SELECT *, ya queda incluida.
-- Si la defines columna por columna, agrega: tp.profile_visibility
