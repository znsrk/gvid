-- ============================================
-- OqyPlus Database Schema for Supabase
-- Run this in your Supabase SQL Editor
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- COURSES TABLE (Roadmaps)
-- ============================================
CREATE TABLE IF NOT EXISTS courses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  steps JSONB DEFAULT '[]'::jsonb,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_courses_created_at ON courses(created_at DESC);

-- ============================================
-- FLASHCARD DECKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS flashcard_decks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  flashcards JSONB DEFAULT '[]'::jsonb,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_created_at ON flashcard_decks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_flashcard_decks_course_id ON flashcard_decks(course_id);

-- ============================================
-- QUIZZES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS quizzes (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  questions JSONB DEFAULT '[]'::jsonb,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  step_id TEXT,
  completed BOOLEAN DEFAULT FALSE,
  score INTEGER,
  total_questions INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_quizzes_created_at ON quizzes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quizzes_course_id ON quizzes(course_id);
CREATE INDEX IF NOT EXISTS idx_quizzes_step_id ON quizzes(step_id);

-- ============================================
-- MATCHING GAMES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS matching_games (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  pairs JSONB DEFAULT '[]'::jsonb,
  course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
  step_id TEXT,
  best_time INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_matching_games_created_at ON matching_games(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_matching_games_course_id ON matching_games(course_id);

-- ============================================
-- ROW LEVEL SECURITY (Optional but recommended)
-- Enable if you want user-specific data later
-- ============================================

-- For now, allow all operations (public access)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE flashcard_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_games ENABLE ROW LEVEL SECURITY;

-- Public access policies (anyone can read/write)
CREATE POLICY "Allow public access to courses" ON courses FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to flashcard_decks" ON flashcard_decks FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to quizzes" ON quizzes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to matching_games" ON matching_games FOR ALL USING (true) WITH CHECK (true);

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
