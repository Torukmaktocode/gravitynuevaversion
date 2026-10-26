-- =============================================================================
-- MIGRATION 003: Company invitations system
-- =============================================================================
-- Descripción: Sistema de invitaciones para que company_admins inviten usuarios.
-- Ejecutar en: Supabase SQL Editor
-- Orden: 3/4
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.company_invitations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  token TEXT NOT NULL UNIQUE,
  invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_invitations_token ON public.company_invitations(token);
CREATE INDEX IF NOT EXISTS idx_company_invitations_email ON public.company_invitations(email);
CREATE INDEX IF NOT EXISTS idx_company_invitations_company ON public.company_invitations(company_id);

ALTER TABLE public.company_invitations ENABLE ROW LEVEL SECURITY;

-- super_admin y company_admin de la compañía pueden ver/crear invitaciones
CREATE POLICY "company_invitations_company_scope" ON public.company_invitations FOR ALL
USING (
  public.is_super_admin()
  OR (
    public.is_company_admin()
    AND company_id = public.get_user_company_id()
  )
)
WITH CHECK (
  public.is_super_admin()
  OR (
    public.is_company_admin()
    AND company_id = public.get_user_company_id()
  )
);

-- El usuario invitado puede ver su propia invitación por token (para el flujo de aceptación)
CREATE POLICY "company_invitations_self_service" ON public.company_invitations FOR SELECT
USING (
  email = auth.email()
);

COMMIT;
