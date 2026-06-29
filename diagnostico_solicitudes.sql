-- ─────────────────────────────────────────────────────────────
-- Tecnifix — Diagnóstico del flujo "Nueva solicitud de servicio"
-- 100% SEGURO: solo LEE información, NO modifica ni borra nada.
-- Córrelo en Supabase → SQL Editor → Run, y mándame las 3 tablas
-- de resultados (o capturas). Con eso te doy el arreglo exacto.
-- ─────────────────────────────────────────────────────────────

-- 1) ¿Existen las columnas que el modal intenta guardar?
--    (client_id, technician_id, title, description, address,
--     agreed_price, payment_method, status, catalog_item_id)
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'service_requests'
ORDER BY ordinal_position;

-- 2) ¿Está activado RLS en la tabla?
SELECT relname AS tabla, relrowsecurity AS rls_activado
FROM pg_class
WHERE relname = 'service_requests';

-- 3) ¿Qué políticas RLS existen? (clave: debe haber un INSERT permitido
--    para el cliente autenticado, normalmente con WITH CHECK client_id = auth.uid())
SELECT policyname, cmd AS operacion, roles, qual AS using_expr, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'service_requests'
ORDER BY cmd, policyname;
