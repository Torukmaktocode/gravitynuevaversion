-- =============================================================================
-- EMAIL WHITELIST: Habilitar RLS y políticas por rol
-- Ejecutar manualmente en Supabase SQL Editor
-- =============================================================================

-- Habilitar Row Level Security (si no está habilitado)
ALTER TABLE public.email_whitelist ENABLE ROW LEVEL SECURITY;

-- 1. Política de LECTURA: CUALQUIERA puede leer (incluyendo anónimos)
CREATE POLICY "whitelist_read_public" ON public.email_whitelist
FOR SELECT
USING (true);

-- 2. Política de INSERCIÓN: solo super_admin
CREATE POLICY "whitelist_insert_super_admin" ON public.email_whitelist
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 3. Política de ACTUALIZACIÓN: solo super_admin
CREATE POLICY "whitelist_update_super_admin" ON public.email_whitelist
FOR UPDATE
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 4. Política de ELIMINACIÓN: solo super_admin
CREATE POLICY "whitelist_delete_super_admin" ON public.email_whitelist
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- =============================================================================
-- COMPANIES: Habilitar RLS y políticas por rol
-- Ejecutar manualmente en Supabase SQL Editor
-- =============================================================================

-- Habilitar Row Level Security
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- 1. Política de LECTURA: usuarios autenticados (user, admin, super_admin)
CREATE POLICY "companies_read_authenticated" ON public.companies
FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() 
    AND role IN ('user', 'admin', 'super_admin')
  )
);

-- 2. Política de INSERCIÓN: solo super_admin
CREATE POLICY "companies_insert_super_admin" ON public.companies
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 3. Política de ACTUALIZACIÓN: solo super_admin
CREATE POLICY "companies_update_super_admin" ON public.companies
FOR UPDATE
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 4. Política de ELIMINACIÓN: solo super_admin
CREATE POLICY "companies_delete_super_admin" ON public.companies
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);