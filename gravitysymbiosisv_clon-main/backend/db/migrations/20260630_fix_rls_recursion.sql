-- =============================================================================
-- FIX MIGRATION: Fix infinite recursion in RLS policies
-- =============================================================================
-- Al tener `LANGUAGE SQL STABLE` sin `SECURITY DEFINER`, las funciones
-- `is_super_admin()`, `is_admin()` y `get_user_company_id()` se
-- ejecutaban con los permisos del usuario actual, lo que activaba de nuevo
-- las políticas RLS sobre la tabla `profiles`, causando un bucle infinito
-- ("stack depth limit exceeded").
--
-- Añadiendo `SECURITY DEFINER` forzamos a que las funciones se ejecuten con
-- privilegios de postgres (bypasseando RLS) y rompiendo el bucle.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  );
$$;

-- Renombrada de is_company_admin → is_admin (company_admin ya no existe)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- Alias de compatibilidad por si otras policies aún usan is_company_admin
CREATE OR REPLACE FUNCTION public.is_company_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin();
$$;
