-- Tecnifix V2.0 - Phase 1 Exotics
-- Añade Gamificación (XP/Niveles) y Emergencias (SOS)

-- 1. Actualización de technician_profiles para Gamificación
ALTER TABLE technician_profiles ADD COLUMN IF NOT EXISTS xp INTEGER DEFAULT 0;
ALTER TABLE technician_profiles ADD COLUMN IF NOT EXISTS level INTEGER DEFAULT 1;

-- 2. Crear tabla de Alertas SOS
CREATE TABLE IF NOT EXISTS emergency_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    client_name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'resolved')),
    accepted_by UUID REFERENCES technician_profiles(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security para emergency_requests
ALTER TABLE emergency_requests ENABLE ROW LEVEL SECURITY;

-- Políticas de Seguridad
-- Todo el mundo puede crear una emergencia
CREATE POLICY "Anyone can insert emergency_requests"
    ON emergency_requests FOR INSERT
    TO public
    WITH CHECK (true);

-- Todo el mundo puede ver las emergencias
CREATE POLICY "Anyone can view emergency_requests"
    ON emergency_requests FOR SELECT
    TO public
    USING (true);

-- Los técnicos y dueños pueden actualizar el estado de la emergencia
CREATE POLICY "Anyone can update emergency_requests"
    ON emergency_requests FOR UPDATE
    TO public
    USING (true)
    WITH CHECK (true);

-- Intentar añadir la tabla a la publicación de realtime de Supabase
-- (Si falla, el usuario puede activarlo manualmente en el dashboard de Supabase)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE emergency_requests;
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    -- Ignorar si la tabla ya está en la publicación o no existe el pub
END $$;
