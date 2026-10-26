-- =============================================================================
-- MIGRATION 006: Add openai_assistant_id to companies
-- =============================================================================
-- Descripción: Agrega openai_assistant_id a cada compañía para permitir
-- configuraciones personalizadas del entrenador de ventas.
-- =============================================================================

BEGIN;

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS openai_assistant_id TEXT;

COMMIT;
