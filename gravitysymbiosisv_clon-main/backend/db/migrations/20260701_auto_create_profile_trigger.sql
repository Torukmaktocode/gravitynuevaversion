-- =============================================================================
-- MIGRATION: Auto-create profile on new user registration (Trigger)
-- =============================================================================
-- Descripción: Crea automáticamente un registro en public.profiles cada vez
--              que un nuevo usuario se registra en auth.users.
--              Esto evita que el perfil sea null al primer login.
-- Ejecutar en: Supabase SQL Editor
-- =============================================================================

-- 1. Función que se ejecuta cuando se crea un usuario en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    'user',
    now(),
    now()
  )
  ON CONFLICT (id) DO NOTHING; -- Si ya existe (creado manualmente), no sobreescribir

  RETURN NEW;
END;
$$;

-- 2. Eliminar trigger previo si existía (idempotente)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. Crear el trigger en auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 4. Verificación: asegurarse de que el constraint de role incluye 'user'
--    (ya definido en 20260601, pero lo dejamos seguro)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'profiles'
      AND constraint_name = 'profiles_role_check'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('user', 'admin', 'super_admin'));
  END IF;
END $$;
