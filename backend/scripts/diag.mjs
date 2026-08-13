import { supabaseAdmin } from '../src/utils/supabase-admin.js'

const { data: { users } } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
const glenn = users.find((u) => u.email === 'bafrizita@gmail.com')
if (!glenn) {
  console.log('NO GLENN FOUND')
  process.exit(0)
}
const uid = glenn.id
console.log('Glenn id:', uid)

const { data: resumes, error: rErr } = await supabaseAdmin.from('resumes').select('id,original_name,status,is_primary,strength_score,created_at').eq('user_id', uid)
console.log('resumes:', rErr ? `ERR ${rErr.message}` : JSON.stringify(resumes))

const { data: rtext, error: rtErr } = await supabaseAdmin.from('resumes').select('extracted_text').eq('user_id', uid).eq('is_primary', true).maybeSingle()
console.log('primary resume extracted_text len:', rtErr ? `ERR ${rtErr.message}` : (rtext?.extracted_text || '(empty)').length, 'exists:', Boolean(rtext?.extracted_text))

const { data: sessions, error: sErr } = await supabaseAdmin.from('interview_sessions').select('id,target_role,status,overall_score,completed_at,created_at').eq('user_id', uid).order('created_at', { ascending: false })
console.log('sessions:', sErr ? `ERR ${sErr.message}` : JSON.stringify(sessions))

const { data: recs, error: recErr } = await supabaseAdmin.from('career_recommendations').select('id,job_title,match_score,summary,created_at').eq('user_id', uid)
console.log('recs:', recErr ? `ERR ${recErr.message}` : JSON.stringify(recs))

const { data: t1, error: e1 } = await supabaseAdmin.from('session_reports').select('interview_session_id').limit(1)
console.log('session_reports table:', e1 ? `ERR ${e1.message}` : `OK ${JSON.stringify(t1)}`)

const { data: t2, error: e2 } = await supabaseAdmin.from('notifications').select('id').limit(1)
console.log('notifications table:', e2 ? `ERR ${e2.message}` : `OK ${JSON.stringify(t2)}`)

const { data: t3, error: e3 } = await supabaseAdmin.from('career_recommendations').select('roadmap').limit(1)
console.log('rec roadmap column:', e3 ? `ERR ${e3.message}` : `OK ${JSON.stringify(t3)}`)

const { data: t4, error: e4 } = await supabaseAdmin.from('resume_insights').select('id').limit(1)
console.log('resume_insights table:', e4 ? `ERR ${e4.message}` : `OK ${JSON.stringify(t4)}`)
