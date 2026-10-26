-- =============================================================================
-- MIGRATION: Fix training_minutes for single-message conversation blocks
-- Problema: bloques con 1 solo mensaje tenían block_duration_sec = 0 y se
-- descartaban por el HAVING > 0. Una interacción de 1 pregunta→respuesta
-- representa actividad real y debe contar como mínimo 1 minuto.
-- =============================================================================
-- Orden: después de 20260715_add_total_minutes.sql
-- =============================================================================

CREATE OR REPLACE FUNCTION public.sync_daily_metrics_on_training()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  session_day    date;
  current_closer integer;
  current_quiz   integer;
BEGIN
  session_day := DATE(NEW.started_at AT TIME ZONE 'America/Lima');

  -- Leer closer y quiz actuales para preservarlos en el upsert
  SELECT
    COALESCE(closer_count, 0),
    COALESCE(quiz_answers, 0)
  INTO current_closer, current_quiz
  FROM public.daily_metrics
  WHERE user_id = NEW.user_id AND day = session_day;

  current_closer := COALESCE(current_closer, 0);
  current_quiz   := COALESCE(current_quiz, 0);

  WITH msg_with_gap AS (
    SELECT
      c.user_id,
      m.created_at,
      EXTRACT(EPOCH FROM (
        m.created_at - LAG(m.created_at) OVER (
          PARTITION BY m.conversation_id ORDER BY m.created_at, m.id
        )
      )) AS gap_sec
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.user_id = NEW.user_id
  ),
  blocks AS (
    SELECT
      user_id,
      created_at,
      SUM(CASE WHEN gap_sec IS NULL OR gap_sec > 1800 THEN 1 ELSE 0 END)
        OVER (PARTITION BY user_id ORDER BY created_at) AS block_id
    FROM msg_with_gap
  ),
  block_durations AS (
    SELECT
      user_id,
      (MIN(created_at)::timestamptz AT TIME ZONE 'America/Lima')::date AS day,
      -- FIX: bloques de 1 mensaje cuentan como 60s mínimo (1 interacción real)
      GREATEST(
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))),
        60
      ) AS block_duration_sec
    FROM blocks
    GROUP BY user_id, block_id
    -- FIX: eliminado HAVING > 0, ahora incluye bloques de 1 solo mensaje
  )
  INSERT INTO public.daily_metrics (
    user_id, day, training_minutes, sessions, avg_score,
    closer_count, quiz_answers, total_minutes
  )
  SELECT
    NEW.user_id,
    session_day,
    FLOOR(SUM(LEAST(block_duration_sec, 3600)) / 60)::integer,
    COUNT(*)::integer,
    0,
    current_closer,
    current_quiz,
    FLOOR(SUM(LEAST(block_duration_sec, 3600)) / 60)::integer
      + FLOOR(current_closer * 0.5)::integer
      + FLOOR(current_quiz   * 0.5)::integer
  FROM block_durations
  WHERE user_id = NEW.user_id AND day = session_day
  GROUP BY NEW.user_id, session_day
  ON CONFLICT (user_id, day) DO UPDATE
    SET training_minutes = EXCLUDED.training_minutes,
        sessions         = EXCLUDED.sessions,
        total_minutes    = EXCLUDED.total_minutes;

  RETURN NEW;
END;
$$;

-- El trigger trg_sync_daily_metrics_training ya existe en training_sessions.
-- Solo se necesita reemplazar la función. Verificar:
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'training_sessions'::regclass;

-- =============================================================================
-- BACKFILL: después de ejecutar esta migración, recalcular datos históricos:
--   SELECT public.recalculate_daily_metrics();
-- =============================================================================
