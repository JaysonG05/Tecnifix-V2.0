-- Tecnifix — Centro de Verificación de Técnicos
-- Ejecutar en Supabase SQL Editor.
-- Crea el flujo profesional de verificación, storage privado y políticas RLS.

-- 1) Estados y columnas generales en technician_profiles
ALTER TABLE technician_profiles
  ADD COLUMN IF NOT EXISTS verification_progress integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS verification_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rejected_reason text,
  ADD COLUMN IF NOT EXISTS suspended_reason text,
  ADD COLUMN IF NOT EXISTS last_sensitive_change_at timestamptz,
  ADD COLUMN IF NOT EXISTS application_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS profile_visibility jsonb NOT NULL DEFAULT '{}'::jsonb;

UPDATE technician_profiles
SET verification_status = 'pending_review'
WHERE verification_status = 'pending';

-- 2) Helpers de rol
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'super_admin'
  );
$$;

-- 3) Pasos de verificación
CREATE TABLE IF NOT EXISTS technician_verification_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technician_profiles(user_id) ON DELETE CASCADE,
  step_key text NOT NULL,
  step_name text NOT NULL,
  status text NOT NULL DEFAULT 'not_started',
  required boolean NOT NULL DEFAULT true,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason text,
  correction_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (technician_id, step_key)
);

-- 4) Documentos privados
CREATE TABLE IF NOT EXISTS technician_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technician_profiles(user_id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_path text NOT NULL,
  file_name text,
  file_mime_type text,
  file_size bigint,
  status text NOT NULL DEFAULT 'submitted',
  expiration_date date,
  submitted_at timestamptz,
  approved_at timestamptz,
  rejected_at timestamptz,
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_technician_documents_owner ON technician_documents(technician_id);
CREATE INDEX IF NOT EXISTS idx_technician_documents_status ON technician_documents(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_verified_document_number
  ON technician_profiles ((application_data->>'document_number'))
  WHERE verification_status = 'verified'
    AND COALESCE(application_data->>'document_number', '') <> '';

-- 5) Cobertura
CREATE TABLE IF NOT EXISTS technician_coverage_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technician_profiles(user_id) ON DELETE CASCADE,
  province text,
  district text,
  corregimiento text,
  covers_all_country boolean NOT NULL DEFAULT false,
  coverage_radius_km numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6) Certificaciones verificables
CREATE TABLE IF NOT EXISTS technician_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technician_profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL,
  institution text,
  issue_date date,
  expiration_date date,
  file_path text,
  category text,
  status text NOT NULL DEFAULT 'submitted',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 7) Portafolio
