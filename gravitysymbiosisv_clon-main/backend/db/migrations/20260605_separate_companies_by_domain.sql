-- =============================================================================
-- MIGRATION 005: Separate users into companies by email domain
-- =============================================================================
-- Descripción: Crea compañías para Falabella, Help.cl, Gravity y asigna
--              usuarios según su dominio de email. Los que no coinciden
--              quedan en "Legacy Company".
--
-- Ejecutar en: Supabase SQL Editor
-- Orden: 5/4 (ejecutar después de 001-004)
--
-- ⚠️ Verifica con los SELECTs al final antes de confirmar.
--    Si algo no se ve bien, solo cierra sesión sin hacer COMMIT.
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Crear compañías
-- =============================================================================

INSERT INTO public.companies (name, slug, settings)
VALUES
  ('Falabella', 'falabella', '{"migrated": true, "type": "client"}'::jsonb),
  ('Help.cl', 'help', '{"migrated": true, "type": "client"}'::jsonb),
  ('Gravity Symbiosis', 'gravity', '{"migrated": true, "type": "internal"}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 2. Asignar usuarios según dominio
-- =============================================================================

-- Falabella: @falabella.com (y subdominios como @sodimac.falabella.com etc.)
UPDATE public.profiles
SET company_id = (SELECT id FROM public.companies WHERE slug = 'falabella')
WHERE email ILIKE '%@falabella.com'
   OR email ILIKE '%.falabella.com';

-- Help.cl
UPDATE public.profiles
SET company_id = (SELECT id FROM public.companies WHERE slug = 'help')
WHERE email ILIKE '%@help.cl';

-- Gravity Symbiosis
UPDATE public.profiles
SET company_id = (SELECT id FROM public.companies WHERE slug = 'gravity')
WHERE email ILIKE '%@gravitysymbiosis.com'
   OR email ILIKE '%@gravity.com';

-- =============================================================================
-- 3. Asegurar que super_admin no tenga company_id
-- =============================================================================

UPDATE public.profiles
SET company_id = NULL
WHERE role = 'super_admin';

-- =============================================================================
-- 4. Verificación
-- =============================================================================

-- Ejecuta estos SELECTs para revisar antes de hacer COMMIT:

-- SELECT email, role, company_id, (SELECT name FROM public.companies WHERE id = profiles.company_id) as company
-- FROM public.profiles
-- ORDER BY company, email;

-- SELECT c.name as company, COUNT(p.id) as usuarios
-- FROM public.companies c
-- LEFT JOIN public.profiles p ON p.company_id = c.id
-- GROUP BY c.name
-- ORDER BY c.name;

-- Si todo se ve bien, puedes hacer COMMIT (ya está abajo).
-- Si algo anda mal, cierra la pestaña del SQL Editor sin hacer clic en nada.

COMMIT;
