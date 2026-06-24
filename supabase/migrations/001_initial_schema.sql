-- ============================================================
-- AIO Study — Initial Schema
-- Execute no SQL Editor do Supabase (Dashboard → SQL Editor)
-- ============================================================

-- ---------------------------------------------------------
-- 0. Extensões
-- ---------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------
-- 1. Helper: updated_at automático
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ---------------------------------------------------------
-- 2. PROFILES (extensão de auth.users)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT,
  course       TEXT,
  semester     TEXT,
  avatar_url   TEXT,
  weekly_goal_hours NUMERIC(4,1) DEFAULT 20 CHECK (weekly_goal_hours > 0),
  created_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Auto-cria perfil ao cadastrar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Não bloqueia o cadastro se a criação do perfil falhar
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ---------------------------------------------------------
-- 3. SUBJECTS (Matérias)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS subjects (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  weight          SMALLINT DEFAULT 3 CHECK (weight BETWEEN 1 AND 5),
  color           TEXT DEFAULT '#6366f1',
  allocated_hours NUMERIC(5,1) DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at      TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_subjects_user_id ON subjects(user_id);

CREATE TRIGGER trg_subjects_updated_at
  BEFORE UPDATE ON subjects
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ---------------------------------------------------------
-- 4. STUDY_SESSIONS (Sessões de foco)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS study_sessions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id       UUID REFERENCES subjects(id) ON DELETE SET NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds > 0),
  mode             TEXT DEFAULT 'stopwatch' CHECK (mode IN ('pomodoro', 'stopwatch')),
  completed_at     TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_study_sessions_user_id ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_completed_at ON study_sessions(completed_at DESC);

-- ---------------------------------------------------------
-- 5. EVENTS (Agenda)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id  UUID REFERENCES subjects(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  description TEXT,
  start_time  TIMESTAMPTZ NOT NULL,
  end_time    TIMESTAMPTZ NOT NULL,
  type        TEXT DEFAULT 'study' CHECK (type IN ('study', 'exam', 'assignment', 'other')),
  all_day     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  CONSTRAINT events_end_after_start CHECK (end_time > start_time)
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_start_time ON events(start_time);

-- ---------------------------------------------------------
-- 6. NOTE_FOLDERS (Pastas de cadernos)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS note_folders (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  parent_id  UUID REFERENCES note_folders(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_note_folders_user_id ON note_folders(user_id);

-- ---------------------------------------------------------
-- 7. NOTES (Anotações)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS notes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  folder_id  UUID REFERENCES note_folders(id) ON DELETE SET NULL,
  title      TEXT NOT NULL DEFAULT 'Nova Anotação',
  content    JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_notes_folder_id ON notes(folder_id);
CREATE INDEX idx_notes_updated_at ON notes(updated_at DESC);

CREATE TRIGGER trg_notes_updated_at
  BEFORE UPDATE ON notes
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- ---------------------------------------------------------
-- 8. GLOSSARY (Glossário)
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS glossary (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  term       TEXT NOT NULL,
  definition TEXT NOT NULL,
  language   TEXT DEFAULT 'PT',
  tags       TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_glossary_user_id ON glossary(user_id);
CREATE INDEX idx_glossary_term ON glossary USING GIN (to_tsvector('portuguese', term || ' ' || definition));

-- ---------------------------------------------------------
-- 9. ROW LEVEL SECURITY
-- ---------------------------------------------------------

-- Ativar RLS
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_sessions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE events          ENABLE ROW LEVEL SECURITY;
ALTER TABLE note_folders    ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE glossary        ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Subjects
CREATE POLICY "subjects_select_own" ON subjects FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subjects_insert_own" ON subjects FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subjects_update_own" ON subjects FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "subjects_delete_own" ON subjects FOR DELETE USING (auth.uid() = user_id);

-- Study Sessions
CREATE POLICY "sessions_select_own" ON study_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON study_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON study_sessions FOR DELETE USING (auth.uid() = user_id);

-- Events
CREATE POLICY "events_select_own" ON events FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "events_insert_own" ON events FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "events_update_own" ON events FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "events_delete_own" ON events FOR DELETE USING (auth.uid() = user_id);

-- Note Folders
CREATE POLICY "folders_select_own" ON note_folders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "folders_insert_own" ON note_folders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "folders_update_own" ON note_folders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "folders_delete_own" ON note_folders FOR DELETE USING (auth.uid() = user_id);

-- Notes
CREATE POLICY "notes_select_own" ON notes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notes_insert_own" ON notes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "notes_update_own" ON notes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notes_delete_own" ON notes FOR DELETE USING (auth.uid() = user_id);

-- Glossary
CREATE POLICY "glossary_select_own" ON glossary FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "glossary_insert_own" ON glossary FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "glossary_update_own" ON glossary FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "glossary_delete_own" ON glossary FOR DELETE USING (auth.uid() = user_id);
