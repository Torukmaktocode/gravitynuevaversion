-- =============================================================================
-- MIGRATION: Fix NOT NULL violation en daily_metrics en la primera actividad del día
-- =============================================================================
-- Problema: `sync_daily_metrics_on_closer()` e `increment_daily_quiz_answer()`
-- leían training_minutes/closer_count/quiz_answers con `SELECT ... INTO` desde
-- daily_metrics. Si NO existía una fila para ese (user_id, day), las variables
-- quedaban NULL (COALESCE no aplica cuando no hay fila), y el INSERT fallaba con:
--   null value in column "training_minutes" violates not-null constraint
--
-- Afectaba a:
--   - La primera consulta al Closer del día (trigger sync_daily_metrics_on_closer)
--   - El primer quiz / contenido visto del día (increment_daily_quiz_answer)
-- =============================================================================
-- Orden: después de 20260730_fix_training_single_message_blocks.sql
-- =============================================================================

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

  SELECT COALESCE(quiz_answers, 0) INTO current_quiz
  FROM public.daily_metrics
  WHERE user_id = NEW.user_id AND day = usage_day;

  SELECT COALESCE(training_minutes, 0) INTO block_minutes
  FROM public.daily_metrics
  WHERE user_id = NEW.user_id AND day = usage_day;

  -- FIX: si no hay fila previa en daily_metrics, las variables quedan NULL
  current_quiz := COALESCE(current_quiz, 0);
  block_minutes := COALESCE(block_minutes, 0);

  INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count, quiz_answers, total_minutes)
  VALUES (NEW.user_id, usage_day, block_minutes, 0, 0, current_closer, current_quiz,
    block_minutes + FLOOR(current_closer * 0.5)::integer + FLOOR(current_quiz * 0.5)::integer)
  ON CONFLICT (user_id, day) DO UPDATE
    SET closer_count = EXCLUDED.closer_count,
        total_minutes = EXCLUDED.total_minutes;

  RETURN NEW;
END;
$$;

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

    -- FIX: si no hay fila previa, inicializar en 0 antes de sumar
    block_minutes := COALESCE(block_minutes, 0);
    current_closer := COALESCE(current_closer, 0);
    current_quiz := COALESCE(current_quiz, 0) + 1;

    INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count, quiz_answers, total_minutes)
    VALUES (target_user_id, today_date, block_minutes, 0, 0, current_closer, current_quiz,
      block_minutes + FLOOR(current_closer * 0.5)::integer + FLOOR(current_quiz * 0.5)::integer)
    ON CONFLICT (user_id, day) DO UPDATE SET
        quiz_answers = EXCLUDED.quiz_answers,
        total_minutes = EXCLUDED.total_minutes;
END;
$$;
