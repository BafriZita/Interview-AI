-- Migration DDL for Supabase/Postgres

-- Create `profiles` linked to `auth.users`
CREATE TABLE IF NOT EXISTS profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  display_name text,
  phone text,
  university text,
  degree text,
  bio text,
  preferred_job_role text,
  profile_image_url text,
  onboarding_step smallint DEFAULT 0,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- User skills
CREATE TABLE IF NOT EXISTS user_skills (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  proficiency text DEFAULT 'intermediate',
  created_at timestamptz DEFAULT NOW()
);

-- Resumes
CREATE TABLE IF NOT EXISTS resumes (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_name text NOT NULL,
  stored_name text NOT NULL,
  mime_type text,
  file_size int,
  extracted_text text,
  strength_score smallint,
  is_primary boolean DEFAULT TRUE,
  status text DEFAULT 'uploaded',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Resume insights
CREATE TABLE IF NOT EXISTS resume_insights (
  id bigserial PRIMARY KEY,
  resume_id bigint NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  category text,
  title text,
  description text,
  metadata jsonb,
  sort_order smallint DEFAULT 0
);

-- Job descriptions
CREATE TABLE IF NOT EXISTS job_descriptions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title text NOT NULL,
  company_name text,
  source text DEFAULT 'paste',
  original_text text,
  experience_level text,
  employment_type text,
  location text,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT NOW(),
  updated_at timestamptz DEFAULT NOW()
);

-- Job requirements
CREATE TABLE IF NOT EXISTS job_requirements (
  id bigserial PRIMARY KEY,
  job_description_id bigint NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  category text,
  value text,
  required boolean DEFAULT TRUE
);

-- Resume job matches
CREATE TABLE IF NOT EXISTS resume_job_matches (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id bigint NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  job_description_id bigint NOT NULL REFERENCES job_descriptions(id) ON DELETE CASCADE,
  overall_score smallint,
  scores jsonb,
  recommendations jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Interview sessions
CREATE TABLE IF NOT EXISTS interview_sessions (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id bigint REFERENCES resumes(id) ON DELETE SET NULL,
  job_description_id bigint REFERENCES job_descriptions(id) ON DELETE SET NULL,
  target_role text,
  interview_type text DEFAULT 'mixed',
  status text DEFAULT 'planned',
  current_question smallint DEFAULT 0,
  overall_score smallint,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz DEFAULT NOW()
);

-- Interview questions
CREATE TABLE IF NOT EXISTS interview_questions (
  id bigserial PRIMARY KEY,
  interview_session_id bigint NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  question_type text,
  question_text text,
  sort_order smallint,
  source text DEFAULT 'question_bank'
);

-- Interview answers
CREATE TABLE IF NOT EXISTS interview_answers (
  id bigserial PRIMARY KEY,
  question_id bigint NOT NULL REFERENCES interview_questions(id) ON DELETE CASCADE,
  answer_text text,
  audio_path text,
  duration_seconds int,
  scores jsonb,
  overall_score smallint,
  feedback text,
  submitted_at timestamptz DEFAULT NOW()
);

-- Career recommendations
CREATE TABLE IF NOT EXISTS career_recommendations (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_title text,
  match_score smallint,
  rationale text,
  recommended_skills jsonb,
  created_at timestamptz DEFAULT NOW()
);

-- Migration mapping (temporary): map old MySQL numeric user_id -> new Supabase uuid
CREATE TABLE IF NOT EXISTS migration_user_map (
  old_user_id bigint PRIMARY KEY,
  new_user_id uuid NOT NULL,
  migrated_at timestamptz DEFAULT NOW()
);

-- Express session store (backed by Supabase PostgREST)
CREATE TABLE IF NOT EXISTS user_sessions (
  sid text PRIMARY KEY,
  sess jsonb NOT NULL DEFAULT '{}'::jsonb,
  expire timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS user_sessions_expire_idx ON user_sessions (expire);

-- Enables idempotent upsert of interview answers per question
CREATE UNIQUE INDEX IF NOT EXISTS interview_answers_question_id_key ON interview_answers (question_id);
