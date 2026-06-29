-- ============================================================
-- SEED · Técnicos de ejemplo en varias provincias de Panamá
-- ------------------------------------------------------------
-- Cómo usar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Pega TODO este archivo y pulsa "Run"
--   3. Recarga la app: el selector "Todo Panamá" y la grilla
--      se llenarán con técnicos de 8 provincias.
--
-- Contraseña de todas las cuentas demo: Tecnifix2026!
-- Email ya confirmado (pueden iniciar sesión).
-- Reversible: al final hay un bloque de LIMPIEZA (comentado).
-- ============================================================

create extension if not exists pgcrypto;

do $$
declare
  r record;
  uid uuid;
begin
  for r in
    select * from (values
      -- nombre, email, cat, título ES, título EN, min, max, whatsapp, ciudad, provincia, lat, lng, rating, reviews, jobs, featured, verified
      ('Carlos Mendoza',  'carlos.demo@tecnifix.pa',  1, 'Técnico en Aire Acondicionado', 'A/C Technician',        25, 350, '50761110001', 'Ciudad de Panamá', 'Panamá',          8.9824, -79.5199, 4.9, 87, 213, true,  true),
      ('María Batista',   'maria.demo@tecnifix.pa',   2, 'Electricista Certificada',      'Certified Electrician', 20, 500, '50761110002', 'David',            'Chiriquí',        8.4333, -82.4333, 4.8, 64, 150, true,  true),
      ('José Rodríguez',  'jose.demo@tecnifix.pa',    3, 'Plomero Profesional',           'Professional Plumber',  15, 250, '50761110003', 'Colón',            'Colón',           9.3592, -79.9014, 4.7, 41,  98, true,  true),
      ('Ana Gómez',       'ana.demo@tecnifix.pa',     5, 'Servicios de Limpieza',         'Cleaning Services',     30, 120, '50761110004', 'Penonomé',         'Coclé',           8.5180, -80.3580, 5.0, 52, 120, false, true),
      ('Luis Ortega',     'luis.demo@tecnifix.pa',    8, 'Técnico de Computadoras',       'Computer Technician',   10, 200, '50761110005', 'Santiago',         'Veraguas',        8.1000, -80.9833, 4.6, 38,  75, false, false),
      ('Pedro Sánchez',   'pedro.demo@tecnifix.pa',   7, 'Pintor y Acabados',             'Painter & Finishes',    40, 600, '50761110006', 'Las Tablas',       'Los Santos',      7.7686, -80.2747, 4.5, 29,  60, false, true),
      ('Rosa Caballero',  'rosa.demo@tecnifix.pa',    6, 'Cerrajería 24/7',               'Locksmith 24/7',        18, 180, '50761110007', 'Chitré',           'Herrera',         7.9614, -80.4292, 4.8, 33,  70, true,  true),
      ('Miguel Justavino','miguel.demo@tecnifix.pa',  4, 'Albañil y Construcción',        'Mason & Construction',  35, 800, '50761110008', 'Changuinola',      'Bocas del Toro',  9.4302, -82.5176, 4.4, 22,  48, false, false)
    ) as v(name,email,cat,title,title_en,minp,maxp,wa,city,prov,lat,lng,rating,reviews,jobs,featured,verified)
  loop
    uid := gen_random_uuid();

    -- 1) Usuario de autenticación (email confirmado)
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, email_change, email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000', uid, 'authenticated', 'authenticated',
      r.email, crypt('Tecnifix2026!', gen_salt('bf')), now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', r.name, 'role', 'technician'),
      now(), now(), '', '', '', ''
    ) on conflict do nothing;

    -- 2) Perfil (si un trigger ya lo creó, lo actualiza)
    insert into profiles (id, full_name, role, account_status, whatsapp_phone, avatar_url)
    values (uid, r.name, 'technician', 'active', r.wa, 'https://i.pravatar.cc/300?u=' || r.email)
    on conflict (id) do update
      set full_name = excluded.full_name,
          role = 'technician',
          whatsapp_phone = excluded.whatsapp_phone,
          avatar_url = excluded.avatar_url;

    -- 3) Perfil de técnico
    insert into technician_profiles (
      user_id, category_id, professional_title, professional_title_en,
      bio, bio_en, slogan, years_experience, company_name, national_id,
      min_price, max_price, price_unit, public_whatsapp,
      city, province, latitude, longitude, service_radius_km, response_time_minutes,
      is_available, verification_status, is_featured, average_rating, total_reviews, total_jobs
    ) values (
      uid, r.cat, r.title, r.title_en,
      'Profesional con experiencia comprobada, servicio puntual y garantizado.',
      'Experienced professional, punctual and guaranteed service.',
      'Calidad y confianza en toda la república', 8, '', '',
      r.minp, r.maxp, 'por servicio', r.wa,
      r.city, r.prov, r.lat, r.lng, 25, 45,
      true, case when r.verified then 'verified' else 'pending' end,
      r.featured, r.rating, r.reviews, r.jobs
    ) on conflict (user_id) do nothing;
  end loop;
end $$;

-- ============================================================
-- LIMPIEZA (opcional) — borra SOLO los técnicos demo de este seed.
-- Descomenta y ejecuta si quieres revertir.
-- ============================================================
-- delete from auth.users where email like '%.demo@tecnifix.pa';
-- (profiles y technician_profiles se borran en cascada si hay ON DELETE CASCADE;
--  si no, bórralos antes con el mismo filtro de user_id.)
