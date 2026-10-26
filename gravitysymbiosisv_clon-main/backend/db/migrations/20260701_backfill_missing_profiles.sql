-- =============================================================================
-- SCRIPT: Backfill perfiles faltantes
-- =============================================================================
-- Descripción: Encuentra todos los usuarios en auth.users que NO tienen un
--              registro correspondiente en public.profiles y los crea con el
--              rol básico de 'user'.
-- Ejecutar en: Supabase SQL Editor
-- =============================================================================

BEGIN;

INSERT INTO public.profiles (id, email, role, created_at, updated_at)
SELECT 
    au.id, 
    au.email, 
    'user' AS role, 
    COALESCE(au.created_at, now()) AS created_at, 
    now() AS updated_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL;

-- Para ver cuántos se insertaron, Supabase mostrará "INSERT 0 X"
-- donde X es el número de perfiles creados.

COMMIT;
