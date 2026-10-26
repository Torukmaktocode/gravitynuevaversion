-- =============================================================================
-- MIGRATION 004: Seed data + super_admin setup
-- =============================================================================
-- Descripción: Crea compañía por defecto, migra usuarios legacy, configura
--              super_admin manualmente.
--
-- ⚠️ IMPORTANTE PARA PRODUCCIÓN:
--   1. Antes de ejecutar, decide QUIÉN será super_admin y pon su email
--      en el UPDATE de la sección 3 (línea ~45).
--   2. Review la sección 2 — asigna TODOS los usuarios con company_id NULL
--      a "Legacy Company". Si tienes múltiples compañías ya en producción,
--      modifica este paso para asignar cada usuario a su compañía correcta.
--   3. Ejecutar en orden: 001 → 002 → 003 → 004 (preferiblemente todo en una
--      misma sesión del SQL Editor para minimizar la ventana sin RLS).
--   4. Después de ejecutar, VERIFICA con los SELECTs al final.
--
-- Ejecutar en: Supabase SQL Editor
-- Orden: 4/4
-- =============================================================================

BEGIN;

-- =============================================================================
-- 1. Crear compañía por defecto para usuarios legacy
-- =============================================================================
INSERT INTO public.companies (id, name, slug, settings)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Legacy Company',
  'legacy',
  '{"migrated": true, "note": "Compañía por defecto para usuarios anteriores al multi-tenant"}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- 2. Asignar usuarios legacy a la compañía por defecto
-- =============================================================================
-- ⚠️ Si tienes USUARIOS DE DISTINTAS EMPRESAS en producción, NO ejecutes este
--    UPDATE genérico. En su lugar, asigna manualmente cada grupo:
--
--    UPDATE public.profiles SET company_id = (SELECT id FROM public.companies WHERE slug = 'falabella')
--    WHERE email ILIKE '%@falabella.com';
--
--    UPDATE public.profiles SET company_id = (SELECT id FROM public.companies WHERE slug = 'help')
--    WHERE email ILIKE '%@help.cl';
--
--    ... etc.
--
--    Luego usa este UPDATE solo para los que queden sin compañía:
UPDATE public.profiles
SET
  company_id = '00000000-0000-0000-0000-000000000001',
  role = CASE
    WHEN role = 'admin'
    ELSE role
  END
WHERE company_id IS NULL;

-- =============================================================================
-- 3. Crear super_admin
-- =============================================================================
-- ⚠️ REEMPLAZA 'admin@tudominio.com' con el email del super_admin real.
--    Este usuario DEBE existir ya en auth.users y profiles.
--    Se deja company_id = NULL (super_admin no pertenece a ninguna compañía).
--
-- EJEMPLO:
--   UPDATE public.profiles
--   SET role = 'super_admin', company_id = NULL
--   WHERE email = 'admin@gravity.com';
--
-- Por seguridad, este UPDATE está comentado. DESCOMENTA y ejecuta manualmente:
-- UPDATE public.profiles
-- SET role = 'super_admin', company_id = NULL
-- WHERE email = 'admin@tudominio.com';

-- Si no existe aún el usuario super_admin, créalo primero en Auth > Users
-- de la UI de Supabase, luego ejecuta el UPDATE de arriba.

-- =============================================================================
-- 4. Verificación
-- =============================================================================
-- Revisa que los roles y compañías se hayan asignado correctamente:
--
-- SELECT role, COUNT(*) as cantidad
-- FROM public.profiles
-- GROUP BY role
-- ORDER BY role;
--
-- SELECT
--   c.name as company,
--   COUNT(p.id) as usuarios
-- FROM public.companies c
-- LEFT JOIN public.profiles p ON p.company_id = c.id
-- GROUP BY c.name
-- ORDER BY c.name;
--
-- SELECT email, role, company_id
-- FROM public.profiles
-- WHERE role IN ('super_admin', 'admin')
-- ORDER BY role, email;

COMMIT;
