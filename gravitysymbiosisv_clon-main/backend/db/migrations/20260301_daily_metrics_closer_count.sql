-- =============================================================================
-- MIGRATION: Add closer_count to daily_metrics + Backfill Function
-- Run this in your Supabase SQL Editor
-- =============================================================================

-- 1) Add closer_count column if it doesn't exist
ALTER TABLE public.daily_metrics
  ADD COLUMN IF NOT EXISTS closer_count integer NOT NULL DEFAULT 0;

-- 2) Function: Recalculate daily_metrics for a specific user (backfill + sync)
--    Uses conversation blocks with >30min gaps, capped at 3600s per block
--    Preserves quiz_answers (cannot be recalculated from source tables)
CREATE OR REPLACE FUNCTION public.recalculate_daily_metrics(target_user_id uuid DEFAULT NULL)
RETURNS void AS $$
DECLARE
  uid uuid;
  user_ids uuid[];
BEGIN
  IF target_user_id IS NULL THEN
    SELECT ARRAY(SELECT id FROM public.profiles) INTO user_ids;
  ELSE
    user_ids := ARRAY[target_user_id];
  END IF;

  FOREACH uid IN ARRAY user_ids LOOP
    -- Upsert training minutes from conversation blocks (capped at 3600s, gaps >30min)
    WITH msg_with_gap AS (
      SELECT
        c.user_id,
        m.created_at,
        EXTRACT(EPOCH FROM (m.created_at - LAG(m.created_at) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at, m.id))) AS gap_sec
      FROM messages m
      JOIN conversations c ON c.id = m.conversation_id
      WHERE c.user_id = uid
    ),
    blocks AS (
      SELECT
        user_id,
        created_at,
        SUM(CASE WHEN gap_sec IS NULL OR gap_sec > 1800 THEN 1 ELSE 0 END) OVER (PARTITION BY user_id ORDER BY created_at) AS block_id
      FROM msg_with_gap
    ),
    block_durations AS (
      SELECT
        user_id,
        (MIN(created_at)::timestamptz AT TIME ZONE 'America/Lima')::date AS day,
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS block_duration_sec
      FROM blocks
      GROUP BY user_id, block_id
      HAVING EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) > 0
    )
    INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count)
    SELECT
      uid,
      COALESCE(bd.day, ts.day) AS day,
      COALESCE(bd_training, 0) AS training_minutes,
      COALESCE(ts.sessions, 0) AS sessions,
      0 AS avg_score,
      COALESCE(
        (SELECT closer_count FROM public.daily_metrics WHERE user_id = uid AND day = COALESCE(bd.day, ts.day)),
        0
      )
    FROM (
      SELECT
        uid AS user_id,
        FLOOR(SUM(LEAST(block_duration_sec, 3600)) / 60)::integer AS bd_training,
        day
      FROM block_durations
      GROUP BY day
    ) bd
    FULL JOIN (
      SELECT
        DATE(started_at AT TIME ZONE 'America/Lima') AS day,
        COUNT(*)::integer AS sessions
      FROM public.training_sessions
      WHERE user_id = uid
      GROUP BY DATE(started_at AT TIME ZONE 'America/Lima')
    ) ts ON bd.day = ts.day
    ON CONFLICT (user_id, day) DO UPDATE
      SET training_minutes = EXCLUDED.training_minutes,
          sessions = EXCLUDED.sessions;

    -- Update closer_count per day from closer_usage
    INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count)
    SELECT
      uid,
      DATE(created_at AT TIME ZONE 'America/Lima') AS day,
      COALESCE(
        (SELECT training_minutes FROM public.daily_metrics WHERE user_id = uid AND day = DATE(created_at AT TIME ZONE 'America/Lima')),
        0
      ),
      COALESCE(
        (SELECT sessions FROM public.daily_metrics WHERE user_id = uid AND day = DATE(created_at AT TIME ZONE 'America/Lima')),
        0
      ),
      0,
      COUNT(*)::integer
    FROM public.closer_usage
    WHERE user_id = uid
    GROUP BY DATE(created_at AT TIME ZONE 'America/Lima')
    ON CONFLICT (user_id, day) DO UPDATE
      SET closer_count = EXCLUDED.closer_count;

  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (they can only recalculate their own data via app logic)
GRANT EXECUTE ON FUNCTION public.recalculate_daily_metrics(uuid) TO authenticated;

