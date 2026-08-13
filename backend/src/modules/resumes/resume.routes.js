import fs from 'node:fs/promises'
import { Router } from 'express'
import { supabaseAdmin } from '../../utils/supabase-admin.js'
import { resumeUpload } from '../../middleware/upload.js'
import { AppError, asyncHandler, sendData } from '../../utils/http.js'
import { extractDocumentText } from '../../services/document-parser.service.js'
import { analyseResume, generateRecommendations, aiConfigured } from '../../services/openai.service.js'
import { createNotification } from '../notifications/notifications.helper.js'
import { isColumnMissing } from '../../utils/supabase-errors.js'
import { withTimeout } from '../../utils/timeout.js'
export const resumeRouter = Router()

resumeRouter.get('/', asyncHandler(async (req, res) => {
  const { data: rows, error } = await withTimeout(supabaseAdmin.from('resumes').select('id,original_name,mime_type,file_size,strength_score,is_primary,status,created_at').eq('user_id', req.session.userId).order('created_at', { ascending: false }), 6000)
  if (error) throw error
  sendData(res, rows || [])
}))

resumeRouter.post('/', resumeUpload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'Choose a resume to upload.')
  let text = ''; let status = 'ready'
  try { text = await extractDocumentText(req.file) } catch { status = 'failed' }

  let strengthScore = null
  let suggestions = []
  if (status === 'ready' && text) {
    const analysis = await analyseResume({ resumeText: text, originalName: req.file.originalname })
    strengthScore = analysis.strengthScore
    suggestions = analysis.suggestions || []
  }

  await withTimeout(supabaseAdmin.from('resumes').update({ is_primary: false }).eq('user_id', req.session.userId), 6000)
  const { data: result, error } = await withTimeout(supabaseAdmin.from('resumes').insert({
    user_id: req.session.userId,
    original_name: req.file.originalname,
    stored_name: req.file.filename,
    mime_type: req.file.mimetype,
    file_size: req.file.size,
    extracted_text: text,
    strength_score: strengthScore,
    is_primary: true,
    status,
  }).select('id').single(), 6000)
  if (error) throw error

  if (suggestions.length) {
    for (const [i, s] of suggestions.entries()) {
      await withTimeout(supabaseAdmin.from('resume_insights').insert({
        resume_id: result.id,
        category: 'suggestion',
        title: s.title,
        description: s.description,
        metadata: { priority: s.priority },
        sort_order: i + 1,
      }), 6000)
    }
  }

  if (status === 'ready' && text) {
    const recs = await generateRecommendations({ resumeText: text })
    for (const r of recs) {
      const base = {
        user_id: req.session.userId,
        job_title: r.jobTitle,
        match_score: r.matchScore,
        rationale: r.rationale,
        recommended_skills: r.recommendedSkills,
      }
      const withMeta = { ...base, summary: r.summary, roadmap: r.roadmap, icon: r.icon }
      let { error: recErr } = await withTimeout(supabaseAdmin.from('career_recommendations').insert(withMeta), 6000)
      if (recErr && isColumnMissing(recErr, 'summary')) {
        ;({ error: recErr } = await withTimeout(supabaseAdmin.from('career_recommendations').insert(base), 6000))
      }
      if (recErr) console.warn('Could not save a career recommendation:', recErr.message)
    }
    await createNotification(req.session.userId, {
      title: 'Resume analysed',
      body: `We analysed ${req.file.originalname} and prepared your career recommendations.`,
      type: 'resume',
    })
  } else {
    await createNotification(req.session.userId, {
      title: 'Resume uploaded',
      body: `We could not fully read ${req.file.originalname}. Try a PDF or DOCX file.`,
      type: 'resume',
    })
  }

  sendData(res, {
    id: result.id,
    originalName: req.file.originalname,
    status,
    strengthScore,
    aiEnabled: aiConfigured,
  }, 201)
}))

resumeRouter.get('/:id', asyncHandler(async (req, res) => {
  const { data: row, error } = await withTimeout(supabaseAdmin.from('resumes').select('id,original_name,mime_type,file_size,strength_score,status,created_at').eq('id', req.params.id).eq('user_id', req.session.userId).maybeSingle(), 6000)
  if (error) throw error
  if (!row) throw new AppError(404, 'Resume not found.')
  const { data: insights } = await withTimeout(supabaseAdmin.from('resume_insights').select('category,title,description,metadata').eq('resume_id', req.params.id).order('sort_order'), 6000)
  sendData(res, { ...row, insights: insights || [] })
}))

resumeRouter.delete('/:id', asyncHandler(async (req, res) => {
  const { data: row, error } = await withTimeout(supabaseAdmin.from('resumes').select('stored_name').eq('id', req.params.id).eq('user_id', req.session.userId).maybeSingle(), 6000)
  if (error) throw error
  if (!row) throw new AppError(404, 'Resume not found.')
  const { error: delErr } = await withTimeout(supabaseAdmin.from('resumes').delete().eq('id', req.params.id).eq('user_id', req.session.userId), 6000)
  if (delErr) throw delErr
  await fs.unlink(new URL(`../../../storage/uploads/${row.stored_name}`, import.meta.url)).catch(() => {})
  res.status(204).end()
}))
