import { Router } from 'express'
import { supabaseAdmin } from '../../utils/supabase-admin.js'
import { asyncHandler, sendData } from '../../utils/http.js'
export const dashboardRouter=Router()
dashboardRouter.get('/',asyncHandler(async(req,res)=>{
  const id=req.session.userId
  const [completed, recent, profile] = await Promise.all([
    supabaseAdmin.from('interview_sessions').select('overall_score, completed_at').eq('user_id', id).eq('status', 'completed'),
    supabaseAdmin.from('interview_sessions').select('id,target_role,interview_type,status,overall_score,created_at').eq('user_id', id).order('created_at', { ascending: false }).limit(5),
    supabaseAdmin.from('profiles').select('onboarding_step').eq('user_id', id).maybeSingle(),
  ])
  if (completed.error) throw completed.error
  if (recent.error) throw recent.error
  if (profile.error) throw profile.error
  const rows = completed.data || []
  const scores = rows.map((r) => r.overall_score).filter((v) => v != null)
  const timestamps = rows.map((r) => r.completed_at).filter(Boolean)
  sendData(res,{
    summary: {
      interviews_completed: rows.length,
      average_score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      last_interview_at: timestamps.length ? timestamps.sort()[timestamps.length - 1] : null,
    },
    recent: recent.data || [],
    onboardingStep: profile.data?.onboarding_step ?? 0,
  })
}))
