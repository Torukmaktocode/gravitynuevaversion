-- =============================================================================
-- MIGRATION: Add total_minutes column and separate training_minutes
-- training_minutes: only block-based training (/entrenador voice conversations)
-- total_minutes: training_minutes + FLOOR(closer_count * 0.5) + FLOOR(quiz_answers * 0.5)
-- =============================================================================

-- 1) Add total_minutes column
ALTER TABLE public.daily_metrics
  ADD COLUMN IF NOT EXISTS total_minutes integer DEFAULT 0;

-- 2) Migrate existing data: training_minutes had the combined value
--    Copy it to total_minutes, then subtract closer/quiz from training_minutes
UPDATE daily_metrics SET total_minutes = training_minutes;
UPDATE daily_metrics SET training_minutes = GREATEST(0, training_minutes - FLOOR(closer_count * 0.5)::integer - FLOOR(quiz_answers * 0.5)::integer);

-- 3) Updated trigger for training_sessions
CREATE OR REPLACE FUNCTION public.sync_daily_metrics_on_training()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count, quiz_answers, total_minutes)
  SELECT
    NEW.user_id,
    session_day,
    FLOOR(SUM(LEAST(block_duration_sec, 3600)) / 60)::integer,
    COUNT(*)::integer,
    0,
    COALESCE((SELECT closer_count FROM public.daily_metrics WHERE user_id = NEW.user_id AND day = session_day), 0),
    COALESCE((SELECT quiz_answers FROM public.daily_metrics WHERE user_id = NEW.user_id AND day = session_day), 0),
    FLOOR(SUM(LEAST(block_duration_sec, 3600)) / 60)::integer
      + FLOOR(COALESCE((SELECT closer_count FROM public.daily_metrics WHERE user_id = NEW.user_id AND day = session_day), 0) * 0.5)::integer
      + FLOOR(COALESCE((SELECT quiz_answers FROM public.daily_metrics WHERE user_id = NEW.user_id AND day = session_day), 0) * 0.5)::integer
  FROM block_durations
  WHERE user_id = NEW.user_id AND day = session_day
  GROUP BY NEW.user_id, session_day
  ON CONFLICT (user_id, day) DO UPDATE
    SET training_minutes = EXCLUDED.training_minutes,
        sessions = EXCLUDED.sessions,
        total_minutes = EXCLUDED.total_minutes;

  RETURN NEW;
END;
$$;

-- 4) Updated trigger for closer_usage (no longer touches training_minutes)
CREATE OR REPLACE FUNCTION public.sync_daily_metrics_on_closer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  usage_day date;
  current_closer integer;
  current_quiz integer;
  block_minutes integer;
BEGIN
  usage_day := DATE(NEW.created_at AT TIME ZONE 'America/Lima');

  SELECT COUNT(*)::integer INTO current_closer
  FROM public.closer_usage
  WHERE user_id = NEW.user_id AND DATE(created_at AT TIME ZONE 'America/Lima') = usage_day;

  SELECT COALESCE(training_minutes, 0), COALESCE(quiz_answers, 0)
  INTO block_minutes, current_quiz
  FROM public.daily_metrics
  WHERE user_id = NEW.user_id AND day = usage_day;

  INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count, quiz_answers, total_minutes)
  VALUES (NEW.user_id, usage_day, block_minutes, 0, 0, current_closer, current_quiz,
    block_minutes + FLOOR(current_closer * 0.5)::integer + FLOOR(current_quiz * 0.5)::integer)
  ON CONFLICT (user_id, day) DO UPDATE
    SET closer_count = EXCLUDED.closer_count,
        total_minutes = EXCLUDED.total_minutes;

  RETURN NEW;
END;
$$;

-- 5) Updated increment_daily_quiz_answer (no longer touches training_minutes)
CREATE OR REPLACE FUNCTION public.increment_daily_quiz_answer(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    today_date date;
    current_closer integer;
    current_quiz integer;
    block_minutes integer;
BEGIN
    IF auth.uid() != target_user_id THEN
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin')) THEN
            RAISE EXCEPTION 'Not authorized';
        END IF;
    END IF;

    today_date := (now() AT TIME ZONE 'America/Lima')::date;

    SELECT COALESCE(training_minutes, 0), COALESCE(closer_count, 0), COALESCE(quiz_answers, 0)
    INTO block_minutes, current_closer, current_quiz
    FROM public.daily_metrics
    WHERE user_id = target_user_id AND day = today_date;

    current_quiz := current_quiz + 1;

    INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count, quiz_answers, total_minutes)
    VALUES (target_user_id, today_date, block_minutes, 0, 0, current_closer, current_quiz,
      block_minutes + FLOOR(current_closer * 0.5)::integer + FLOOR(current_quiz * 0.5)::integer)
    ON CONFLICT (user_id, day) DO UPDATE SET
        quiz_answers = EXCLUDED.quiz_answers,
        total_minutes = EXCLUDED.total_minutes;
