import { Router } from 'express'
import { supabaseAdmin } from '../../utils/supabase-admin.js'
import { asyncHandler, sendData } from '../../utils/http.js'
import { AppError } from '../../utils/http.js'
import { isColumnMissing } from '../../utils/supabase-errors.js'
import { generateRecommendations } from '../../services/openai.service.js'
import { withTimeout } from '../../utils/timeout.js'

export const recommendationRouter = Router()

const FULL = 'id,job_title,match_score,rationale,recommended_skills,summary,roadmap,icon,created_at'
const CORE = 'id,job_title,match_score,rationale,recommended_skills,created_at'

// migration 002 adds summary/roadmap/icon to career_recommendations; if the
// columns are missing we fall back to the core fields so the page still loads.
async function queryRecs(builder, userId) {
  const { data, error } = await withTimeout(builder(FULL), 6000)
  if (!error) return data
  if (!isColumnMissing(error, 'summary')) throw error
  const { data: core, error: coreErr } = await withTimeout(builder(CORE), 6000)
  if (coreErr) throw coreErr
  return core
}

async function insertRec(userId, rec) {
  const base = {
    user_id: userId,
    job_title: rec.jobTitle,
    match_score: rec.matchScore,
    rationale: rec.rationale,
    recommended_skills: rec.recommendedSkills || [],
  }
  const withMeta = { ...base, summary: rec.summary, roadmap: rec.roadmap || [], icon: rec.icon || 'chart' }
  let { error } = await withTimeout(supabaseAdmin.from('career_recommendations').insert(withMeta), 6000)
  if (error && isColumnMissing(error, 'summary')) {
    ;({ error } = await withTimeout(supabaseAdmin.from('career_recommendations').insert(base), 6000))
  }
  if (error) console.warn('Could not save a career recommendation:', error.message)
}

async function ensureRecommendations(userId) {
  const { data: resume } = await withTimeout(supabaseAdmin.from('resumes')
    .select('extracted_text')
    .eq('user_id', userId)
    .eq('is_primary', true)
    .maybeSingle(), 6000)

  // Use the most recent completed interview as a hint for the target role so
  // career paths always reflect what the candidate is actually practising.
  const { data: latestSession } = await withTimeout(supabaseAdmin.from('interview_sessions')
    .select('target_role')
    .eq('user_id', userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
    .limit(1)
    .maybeSingle(), 6000)

  const targetRole = latestSession?.target_role || null
  const resumeText = resume?.extracted_text || ''
  const recs = await generateRecommendations({ resumeText, targetRole })
  if (!recs.length) return false
  for (const r of recs) await insertRec(userId, r)
  return true
}

recommendationRouter.get('/', asyncHandler(async (req, res) => {
  let rows = await queryRecs((cols) => supabaseAdmin.from('career_recommendations')
    .select(cols)
    .eq('user_id', req.session.userId)
    .order('match_score', { ascending: false })
    .order('created_at', { ascending: false }), req.session.userId)
  if (!rows || rows.length === 0) {
    try {
      await ensureRecommendations(req.session.userId)
      rows = await queryRecs((cols) => supabaseAdmin.from('career_recommendations')
        .select(cols)
        .eq('user_id', req.session.userId)
        .order('match_score', { ascending: false })
        .order('created_at', { ascending: false }), req.session.userId)
    } catch (err) {
      console.warn('Could not prepare recommendations on first load:', err.message)
    }
  }
  sendData(res, rows || [])
}))

recommendationRouter.get('/:id', asyncHandler(async (req, res) => {
  const rows = await queryRecs((cols) => supabaseAdmin.from('career_recommendations')
    .select(cols)
    .eq('id', req.params.id)
    .eq('user_id', req.session.userId)
    .maybeSingle(), req.session.userId)
  const row = Array.isArray(rows) ? rows[0] : rows
  if (!row) throw new AppError(404, 'Recommendation not found.')
  sendData(res, row)
}))
