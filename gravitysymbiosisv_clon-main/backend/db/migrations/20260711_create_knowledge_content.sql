-- =============================================================================
-- MIGRATION: Create knowledge_content table (per-company knowledge base)
-- =============================================================================
-- Descripción: Reemplaza el KNOWLEDGE_BASE_DB global hardcodeado por una
--              tabla por compañía. Cada empresa tiene su propio contenido
--              de conocimiento (módulos + items de quiz).
--
-- Ejecutar en: Supabase SQL Editor
-- Orden: después de 20260606_add_openai_assistant_id_to_companies.sql
-- =============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.knowledge_content (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  module TEXT NOT NULL,
  module_title TEXT NOT NULL,
  concepto TEXT NOT NULL,
  enseñanza TEXT NOT NULL,
  ejemplo TEXT NOT NULL,
  pregunta TEXT NOT NULL,
  opciones JSONB NOT NULL DEFAULT '[]'::jsonb,
  respuesta TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER knowledge_content_set_updated_at
  BEFORE UPDATE ON public.knowledge_content
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS idx_knowledge_content_company_module
  ON public.knowledge_content(company_id, module);

CREATE INDEX IF NOT EXISTS idx_knowledge_content_company
  ON public.knowledge_content(company_id);

ALTER TABLE public.knowledge_content
  ADD CONSTRAINT knowledge_content_unique_module_item
  UNIQUE (company_id, module, orden);

-- RLS
ALTER TABLE public.knowledge_content ENABLE ROW LEVEL SECURITY;

-- super_admin: full access
CREATE POLICY knowledge_content_super_admin ON public.knowledge_content
  FOR ALL
  USING (public.is_super_admin())
  WITH CHECK (public.is_super_admin());

-- company_admin: CRUD on own company's content
CREATE POLICY knowledge_content_company_admin ON public.knowledge_content
  FOR ALL
  USING (
    public.is_company_admin()
    AND company_id = public.get_user_company_id()
  )
  WITH CHECK (
    public.is_company_admin()
    AND company_id = public.get_user_company_id()
  );

-- regular users: read-only for their company
CREATE POLICY knowledge_content_user_read ON public.knowledge_content
  FOR SELECT
  USING (
    company_id = public.get_user_company_id()
  );

COMMIT;
