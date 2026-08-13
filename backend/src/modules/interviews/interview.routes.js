import fs from 'node:fs/promises'
import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../utils/supabase-admin.js'
import { AppError, asyncHandler, sendData } from '../../utils/http.js'
import { validate } from '../../utils/validation.js'
import { generateQuestions, evaluateAnswer, transcribeAudio, generateReport, coachReply, streamCoachReply, generateRecommendations } from '../../services/openai.service.js'
import { createNotification } from '../notifications/notifications.helper.js'
import { audioUpload } from '../../middleware/upload.js'
import { isColumnMissing } from '../../utils/supabase-errors.js'
import { startReportTask, writeReportToStore } from '../reports/report-task.js'
import { withTimeout } from '../../utils/timeout.js'

const createSchema = z.object({
  targetRole: z.string().trim().min(2).max(180),
  type: z.enum(['hr', 'behavioral', 'technical', 'situational', 'problem_solving', 'mixed']).default('mixed'),
  resumeId: z.number().int().positive().nullable().optional(),
  jobDescriptionId: z.number().int().positive().nullable().optional(),
  questionCount: z.number().int().min(3).max(20).default(8),
})
const answerSchema = z.object({ answerText: z.string().trim().min(1).max(20000), durationSeconds: z.number().int().min(0).max(7200).optional() })
const chatSchema = z.object({
  message: z.string().trim().min(1).max(4000),
  evaluation: z.object({ overallScore: z.number().nullish(), feedback: z.string().nullish() }).nullish(),
  nextQuestion: z.string().nullish(),
})

export const interviewRouter = Router()

async function loadResumeText(userId, resumeId) {
  let query = supabaseAdmin.from('resumes').select('extracted_text').eq('user_id', userId)
  if (resumeId) query = query.eq('id', resumeId).maybeSingle()
  else query = query.eq('is_primary', true).maybeSingle()
  const { data } = await query
  return data?.extracted_text || ''
}

async function loadCandidateName(userId) {
  try {
    const { data: profile } = await supabaseAdmin.from('profiles')
      .select('full_name')
      .eq('user_id', userId)
      .maybeSingle()
    if (profile?.full_name) return profile.full_name
    const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
    return authUser?.user?.user_metadata?.full_name || authUser?.user?.user_metadata?.name || ''
  } catch {
    return ''
  }
}

async function loadOwnedSession(sessionId, userId) {
  const { data: session, error } = await supabaseAdmin.from('interview_sessions')
    .select('id, user_id, target_role, interview_type, status, resume_id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  if (!session) throw new AppError(404, 'Interview not found.')
  return session
}

interviewRouter.get('/', asyncHandler(async (req, res) => {
  const { data: rows, error } = await supabaseAdmin.from('interview_sessions')
    .select('id,target_role,interview_type,status,overall_score,started_at,completed_at,created_at')
    .eq('user_id', req.session.userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  sendData(res, rows || [])
}))

interviewRouter.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const d = req.body
  const [resumeText, candidateName] = await Promise.all([
    loadResumeText(req.session.userId, d.resumeId),
    loadCandidateName(req.session.userId),
  ])
  const questions = await generateQuestions({ targetRole: d.targetRole, resumeText, candidateName, type: d.type, count: d.questionCount })

  const { data: result, error } = await supabaseAdmin.from('interview_sessions').insert({
    user_id: req.session.userId,
    resume_id: d.resumeId || null,
    job_description_id: d.jobDescriptionId || null,
    target_role: d.targetRole,
    interview_type: d.type,
    status: 'in_progress',
    started_at: new Date().toISOString(),
  }).select('id').single()
  if (error) throw error

  const savedQuestions = []
  for (const [i, q] of questions.entries()) {
    const { data: qRow, error: qErr } = await supabaseAdmin.from('interview_questions').insert({
      interview_session_id: result.id,
      question_type: q.questionType,
      question_text: q.questionText,
      sort_order: i + 1,
      source: 'ai',
    }).select('id').single()
    if (qErr) throw qErr
    savedQuestions.push({ id: qRow.id, question_type: q.questionType, question_text: q.questionText, sort_order: i + 1, source: 'ai' })
  }
  sendData(res, { id: result.id, status: 'in_progress', questions: savedQuestions }, 201)
}))