END;
$$;

-- 6) Fixed recalculate_daily_metrics (bug: subquery returned multiple rows)
CREATE OR REPLACE FUNCTION public.recalculate_daily_metrics(target_user_id uuid DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    WITH msg_with_gap AS (
      SELECT c.user_id, m.created_at,
        EXTRACT(EPOCH FROM (m.created_at - LAG(m.created_at) OVER (PARTITION BY m.conversation_id ORDER BY m.created_at, m.id))) AS gap_sec
      FROM messages m JOIN conversations c ON c.id = m.conversation_id WHERE c.user_id = uid
    ),
    blocks AS (
      SELECT user_id, created_at,
        SUM(CASE WHEN gap_sec IS NULL OR gap_sec > 1800 THEN 1 ELSE 0 END) OVER (PARTITION BY user_id ORDER BY created_at) AS block_id
      FROM msg_with_gap
    ),
    block_durations AS (
      SELECT user_id, (MIN(created_at)::timestamptz AT TIME ZONE 'America/Lima')::date AS day,
        EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) AS block_duration_sec
      FROM blocks GROUP BY user_id, block_id
      HAVING EXTRACT(EPOCH FROM (MAX(created_at) - MIN(created_at))) > 0
    )
    INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count, quiz_answers, total_minutes)
    SELECT uid, COALESCE(bd.day, ts.day),
      COALESCE(bd_training, 0), COALESCE(ts.sessions, 0), 0,
      COALESCE((SELECT closer_count FROM public.daily_metrics WHERE user_id = uid AND day = COALESCE(bd.day, ts.day)), 0),
      COALESCE((SELECT quiz_answers FROM public.daily_metrics WHERE user_id = uid AND day = COALESCE(bd.day, ts.day)), 0),
      COALESCE(bd_training, 0)
        + FLOOR(COALESCE((SELECT closer_count FROM public.daily_metrics WHERE user_id = uid AND day = COALESCE(bd.day, ts.day)), 0) * 0.5)::integer
        + FLOOR(COALESCE((SELECT quiz_answers FROM public.daily_metrics WHERE user_id = uid AND day = COALESCE(bd.day, ts.day)), 0) * 0.5)::integer
    FROM (SELECT uid AS user_id, FLOOR(SUM(LEAST(block_duration_sec, 3600)) / 60)::integer AS bd_training, day FROM block_durations GROUP BY day) bd
    FULL JOIN (SELECT DATE(started_at AT TIME ZONE 'America/Lima') AS day, COUNT(*)::integer AS sessions FROM public.training_sessions WHERE user_id = uid GROUP BY DATE(started_at AT TIME ZONE 'America/Lima')) ts ON bd.day = ts.day
    ON CONFLICT (user_id, day) DO UPDATE SET training_minutes = EXCLUDED.training_minutes, sessions = EXCLUDED.sessions, total_minutes = EXCLUDED.total_minutes;

    INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count, quiz_answers, total_minutes)
    SELECT uid, cu.day,
      COALESCE(dm.training_minutes, 0), COALESCE(dm.sessions, 0), 0, cu.closer_count, COALESCE(dm.quiz_answers, 0),
      COALESCE(dm.training_minutes, 0) + FLOOR(cu.closer_count * 0.5)::integer + FLOOR(COALESCE(dm.quiz_answers, 0) * 0.5)::integer
    FROM (SELECT uid AS user_id, DATE(created_at AT TIME ZONE 'America/Lima') AS day, COUNT(*)::integer AS closer_count FROM public.closer_usage WHERE user_id = uid GROUP BY DATE(created_at AT TIME ZONE 'America/Lima')) cu
    LEFT JOIN public.daily_metrics dm ON dm.user_id = uid AND dm.day = cu.day
    ON CONFLICT (user_id, day) DO UPDATE SET closer_count = EXCLUDED.closer_count, total_minutes = EXCLUDED.total_minutes;

  END LOOP;
END;
$$;
