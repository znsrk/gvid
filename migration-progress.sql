-- ============================================
-- MIGRATION: Progress Tracking
-- Safe to run multiple times (idempotent)
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Add times_played to matching_games (was missing)
ALTER TABLE matching_games
  ADD COLUMN IF NOT EXISTS times_played INTEGER DEFAULT 0;

-- 2. Add updated_at to flashcard_decks for "last studied" tracking
ALTER TABLE flashcard_decks
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. Add updated_at trigger for flashcard_decks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_flashcard_decks_updated_at'
  ) THEN
    CREATE TRIGGER update_flashcard_decks_updated_at
      BEFORE UPDATE ON flashcard_decks
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- 4. Add quiz completion tracking columns (score, completed already exist from schema,
--    but ensure they have proper defaults)
-- These columns already exist in the schema, this is a safety net:
DO $$
BEGIN
  -- completed column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'completed'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN completed BOOLEAN DEFAULT FALSE;
  END IF;

  -- score column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'score'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN score INTEGER;
  END IF;

  -- total_questions column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'total_questions'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN total_questions INTEGER;
  END IF;

  -- best_score for quizzes (new - track best attempt)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'best_score'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN best_score INTEGER;
  END IF;

  -- times_taken for quizzes (new - how many times attempted)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'quizzes' AND column_name = 'times_taken'
  ) THEN
    ALTER TABLE quizzes ADD COLUMN times_taken INTEGER DEFAULT 0;
  END IF;
END
$$;

-- 5. Add updated_at to matching_games
ALTER TABLE matching_games
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 6. Add updated_at trigger for matching_games
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_matching_games_updated_at'
  ) THEN
    CREATE TRIGGER update_matching_games_updated_at
      BEFORE UPDATE ON matching_games
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;

-- 7. Add updated_at to quizzes
ALTER TABLE quizzes
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 8. Add updated_at trigger for quizzes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_quizzes_updated_at'
  ) THEN
    CREATE TRIGGER update_quizzes_updated_at
      BEFORE UPDATE ON quizzes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END
$$;