interviewRouter.get('/:id', asyncHandler(async (req, res) => {
  const fullSelect = '*, interview_questions(id, question_type, question_text, sort_order, interview_answers(answer_text, overall_score, feedback, coach_hint, scores, duration_seconds))'
  const coreSelect = '*, interview_questions(id, question_type, question_text, sort_order, interview_answers(answer_text, overall_score, feedback, scores, duration_seconds))'
  let { data: session, error } = await supabaseAdmin.from('interview_sessions')
    .select(fullSelect)
    .eq('id', req.params.id)
    .eq('user_id', req.session.userId)
    .maybeSingle()
  if (error && isColumnMissing(error, 'coach_hint')) {
    ;({ data: session, error } = await supabaseAdmin.from('interview_sessions')
      .select(coreSelect)
      .eq('id', req.params.id)
      .eq('user_id', req.session.userId)
      .maybeSingle())
  }
  if (error) throw error
  if (!session) throw new AppError(404, 'Interview not found.')
  const { interview_questions, ...rest } = session
  const questions = (interview_questions || []).map((q) => ({
    id: q.id,
    question_type: q.question_type,
    question_text: q.question_text,
    sort_order: q.sort_order,
    answer_text: q.interview_answers?.[0]?.answer_text ?? null,
    overall_score: q.interview_answers?.[0]?.overall_score ?? null,
    feedback: q.interview_answers?.[0]?.feedback ?? null,
    coach_hint: q.interview_answers?.[0]?.coach_hint ?? null,
    scores: q.interview_answers?.[0]?.scores ?? null,
    duration_seconds: q.interview_answers?.[0]?.duration_seconds ?? null,
  }))
  sendData(res, { ...rest, questions })
}))

interviewRouter.post('/:id/questions/:questionId/answer', validate(answerSchema), asyncHandler(async (req, res) => {
  const { data: owned, error } = await supabaseAdmin.from('interview_questions')
    .select('id, question_type, question_text, interview_sessions(user_id, target_role, resume_id)')
    .eq('id', req.params.questionId)
    .eq('interview_session_id', req.params.id)
    .maybeSingle()
  if (error) throw error
  if (!owned || owned.interview_sessions?.user_id !== req.session.userId) throw new AppError(404, 'Interview question not found.')

  const session = owned.interview_sessions
  const [resumeText, candidateName] = await Promise.all([
    loadResumeText(req.session.userId, session.resume_id),
    loadCandidateName(req.session.userId),
  ])
  const evaluation = await evaluateAnswer({
    targetRole: session.target_role,
    resumeText,
    candidateName,
    question: { question_type: owned.question_type, question_text: owned.question_text },
    answerText: req.body.answerText,
  })

  const answerRow = {
    question_id: req.params.questionId,
    answer_text: req.body.answerText,
    duration_seconds: req.body.durationSeconds ?? null,
    scores: evaluation.scores,
    overall_score: evaluation.overallScore,
    feedback: evaluation.feedback,
    submitted_at: new Date().toISOString(),
  }
  let { error: ansErr } = await supabaseAdmin.from('interview_answers').upsert({
    ...answerRow,
    coach_hint: evaluation.coachHint,
  }, { onConflict: 'question_id' })
  if (ansErr && isColumnMissing(ansErr, 'coach_hint')) {
    ;({ error: ansErr } = await supabaseAdmin.from('interview_answers').upsert(answerRow, { onConflict: 'question_id' }))
  }
  if (ansErr) throw ansErr

  const { data: current } = await supabaseAdmin.from('interview_sessions').select('current_question').eq('id', req.params.id).maybeSingle()
  const { error: updErr } = await supabaseAdmin.from('interview_sessions').update({ current_question: (current?.current_question || 0) + 1 }).eq('id', req.params.id)
  if (updErr) throw updErr

  sendData(res, {
    message: 'Answer evaluated.',
    evaluation,
  }, 201)
}))

// Whisper speech-to-text: multipart field "audio"
interviewRouter.post('/:id/questions/:questionId/transcribe', audioUpload.single('audio'), asyncHandler(async (req, res) => {
  const { data: owned, error } = await supabaseAdmin.from('interview_questions')
    .select('id, interview_sessions(user_id)')
    .eq('id', req.params.questionId)
    .eq('interview_session_id', req.params.id)
    .maybeSingle()
  if (error) throw error
  if (!owned || owned.interview_sessions?.[0]?.user_id !== req.session.userId) throw new AppError(404, 'Interview question not found.')

  if (!req.file) throw new AppError(400, 'No audio file received.')
  const buffer = await fs.readFile(req.file.path)
  const text = await transcribeAudio({ buffer, mimeType: req.file.mimetype, originalName: req.file.originalname })
  await fs.unlink(req.file.path).catch(() => {})
  if (text == null) throw new AppError(503, 'Speech transcription is unavailable right now. Add an OPENAI_API_KEY with available credits, then try again.', 'AI_UNAVAILABLE')
  sendData(res, { transcript: text })
}))

// Coach chat: the candidate can ask questions mid-interview
interviewRouter.post('/:id/chat', validate(chatSchema), asyncHandler(async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.session.userId)
  const [resumeText, candidateName] = await Promise.all([
    loadResumeText(req.session.userId, session.resume_id),
    loadCandidateName(req.session.userId),
  ])
  const { data: history, error } = await supabaseAdmin.from('interview_questions')
    .select('question_text, interview_answers(answer_text)')
    .eq('interview_session_id', req.params.id)
    .order('sort_order')
  if (error) throw error
  const messages = []
  for (const q of history || []) {
    messages.push({ role: 'assistant', content: `Question: ${q.question_text}` })
    if (q.interview_answers?.[0]?.answer_text) messages.push({ role: 'user', content: q.interview_answers[0].answer_text })
  }
  messages.push({ role: 'user', content: req.body.message })
  const reply = await coachReply({ targetRole: session.target_role, candidateName, resumeText, messages, evaluation: req.body.evaluation, nextQuestion: req.body.nextQuestion })
  sendData(res, { reply })
}))

