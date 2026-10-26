-- ==============================================================================
-- MIGRATION: Add quiz_answers to daily_metrics
-- ==============================================================================

-- 1) Add the new column if it doesn't exist
ALTER TABLE public.daily_metrics
ADD COLUMN IF NOT EXISTS quiz_answers integer DEFAULT 0;

-- 2) Function to securely increment quiz_answers from the frontend
-- This allows authenticated users to increment their own quiz answers
CREATE OR REPLACE FUNCTION public.increment_daily_quiz_answer(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    today_date date;
BEGIN
    IF auth.uid() != target_user_id THEN
        IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
            RAISE EXCEPTION 'Not authorized';
        END IF;
    END IF;

    today_date := (now() AT TIME ZONE 'America/Lima')::date;

    INSERT INTO public.daily_metrics (user_id, day, training_minutes, sessions, avg_score, closer_count, quiz_answers)
    VALUES (target_user_id, today_date, 0, 0, 0, 0, 1)
    ON CONFLICT (user_id, day) DO UPDATE SET
        quiz_answers = public.daily_metrics.quiz_answers + 1;
END;
$$;

-- Give access to the function
GRANT EXECUTE ON FUNCTION public.increment_daily_quiz_answer(uuid) TO authenticated;