CREATE TABLE IF NOT EXISTS technician_portfolio (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technician_profiles(user_id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text,
  location_general text,
  work_date date,
  status text NOT NULL DEFAULT 'submitted',
  reviewed_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS technician_portfolio_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES technician_portfolio(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  image_type text NOT NULL DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8) Cuestionario
CREATE TABLE IF NOT EXISTS technician_questionnaire (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL UNIQUE REFERENCES technician_profiles(user_id) ON DELETE CASCADE,
  main_services text,
  years_experience integer,
  works_alone_or_team text,
  has_own_tools boolean,
  handles_emergencies boolean,
  monthly_clients_estimate text,
  works_with_companies boolean,
  social_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  accepts_quality_rules boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 9) Logs de auditoría
CREATE TABLE IF NOT EXISTS verification_audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  technician_id uuid NOT NULL REFERENCES technician_profiles(user_id) ON DELETE CASCADE,
  admin_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  previous_status text,
  new_status text,
  document_id uuid REFERENCES technician_documents(id) ON DELETE SET NULL,
  step_key text,
  reason text,
  comment text,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10) Configuración administrativa
CREATE TABLE IF NOT EXISTS verification_settings (
  id integer PRIMARY KEY DEFAULT 1,
  identity_document_required boolean NOT NULL DEFAULT true,
  selfie_required boolean NOT NULL DEFAULT true,
  proof_of_address_required boolean NOT NULL DEFAULT true,
  certifications_required boolean NOT NULL DEFAULT false,
  portfolio_required boolean NOT NULL DEFAULT false,
  manual_review_required boolean NOT NULL DEFAULT true,
  allow_unverified_in_search boolean NOT NULL DEFAULT false,
  prioritize_verified_in_search boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT verification_settings_singleton CHECK (id = 1)
);

INSERT INTO verification_settings (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 11) Storage privado. El bucket NO es público.
INSERT INTO storage.buckets (id, name, public)
VALUES ('technician-verification-documents', 'technician-verification-documents', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 12) Updated_at simple
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_verification_steps_touch ON technician_verification_steps;
CREATE TRIGGER trg_verification_steps_touch
BEFORE UPDATE ON technician_verification_steps
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_documents_touch ON technician_documents;
CREATE TRIGGER trg_documents_touch
BEFORE UPDATE ON technician_documents
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_questionnaire_touch ON technician_questionnaire;
CREATE TRIGGER trg_questionnaire_touch
BEFORE UPDATE ON technician_questionnaire
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 13) RLS
ALTER TABLE technician_verification_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_coverage_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_portfolio_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE technician_questionnaire ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "verification steps owner read" ON technician_verification_steps;
CREATE POLICY "verification steps owner read" ON technician_verification_steps
  FOR SELECT USING (technician_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "verification steps owner write" ON technician_verification_steps;
CREATE POLICY "verification steps owner write" ON technician_verification_steps
  FOR INSERT WITH CHECK (technician_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "verification steps owner update" ON technician_verification_steps;
CREATE POLICY "verification steps owner update" ON technician_verification_steps
  FOR UPDATE USING (technician_id = auth.uid() OR public.is_admin())
  WITH CHECK (technician_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "documents owner admin read" ON technician_documents;
CREATE POLICY "documents owner admin read" ON technician_documents
  FOR SELECT USING (technician_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "documents owner insert" ON technician_documents;
CREATE POLICY "documents owner insert" ON technician_documents
  FOR INSERT WITH CHECK (technician_id = auth.uid());

DROP POLICY IF EXISTS "documents owner limited update" ON technician_documents;
CREATE POLICY "documents owner limited update" ON technician_documents
  FOR UPDATE USING (technician_id = auth.uid() OR public.is_admin())
  WITH CHECK (technician_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "coverage owner admin" ON technician_coverage_areas;
CREATE POLICY "coverage owner admin" ON technician_coverage_areas
  FOR ALL USING (technician_id = auth.uid() OR public.is_admin())
  WITH CHECK (technician_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "questionnaire owner admin" ON technician_questionnaire;
CREATE POLICY "questionnaire owner admin" ON technician_questionnaire
  FOR ALL USING (technician_id = auth.uid() OR public.is_admin())
  WITH CHECK (technician_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "portfolio owner admin" ON technician_portfolio;
CREATE POLICY "portfolio owner admin" ON technician_portfolio
  FOR ALL USING (technician_id = auth.uid() OR public.is_admin())
  WITH CHECK (technician_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "portfolio images owner admin" ON technician_portfolio_images;
CREATE POLICY "portfolio images owner admin" ON technician_portfolio_images
  FOR ALL USING (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM technician_portfolio p
      WHERE p.id = portfolio_id
        AND p.technician_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_admin()
    OR EXISTS (
      SELECT 1 FROM technician_portfolio p
      WHERE p.id = portfolio_id
        AND p.technician_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "certifications owner admin" ON technician_certifications;
CREATE POLICY "certifications owner admin" ON technician_certifications
  FOR ALL USING (technician_id = auth.uid() OR public.is_admin())
  WITH CHECK (technician_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "audit owner admin read" ON verification_audit_logs;
CREATE POLICY "audit owner admin read" ON verification_audit_logs
  FOR SELECT USING (technician_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "audit insert authenticated" ON verification_audit_logs;
CREATE POLICY "audit insert authenticated" ON verification_audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "settings read all" ON verification_settings;
CREATE POLICY "settings read all" ON verification_settings
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "settings super admin write" ON verification_settings;
CREATE POLICY "settings super admin write" ON verification_settings
  FOR ALL USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- 14) Storage policies: técnico dueño y admin pueden ver. Cliente nunca.
DROP POLICY IF EXISTS "verification docs owner upload" ON storage.objects;
CREATE POLICY "verification docs owner upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'technician-verification-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "verification docs owner admin read" ON storage.objects;
CREATE POLICY "verification docs owner admin read" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'technician-verification-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );

DROP POLICY IF EXISTS "verification docs owner admin update" ON storage.objects;
CREATE POLICY "verification docs owner admin update" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'technician-verification-documents'
    AND (
      auth.uid()::text = (storage.foldername(name))[1]
      OR public.is_admin()
    )
  );

-- 15) Recomendación: si tu vista technicians_full enumera columnas manualmente,
-- agrega estas columnas desde technician_profiles:
-- verification_progress, verification_submitted_at, verified_at, verified_by,
-- rejected_reason, suspended_reason, application_data, profile_visibility.
