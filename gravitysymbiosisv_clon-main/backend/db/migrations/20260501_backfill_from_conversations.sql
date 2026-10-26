-- =============================================================================
-- UTILITY SCRIPT: Backfill training_sessions, closer_usage, and daily_metrics
--                 from existing conversations and message history.
-- Run this in your Supabase SQL Editor to populate historical analytics!
-- =============================================================================

DO $$
DECLARE
  conv RECORD;
  msg RECORD;
  session_started timestamp with time zone;
  session_ended timestamp with time zone;
  session_duration integer;
  msg_count integer;
  
  -- Metrics calculation
  user_resp_time_sum numeric := 0;
  user_resp_count integer := 0;
  last_assistant_time timestamp with time zone := NULL;
  avg_user_resp_sec numeric;
  calc_score integer;
  
  -- Closer classification
  est_framework text;
  est_technique text;
  
  -- Counters for summary logs
  inserted_sessions integer := 0;
  inserted_closers integer := 0;
  inserted_profiles integer := 0;
BEGIN
  RAISE NOTICE '⚡ Starting backfill of training metrics from conversation history...';

  -- 1) Ensure all users in conversations have a corresponding profile
  -- Prevents foreign key violations in case some profiles are missing.
  FOR conv IN 
    SELECT DISTINCT user_id 
    FROM public.conversations 
    WHERE user_id IS NOT NULL
  LOOP
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = conv.user_id) THEN
      INSERT INTO public.profiles (id, full_name, role, created_at, updated_at)
      VALUES (conv.user_id, 'Agente Gravity', 'user', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
      inserted_profiles := inserted_profiles + 1;
    END IF;
  END LOOP;
  
  IF inserted_profiles > 0 THEN
    RAISE NOTICE '👤 Created % default profiles for users that lacked them.', inserted_profiles;
  END IF;

  -- 2) Reconstruct training sessions and closer usage per conversation
  FOR conv IN 
    SELECT id, user_id, COALESCE(created_at, NOW()) as created_at
    FROM public.conversations
    WHERE user_id IS NOT NULL
  LOOP
    -- Count total messages in this conversation
    SELECT count(*) INTO msg_count 
    FROM public.messages 
    WHERE conversation_id = conv.id;

    -- Skip empty conversations
    IF msg_count > 0 THEN
      -- Find session timestamps (messages.created_at is timestamp without time zone, so we cast to TIMESTAMPTZ)
      SELECT 
        MIN(created_at AT TIME ZONE 'America/Lima'), 
        MAX(created_at AT TIME ZONE 'America/Lima')
      INTO session_started, session_ended
      FROM public.messages
      WHERE conversation_id = conv.id;

      -- Safeguard against null timestamps
      session_started := COALESCE(session_started, conv.created_at AT TIME ZONE 'America/Lima');
      session_ended := COALESCE(session_ended, session_started);

      -- Calculate actual duration in seconds
      session_duration := EXTRACT(EPOCH FROM (session_ended - session_started))::integer;

      -- If the duration is extremely short (e.g. less than 10 seconds), estimate active reading/thinking 
      -- time based on the number of message exchanges (e.g., 30 seconds per message).
      session_duration := GREATEST(session_duration, msg_count * 30);

      -- Insert or update training session
      INSERT INTO public.training_sessions (id, user_id, started_at, ended_at, duration_sec, channel, difficulty, created_at)
      VALUES (
        conv.id, -- Using conversation ID as session ID to ensure idempotency (no duplicates if run multiple times)
        conv.user_id,
        session_started,
        session_ended,
        session_duration,
        'text',
        'normal',
        session_started
      )
      ON CONFLICT (id) DO UPDATE
      SET started_at = EXCLUDED.started_at,
          ended_at = EXCLUDED.ended_at,
          duration_sec = EXCLUDED.duration_sec;
          
      inserted_sessions := inserted_sessions + 1;

      -- 3) Analyze Response Times (How long it takes the user to reply to the AI Assistant)
      user_resp_time_sum := 0;
      user_resp_count := 0;
      last_assistant_time := NULL;

      FOR msg IN 
        SELECT role, created_at AT TIME ZONE 'America/Lima' as created_at
        FROM public.messages 
        WHERE conversation_id = conv.id 
        ORDER BY created_at ASC
      LOOP
        IF msg.role = 'assistant' THEN
          last_assistant_time := msg.created_at;
        ELSIF msg.role = 'user' AND last_assistant_time IS NOT NULL THEN
          user_resp_time_sum := user_resp_time_sum + EXTRACT(EPOCH FROM (msg.created_at - last_assistant_time));
          user_resp_count := user_resp_count + 1;
          last_assistant_time := NULL; -- Reset for next pair
        END IF;
      END LOOP;

      -- 4) Grade performance score based on average user response times
      calc_score := 85; -- Default realistic score
      IF user_resp_count > 0 THEN
        avg_user_resp_sec := user_resp_time_sum / user_resp_count;
        
        -- High engagement/quick reply: under 45 seconds -> score 90-100
        IF avg_user_resp_sec < 45 THEN
          calc_score := 90 + LEAST(10, FLOOR((45 - avg_user_resp_sec) / 4.5)::integer);
        -- Normal dialogue pacing: under 3 minutes (180s) -> score 80-89
        ELSIF avg_user_resp_sec < 180 THEN
          calc_score := 80 + FLOOR((180 - avg_user_resp_sec) / 13.5)::integer;
        -- Slow dialogue pacing: over 3 minutes -> score 60-79
        ELSE
          calc_score := GREATEST(60, 80 - FLOOR((avg_user_resp_sec - 180) / 60.0)::integer);
        END IF;
      END IF;

      -- 5) Intelligently classify closer technique based on conversation keywords
      est_framework := 'CloserElite';
      est_technique := 'Manejo de Objeciones'; -- Default technique

      IF EXISTS (
        SELECT 1 FROM public.messages 
        WHERE conversation_id = conv.id 
          AND (lower(content) LIKE '%cierre%' OR lower(content) LIKE '%precio%' OR lower(content) LIKE '%descuento%' OR lower(content) LIKE '%costo%')
      ) THEN
        est_technique := 'Cierre de Ventas';
      ELSIF EXISTS (
        SELECT 1 FROM public.messages 
        WHERE conversation_id = conv.id 
          AND (lower(content) LIKE '%repaso%' OR lower(content) LIKE '%presentacion%' OR lower(content) LIKE '%producto%' OR lower(content) LIKE '%beneficio%')
      ) THEN
        est_technique := 'Presentación Efectiva';
      ELSIF EXISTS (
        SELECT 1 FROM public.messages 
        WHERE conversation_id = conv.id 
          AND (lower(content) LIKE '%pregunta%' OR lower(content) LIKE '%indagar%' OR lower(content) LIKE '%necesidad%' OR lower(content) LIKE '%por que%')
      ) THEN
        est_technique := 'Indagación de Necesidades';
      END IF;

      -- Insert or update closer usage record
      INSERT INTO public.closer_usage (id, user_id, session_id, framework, technique, score, created_at)
      VALUES (
        conv.id, -- Unique UUID derived from conversation
        conv.user_id,
        conv.id, -- references training_sessions.id
        est_framework,
        est_technique,
        calc_score,
        session_ended
      )
      ON CONFLICT (id) DO UPDATE
      SET score = EXCLUDED.score,
          framework = EXCLUDED.framework,
          technique = EXCLUDED.technique;
          
      inserted_closers := inserted_closers + 1;

    END IF;
  END LOOP;

  RAISE NOTICE '📈 Reconstructed % training sessions and % closer usage details.', inserted_sessions, inserted_closers;

  -- 6) Recalculate daily_metrics cache table for all users (using the function from the migration)
  RAISE NOTICE '🔄 Recalculating public.daily_metrics cache...';
  PERFORM public.recalculate_daily_metrics();
  
  RAISE NOTICE '✅ Done! Historical data backfilled successfully.';
END $$;