-- 3) Trigger: Auto-update daily_metrics when a training_session is inserted/updated
--    Uses conversation blocks with >30min gaps, capped at 3600s per block
CREATE OR REPLACE FUNCTION public.sync_daily_metrics_on_training()
RETURNS trigger AS $$
DECLARE
  session_day date;
BEGIN
  session_day := DATE(NEW.started_at AT TIME ZONE 'America/Lima');

  WITH msg_with_gap AS (
    SELECT
      c.user_id,
      m.created_at,
      EXTRACT(EPOCH FROM (m.created_at - LAG(m.created_at) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at, m.id))) AS gap_sec
    FROM messages m
    JOIN conversations c ON c.id = m.conversation_id
    WHERE c.user_id = NEW.user_id
  ),
  blocks AS (
    SELECT
      user_id,
      created_at,
      SUM(CASE WHEN gap_sec IS NULL OR gap_sec > 1800 THEN 1 ELSE 0 END) OVER (PARTITION BY user_id ORDER BY created_at) AS block_id
    FROM msg_with_gap
  ),
  block_durations AS (
    SELECT
      user_id,
      (MIN(created_at)::timestamptz AT TIME ZONE 'America/Lima')::date AS day,
      EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS block_duration_sec
    FROM blocks
    GROUP BY user_id, block_id
    HAVING EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) > 0
  )
  INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count)
  SELECT
    NEW.user_id,
    session_day,
    FLOOR(SUM(LEAST(block_duration_sec, 3600)) / 60)::integer
      + FLOOR(COALESCE(
          (SELECT closer_count FROM public.daily_metrics WHERE user_id = NEW.user_id AND day = session_day),
          0
        ) * 30 / 60)::integer
      + FLOOR(COALESCE(
          (SELECT quiz_answers FROM public.daily_metrics WHERE user_id = NEW.user_id AND day = session_day),
          0
        ) * 30 / 60)::integer,
    COUNT(*)::integer,
    0,
    COALESCE(
      (SELECT closer_count FROM public.daily_metrics WHERE user_id = NEW.user_id AND day = session_day),
      0
    )
  FROM block_durations
  WHERE user_id = NEW.user_id AND day = session_day
  GROUP BY NEW.user_id, session_day
  ON CONFLICT (user_id, day) DO UPDATE
    SET training_minutes = EXCLUDED.training_minutes,
        sessions         = EXCLUDED.sessions;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_daily_metrics_training ON public.training_sessions;
CREATE TRIGGER trg_sync_daily_metrics_training
AFTER INSERT OR UPDATE ON public.training_sessions
FOR EACH ROW EXECUTE FUNCTION public.sync_daily_metrics_on_training();

-- 4) Trigger: Auto-update daily_metrics when a closer_usage is inserted
CREATE OR REPLACE FUNCTION public.sync_daily_metrics_on_closer()
RETURNS trigger AS $$
DECLARE
  usage_day date;
BEGIN
  usage_day := DATE(NEW.created_at AT TIME ZONE 'America/Lima');

  INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count)
  SELECT
    NEW.user_id,
    usage_day,
    COALESCE(
      (SELECT training_minutes FROM public.daily_metrics
       WHERE user_id = NEW.user_id AND day = usage_day),
      0
    ),
    COALESCE(
      (SELECT sessions FROM public.daily_metrics
       WHERE user_id = NEW.user_id AND day = usage_day),
      0
    ),
    0,
    COUNT(*)::integer
  FROM public.closer_usage
  WHERE user_id = NEW.user_id
    AND DATE(created_at AT TIME ZONE 'America/Lima') = usage_day
  GROUP BY NEW.user_id, usage_day
  ON CONFLICT (user_id, day) DO UPDATE
    SET closer_count = EXCLUDED.closer_count;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_daily_metrics_closer ON public.closer_usage;
CREATE TRIGGER trg_sync_daily_metrics_closer
AFTER INSERT OR UPDATE ON public.closer_usage
FOR EACH ROW EXECUTE FUNCTION public.sync_daily_metrics_on_closer();

-- =============================================================================
-- HOW TO BACKFILL EXISTING DATA:
--   SELECT public.recalculate_daily_metrics();           -- all users
--   SELECT public.recalculate_daily_metrics('<user-id>'); -- one user
-- =============================================================================
