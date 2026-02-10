-- ============================================
-- gvidtech Database Schema for Supabase
-- With user authentication & Row Level Security
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COURSES TABLE (Roadmaps)
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  progress INTEGER DEFAULT 0,
  original_prompt TEXT,
  original_materials TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);

-- ============================================
-- FLASHCARD DECKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  flashcards JSONB DEFAULT '[]'::jsonb,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_flashcard_decks_user_id ON flashcard_decks(user_id);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_created_at ON flashcard_decks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_course_id ON flashcard_decks(course_id);

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  questions JSONB DEFAULT '[]'::jsonb,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  step_id TEXT,
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER,
  total_questions INTEGER,
  best_score INTEGER,
  times_taken INTEGER DEFAULT 0,
  is_rapid BOOLEAN DEFAULT FALSE,
  time_per_question INTEGER,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quizzes_user_id ON quizzes(user_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);

-- ============================================
-- MATCHING GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS matching_games (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  pairs JSONB DEFAULT '[]'::jsonb,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  step_id TEXT,
  best_time INTEGER,
  times_played INTEGER DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matching_games_user_id ON matching_games(user_id);
CREATE INDEX IF NOT EXISTS idx_matching_games_created_at ON matching_games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matching_games_course_id ON matching_games(course_id);

-- ============================================
-- WORD SCRAMBLE GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS word_scramble_games (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  words JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  best_score INTEGER,
  times_played INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_word_scramble_games_user_id ON word_scramble_games(user_id);
CREATE INDEX IF NOT EXISTS idx_word_scramble_games_created_at ON word_scramble_games(created_at DESC);

-- ============================================
-- CROSSWORD GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS crossword_games (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  clues JSONB DEFAULT '[]'::jsonb,
  grid_size INTEGER DEFAULT 15,
  image_url TEXT,
  best_time INTEGER,
  times_played INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_crossword_games_user_id ON crossword_games(user_id);
CREATE INDEX IF NOT EXISTS idx_crossword_games_created_at ON crossword_games(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY
-- Users can only access their own data
-- ============================================

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE word_scramble_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE crossword_games ENABLE ROW LEVEL SECURITY;

-- Courses policies
CREATE POLICY "Users can view own courses" ON courses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own courses" ON courses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON courses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own courses" ON courses
  FOR DELETE USING (auth.uid() = user_id);
-- Service role bypass (for server-side operations)
CREATE POLICY "Service role full access to courses" ON courses
  FOR ALL USING (auth.role() = 'service_role');

-- Flashcard decks policies
CREATE POLICY "Users can view own flashcard_decks" ON flashcard_decks
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own flashcard_decks" ON flashcard_decks
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own flashcard_decks" ON flashcard_decks
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own flashcard_decks" ON flashcard_decks
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to flashcard_decks" ON flashcard_decks
  FOR ALL USING (auth.role() = 'service_role');

-- Quizzes policies
CREATE POLICY "Users can view own quizzes" ON quizzes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own quizzes" ON quizzes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own quizzes" ON quizzes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own quizzes" ON quizzes
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to quizzes" ON quizzes
  FOR ALL USING (auth.role() = 'service_role');

-- Matching games policies
CREATE POLICY "Users can view own matching_games" ON matching_games
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own matching_games" ON matching_games
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own matching_games" ON matching_games
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own matching_games" ON matching_games
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to matching_games" ON matching_games
  FOR ALL USING (auth.role() = 'service_role');

-- Word scramble games policies
CREATE POLICY "Users can view own word_scramble_games" ON word_scramble_games
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own word_scramble_games" ON word_scramble_games
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own word_scramble_games" ON word_scramble_games
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own word_scramble_games" ON word_scramble_games
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to word_scramble_games" ON word_scramble_games
  FOR ALL USING (auth.role() = 'service_role');

-- Crossword games policies
CREATE POLICY "Users can view own crossword_games" ON crossword_games
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own crossword_games" ON crossword_games
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own crossword_games" ON crossword_games
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own crossword_games" ON crossword_games
  FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Service role full access to crossword_games" ON crossword_games
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_courses_updated_at
  BEFORE UPDATE ON courses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_flashcard_decks_updated_at
  BEFORE UPDATE ON flashcard_decks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON quizzes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matching_games_updated_at
  BEFORE UPDATE ON matching_games
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
