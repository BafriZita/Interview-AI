import { Router } from 'express'
import { supabaseAdmin } from '../../utils/supabase-admin.js'
import { AppError, asyncHandler, sendData } from '../../utils/http.js'
import { generateReport } from '../../services/openai.service.js'
import { startReportTask, isReportPending, readReportFromStore, writeReportToStore } from './report-task.js'
import { isColumnMissing } from '../../utils/supabase-errors.js'
import { withTimeout } from '../../utils/timeout.js'

export const reportRouter = Router()

reportRouter.get('/', asyncHandler(async (req, res) => {
  const { data: rows, error } = await supabaseAdmin.from('interview_sessions')
    .select('id,target_role,interview_type,overall_score,completed_at')
    .eq('user_id', req.session.userId)
    .eq('status', 'completed')
    .order('completed_at', { ascending: false })
  if (error) throw error
  sendData(res, rows || [])
}))

reportRouter.get('/:sessionId', asyncHandler(async (req, res) => {
  const sessionId = req.params.sessionId

  // interview_answers.coach_hint only exists after migration 002; fall back to
  // the core fields so the feedback page still loads on a pre-migration DB.
  const answersSelect = 'answer_text, audio_path, duration_seconds, scores, overall_score, feedback, coach_hint, submitted_at'
  let { data: session, error } = await withTimeout(supabaseAdmin.from('interview_sessions')
    .select(`*, interview_questions(question_text, question_type, sort_order, interview_answers(${answersSelect}))`)
    .eq('id', sessionId)
    .eq('user_id', req.session.userId)
    .eq('status', 'completed')
    .maybeSingle(), 6000)
  if (error && isColumnMissing(error, 'coach_hint')) {
    ;({ data: session, error } = await withTimeout(supabaseAdmin.from('interview_sessions')
      .select('*, interview_questions(question_text, question_type, sort_order, interview_answers(answer_text, audio_path, duration_seconds, scores, overall_score, feedback, submitted_at))')
      .eq('id', sessionId)
      .eq('user_id', req.session.userId)
      .eq('status', 'completed')
      .maybeSingle(), 6000))
  }
  if (error) throw error
  if (!session) throw new AppError(404, 'Report not found.')

  const { interview_questions, ...rest } = session
  const answers = (interview_questions || []).map((q) => ({
    question_text: q.question_text,
    question_type: q.question_type,
    ...(q.interview_answers?.[0] || {}),
  }))

  let report = await readReportFromStore(sessionId)

  if (!report && !isReportPending(sessionId)) {
    // Old session with no stored report: generate in the background so the
    // feedback page opens instantly and the report appears when ready.
    startReportTask(sessionId, async () => {
      const generated = await generateReport({ targetRole: rest.target_role, interviewType: rest.interview_type, questions: interview_questions || [], answers })
      await writeReportToStore({ userId: req.session.userId, sessionId, report: generated })
      return generated
    }).catch((err) => console.error('On-demand report generation failed:', err))
  }

  sendData(res, { session: rest, answers, report, generating: !report })
}))
