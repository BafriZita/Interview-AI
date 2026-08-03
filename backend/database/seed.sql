INSERT IGNORE INTO users (id, full_name, email, password_hash) VALUES
  (1, 'Demo Candidate', 'demo@interviewai.cm', '$2b$12$DMl6bvnZrHbOlhdQdZEoS.A0lXrjIlprczeLzt5MwBiGPQiAPvAje');
INSERT IGNORE INTO profiles (user_id, university, degree, preferred_job_role, onboarding_step)
VALUES (1, 'University of Douala', 'BSc Computer Science', 'Frontend Developer', 3);
INSERT IGNORE INTO user_skills (user_id, name, proficiency) VALUES
  (1, 'React', 'advanced'), (1, 'JavaScript', 'advanced'), (1, 'Node.js', 'intermediate'), (1, 'MySQL', 'intermediate');
