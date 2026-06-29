-- ─────────────────────────────────────────────────────────────
-- Tecnifix — Postulación del vendedor: guardar los datos del
-- "Formulario para ser aceptado en Tecnifix".
-- Ejecuta este SQL en Supabase → SQL Editor (igual que el seed).
-- Agrega una columna JSONB donde el técnico guarda nombre legal,
-- fecha de nacimiento, horario, herramientas, transporte, referencias,
-- contacto de emergencia y las casillas de consentimiento, para que
-- el admin pueda revisar la postulación.
-- ─────────────────────────────────────────────────────────────

ALTER TABLE technician_profiles
  ADD COLUMN IF NOT EXISTS application_data jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN technician_profiles.application_data IS
  'Datos de la postulación del técnico. Claves: legal_name, birth_date, work_schedule, tools, transport, references, emergency_contact, emergency_phone, accepts_background_check, accepts_data_review, submitted_at.';

-- (Opcional) Exponer la columna en la vista pública technicians_full si existe.
-- Si tu vista technicians_full está definida con SELECT *, ya queda incluida.
-- Si la defines columna por columna, agrega: tp.application_data
