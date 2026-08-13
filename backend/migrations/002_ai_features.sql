-- Migration 002: AI features, roles, notifications, stored reports

-- User role: job_seeker | student
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'job_seeker';

-- AI coach hint per answer (live analysis)
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS coach_hint text;
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS scores jsonb;
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS feedback text;
ALTER TABLE interview_answers ADD COLUMN IF NOT EXISTS overall_score smallint;

-- Session-level honest report generated at completion
CREATE TABLE IF NOT EXISTS session_reports (
  id bigserial PRIMARY KEY,
  interview_session_id bigint NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text,
  overall_score smallint,
  strengths jsonb,
  improvements jsonb,
  solutions jsonb,
  skill_scores jsonb,
  created_at timestamptz DEFAULT NOW(),
  UNIQUE (interview_session_id)
);

-- Notifications center
CREATE TABLE IF NOT EXISTS notifications (
  id bigserial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text,
  type text DEFAULT 'general',
  read boolean DEFAULT FALSE,
  created_at timestamptz DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications (user_id, created_at DESC);

-- Career path roadmap detail (explore a path)
ALTER TABLE career_recommendations ADD COLUMN IF NOT EXISTS roadmap jsonb;
ALTER TABLE career_recommendations ADD COLUMN IF NOT EXISTS icon text DEFAULT 'chart';
ALTER TABLE career_recommendations ADD COLUMN IF NOT EXISTS summary text;
