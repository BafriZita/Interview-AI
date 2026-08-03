CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(190) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  email_verified_at TIMESTAMP NULL,
  status ENUM('active','disabled') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS profiles (
  user_id BIGINT UNSIGNED PRIMARY KEY,
  phone VARCHAR(30), university VARCHAR(160), degree VARCHAR(160),
  bio TEXT, preferred_job_role VARCHAR(160), profile_image_url VARCHAR(500),
  onboarding_step TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS user_skills (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL, proficiency ENUM('beginner','intermediate','advanced') DEFAULT 'intermediate',
  UNIQUE KEY uq_user_skill (user_id,name),
  CONSTRAINT fk_skills_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resumes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
  original_name VARCHAR(255) NOT NULL, stored_name VARCHAR(255) NOT NULL, mime_type VARCHAR(120) NOT NULL,
  file_size INT UNSIGNED NOT NULL, extracted_text LONGTEXT, strength_score TINYINT UNSIGNED,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE, status ENUM('uploaded','processing','ready','failed') NOT NULL DEFAULT 'uploaded',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_resumes_user_created (user_id,created_at),
  CONSTRAINT fk_resumes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resume_insights (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, resume_id BIGINT UNSIGNED NOT NULL,
  category ENUM('skill','experience','education','project','certification','technology','suggestion') NOT NULL,
  title VARCHAR(255) NOT NULL, description TEXT, metadata JSON, sort_order SMALLINT UNSIGNED DEFAULT 0,
  CONSTRAINT fk_insights_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_descriptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
  job_title VARCHAR(180) NOT NULL, company_name VARCHAR(180), source ENUM('paste','upload') NOT NULL DEFAULT 'paste',
  original_text LONGTEXT NOT NULL, experience_level VARCHAR(80), employment_type VARCHAR(80), location VARCHAR(160),
  status ENUM('draft','analysed','archived') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_jobs_user_created (user_id,created_at),
  CONSTRAINT fk_jobs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS job_requirements (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, job_description_id BIGINT UNSIGNED NOT NULL,
  category ENUM('skill','responsibility','keyword','technology','soft_skill','expectation') NOT NULL,
  value VARCHAR(500) NOT NULL, required BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_requirements_job FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS resume_job_matches (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
  resume_id BIGINT UNSIGNED NOT NULL, job_description_id BIGINT UNSIGNED NOT NULL,
  overall_score TINYINT UNSIGNED NOT NULL, skills_score TINYINT UNSIGNED, experience_score TINYINT UNSIGNED,
  education_score TINYINT UNSIGNED, keywords_score TINYINT UNSIGNED, strong_skills JSON, missing_skills JSON,
  recommendations JSON, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_matches_user_created (user_id,created_at),
  CONSTRAINT fk_matches_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE CASCADE,
  CONSTRAINT fk_matches_job FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS interview_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
  resume_id BIGINT UNSIGNED, job_description_id BIGINT UNSIGNED, target_role VARCHAR(180) NOT NULL,
  interview_type ENUM('hr','behavioral','technical','situational','problem_solving','mixed') NOT NULL DEFAULT 'mixed',
  status ENUM('planned','in_progress','completed','abandoned') NOT NULL DEFAULT 'planned',
  current_question SMALLINT UNSIGNED NOT NULL DEFAULT 0, overall_score TINYINT UNSIGNED,
  started_at TIMESTAMP NULL, completed_at TIMESTAMP NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_interviews_user_created (user_id,created_at),
  CONSTRAINT fk_interviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_interviews_resume FOREIGN KEY (resume_id) REFERENCES resumes(id) ON DELETE SET NULL,
  CONSTRAINT fk_interviews_job FOREIGN KEY (job_description_id) REFERENCES job_descriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS interview_questions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, interview_session_id BIGINT UNSIGNED NOT NULL,
  question_type ENUM('hr','behavioral','technical','situational','problem_solving') NOT NULL,
  question_text TEXT NOT NULL, sort_order SMALLINT UNSIGNED NOT NULL, source ENUM('question_bank','ai') NOT NULL DEFAULT 'question_bank',
  UNIQUE KEY uq_session_order (interview_session_id,sort_order),
  CONSTRAINT fk_questions_session FOREIGN KEY (interview_session_id) REFERENCES interview_sessions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS interview_answers (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, question_id BIGINT UNSIGNED NOT NULL,
  answer_text LONGTEXT, audio_path VARCHAR(500), duration_seconds INT UNSIGNED,
  technical_score TINYINT UNSIGNED, confidence_score TINYINT UNSIGNED, communication_score TINYINT UNSIGNED,
  grammar_score TINYINT UNSIGNED, professionalism_score TINYINT UNSIGNED, completeness_score TINYINT UNSIGNED,
  overall_score TINYINT UNSIGNED, feedback TEXT, submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_question_answer (question_id),
  CONSTRAINT fk_answers_question FOREIGN KEY (question_id) REFERENCES interview_questions(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS career_recommendations (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
  job_title VARCHAR(180) NOT NULL, match_score TINYINT UNSIGNED, rationale TEXT,
  recommended_skills JSON, courses JSON, certifications JSON, roadmap JSON,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recommendations_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE, expires_at TIMESTAMP NOT NULL, used_at TIMESTAMP NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB;