// Streaming coach chat (SSE): replies appear token-by-token like ChatGPT.
// Keep the non-streaming route above for simple clients; the room uses this one.
interviewRouter.post('/:id/chat/stream', validate(chatSchema), asyncHandler(async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.session.userId)
  const [resumeText, candidateName] = await Promise.all([
    loadResumeText(req.session.userId, session.resume_id),
    loadCandidateName(req.session.userId),
  ])
  const { data: history, error } = await supabaseAdmin.from('interview_questions')
    .select('question_text, interview_answers(answer_text)')
    .eq('interview_session_id', req.params.id)
    .order('sort_order')
  if (error) throw error
  const messages = []
  for (const q of history || []) {
    messages.push({ role: 'assistant', content: `Question: ${q.question_text}` })
    if (q.interview_answers?.[0]?.answer_text) messages.push({ role: 'user', content: q.interview_answers[0].answer_text })
  }
  messages.push({ role: 'user', content: req.body.message })

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  let closed = false
  res.on('close', () => { closed = true })
  res.on('error', () => { closed = true })
  const send = (event, payload) => {
    if (closed || res.destroyed) return
    try { res.write(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`) } catch { closed = true }
  }

  send('start', {})
  try {
    await streamCoachReply({ targetRole: session.target_role, candidateName, resumeText, messages, evaluation: req.body.evaluation, nextQuestion: req.body.nextQuestion }, (token) => send('token', { token }))
  } catch (err) {
    send('error', { message: 'The AI coach could not respond right now. Please try again.' })
  }
  send('done', {})
  if (!closed) { try { res.end() } catch { /* client already gone */ } }
}))

interviewRouter.post('/:id/complete', asyncHandler(async (req, res) => {
  const session = await loadOwnedSession(req.params.id, req.session.userId)

  const { data: questions, error: qErr } = await supabaseAdmin.from('interview_questions')
    .select('question_type, question_text, sort_order, interview_answers(answer_text, overall_score)')
    .eq('interview_session_id', req.params.id)
    .order('sort_order')
  if (qErr) throw qErr

  const rows = questions || []
  const scores = rows.map((q) => q.interview_answers?.[0]?.overall_score).filter((v) => v != null)
  const overall = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null

  const { data: updated, error } = await supabaseAdmin.from('interview_sessions')
    .update({ status: 'completed', completed_at: new Date().toISOString(), overall_score: overall })
    .eq('id', req.params.id)
    .eq('user_id', req.session.userId)
    .select('id')
  if (error) throw error
  if (!updated || updated.length === 0) throw new AppError(404, 'Interview not found.')

  // The report is generated in the background so "End session" responds instantly.
  startReportTask(req.params.id, async () => {
    try {
      const [resumeText, candidateName] = await Promise.all([
        loadResumeText(req.session.userId, session.resume_id),
        loadCandidateName(req.session.userId),
      ])
      const report = await generateReport({
        targetRole: session.target_role,
        interviewType: session.interview_type,
        candidateName,
        questions: rows,
        answers: rows.map((q) => q.interview_answers?.[0] || {}),
      })
      const reportScore = report.overallScore ?? overall ?? 60
      await withTimeout(supabaseAdmin.from('interview_sessions')
        .update({ overall_score: reportScore })
        .eq('id', req.params.id), 5000)
      await withTimeout(writeReportToStore({ userId: req.session.userId, sessionId: req.params.id, report }), 5000)
      await createNotification(req.session.userId, {
        title: 'Interview complete',
        body: `Your ${session.target_role} interview is finished. An honest report is ready for you.`,
        type: 'report',
      })

      // Generate career paths right after the interview so the
      // Recommendations page is ready immediately.
      try {
        const { data: existing } = await withTimeout(supabaseAdmin.from('career_recommendations')
          .select('id')
          .eq('user_id', req.session.userId)
          .limit(1), 5000)
        if (!existing || existing.length === 0) {
          const recs = await generateRecommendations({ resumeText, targetRole: session.target_role })
          for (const r of recs.slice(0, 4)) {
            await withTimeout(supabaseAdmin.from('career_recommendations').insert({
              user_id: req.session.userId,
              job_title: r.jobTitle,
              match_score: r.matchScore,
              rationale: r.rationale,
              recommended_skills: r.recommendedSkills || [],
              summary: r.summary,
              roadmap: r.roadmap || [],
              icon: r.icon || 'chart',
            }), 5000)
          }
        }
      } catch (err) {
        console.warn('Could not prepare career recommendations:', err.message)
      }
    } catch (err) {
      console.error('Background report generation failed:', err)
    }
  })

  sendData(res, { message: 'Interview completed. Your report is being prepared.', reportPending: true })
}))
