-- =============================================================================
-- MIGRATION: Fix timestamptz for conversations and messages
-- =============================================================================
-- Converts created_at from timestamp without time zone to
-- timestamp with time zone, using America/Lima as the source timezone.
-- Note: public.messages does NOT have updated_at (that's realtime.messages)
-- =============================================================================

ALTER TABLE public.conversations
  ALTER COLUMN created_at TYPE timestamptz
  USING created_at AT TIME ZONE 'America/Lima';

ALTER TABLE public.messages
  ALTER COLUMN created_at TYPE timestamptz
  USING created_at AT TIME ZONE 'America/Lima';
