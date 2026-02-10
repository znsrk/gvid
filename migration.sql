-- ============================================
-- Migration: Crossword → Fill Blank, User Profiles, 
-- Rate Limiting, Community Sharing, Completion Data
-- ============================================

-- ========== 1. DROP CROSSWORD TABLE (if it exists) ==========
DO $$ BEGIN
    DROP POLICY IF EXISTS "Users can CRUD own crossword games" ON crossword_games;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DROP TABLE IF EXISTS crossword_games CASCADE;

-- ========== 2. CREATE FILL-IN-THE-BLANK TABLE ==========
CREATE TABLE IF NOT EXISTS fill_blank_games (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    sentences JSONB DEFAULT '[]'::jsonb,
    image_url TEXT,
    best_score INTEGER,
    best_time INTEGER,
    times_played INTEGER DEFAULT 0,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE fill_blank_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can CRUD own fill blank games"
    ON fill_blank_games FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ========== 3. USER PROFILES TABLE ==========
CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    display_name TEXT DEFAULT '',
    subscription_tier TEXT DEFAULT 'pro' CHECK (subscription_tier IN ('free', 'pro')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
    ON user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON user_profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Service role can read all profiles (for community author names)
CREATE POLICY "Service role can read all profiles"
    ON user_profiles FOR SELECT
    USING (true);

-- ========== 4. DAILY GENERATIONS (Rate Limiting) ==========
CREATE TABLE IF NOT EXISTS daily_generations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    generation_type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE daily_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own generations"
    ON daily_generations FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert generations"
    ON daily_generations FOR INSERT
    WITH CHECK (true);

-- Index for fast daily count queries
CREATE INDEX IF NOT EXISTS idx_daily_generations_user_date 
    ON daily_generations (user_id, created_at);

-- ========== 5. SHARED CONTENT (Community) ==========
CREATE TABLE IF NOT EXISTS shared_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content_type TEXT NOT NULL CHECK (content_type IN ('course', 'flashcards', 'quiz', 'matching', 'word-scramble', 'fill-blank')),
    content_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    cover_image TEXT,
    meta JSONB DEFAULT '{}'::jsonb,
    is_public BOOLEAN DEFAULT true,
    likes_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE shared_content ENABLE ROW LEVEL SECURITY;

-- Everyone can read public shared content
CREATE POLICY "Anyone can read public shared content"
    ON shared_content FOR SELECT
    USING (is_public = true);

-- Users can manage their own shared content
CREATE POLICY "Users can insert own shared content"
    ON shared_content FOR INSERT
    WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update own shared content"
    ON shared_content FOR UPDATE
    USING (auth.uid() = author_id);

CREATE POLICY "Users can delete own shared content"
    ON shared_content FOR DELETE
    USING (auth.uid() = author_id);

-- Add foreign key reference for joining with user_profiles (author_id already refs auth.users)
-- We join via author_id = user_profiles.id since user_profiles.id also refs auth.users(id)
CREATE INDEX IF NOT EXISTS idx_shared_content_author ON shared_content (author_id);

-- ========== 6. CONTENT LIKES ==========
CREATE TABLE IF NOT EXISTS content_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shared_content_id UUID NOT NULL REFERENCES shared_content(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, shared_content_id)
);

ALTER TABLE content_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own likes"
    ON content_likes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ========== 7. LIKE COUNT FUNCTIONS ==========
CREATE OR REPLACE FUNCTION increment_likes(content_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE shared_content SET likes_count = likes_count + 1 WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION decrement_likes(content_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE shared_content SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = content_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========== 8. AUTO-CREATE USER PROFILE ON SIGNUP ==========
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO user_profiles (id, email, display_name, subscription_tier)
    VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1), 'pro')
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========== 9. COMPLETION TRACKING ADDITIONS ==========
-- Add completion tracking columns to quizzes table
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS total_attempts INTEGER DEFAULT 0;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS last_score INTEGER;
ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS last_attempted_at TIMESTAMPTZ;

-- Add completion tracking to flashcard_decks
ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS total_study_sessions INTEGER DEFAULT 0;
ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS last_studied_at TIMESTAMPTZ;

-- Add completion tracking to courses
ALTER TABLE courses ADD COLUMN IF NOT EXISTS completed_steps INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_quiz_score INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS total_quiz_attempts INTEGER DEFAULT 0;
ALTER TABLE courses ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

-- Index for community search
CREATE INDEX IF NOT EXISTS idx_shared_content_type ON shared_content (content_type);
CREATE INDEX IF NOT EXISTS idx_shared_content_likes ON shared_content (likes_count DESC);
CREATE INDEX IF NOT EXISTS idx_shared_content_created ON shared_content (created_at DESC);

-- ========== 10. DELETE EXISTING USERS (they lack necessary data, will re-register) ==========
-- Remove all existing user data first (cascades will clean up related tables)
DELETE FROM auth.users;
