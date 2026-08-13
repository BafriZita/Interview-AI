import { supabaseAdmin } from '../lib/supabase.js'

const tables = [
  ['profiles', ['full_name', 'role']],
  ['user_skills', []],
  ['resumes', []],
  ['resume_insights', []],
  ['job_descriptions', []],
  ['job_requirements', []],
  ['resume_job_matches', []],
  ['interview_sessions', []],
  ['interview_questions', []],
  ['interview_answers', ['coach_hint']],
  ['session_reports', []],
  ['career_recommendations', ['roadmap', 'summary', 'icon']],
  ['notifications', []],
  ['user_sessions', []],
  ['migration_user_map', []],
]

for (const [table, extraCols] of tables) {
  try {
    const cols = ['id'].concat(extraCols).join(',')
    const { data, error } = await supabaseAdmin.from(table).select(cols).limit(1)
    if (error) {
      console.log(`[${table}] MISSING -> ${error.code}: ${error.message}`)
    } else {
      console.log(`[${table}] ok`)
    }
  } catch (err) {
    console.log(`[${table}] ERROR -> ${err.message}`)
  }
}
