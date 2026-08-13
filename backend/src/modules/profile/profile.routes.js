import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../utils/supabase-admin.js'
import { AppError, asyncHandler, sendData } from '../../utils/http.js'
import { validate } from '../../utils/validation.js'
import { isColumnMissing } from '../../utils/supabase-errors.js'
const schema=z.object({fullName:z.string().trim().min(2).max(120),phone:z.string().max(30).nullable().optional(),university:z.string().max(160).nullable().optional(),degree:z.string().max(160).nullable().optional(),bio:z.string().max(2000).nullable().optional(),preferredJobRole:z.string().max(160).nullable().optional(),role:z.enum(['job_seeker','student']).optional(),skills:z.array(z.string().trim().min(1).max(100)).max(30).optional()})
const settingsSchema=z.object({notifications:z.record(z.string(),z.boolean()).optional(),privacy:z.record(z.string(),z.boolean()).optional(),preferences:z.record(z.string(),z.string()).optional()})
export const profileRouter=Router()
profileRouter.get('/',asyncHandler(async(req,res)=>{
  const { data: authData } = await supabaseAdmin.auth.admin.getUserById(req.session.userId)
  let profile
  let error
  ;({ data: profile, error } = await supabaseAdmin.from('profiles').select('full_name, phone, university, degree, bio, preferred_job_role, profile_image_url, onboarding_step, role, settings').eq('user_id', req.session.userId).maybeSingle())
  if (error && isColumnMissing(error, 'role')) {
    ;({ data: profile, error } = await supabaseAdmin.from('profiles').select('full_name, phone, university, degree, bio, preferred_job_role, profile_image_url, onboarding_step, settings').eq('user_id', req.session.userId).maybeSingle())
  }
  if (error) throw error
  const { data: skills } = await supabaseAdmin.from('user_skills').select('id, name, proficiency').eq('user_id', req.session.userId).order('name')
  if (!profile) throw new AppError(404, 'Profile not found.')
  const role = profile.role || authData?.user?.user_metadata?.role || 'job_seeker'
  sendData(res,{...profile, role, id: req.session.userId, email: authData?.user?.email || null, skills: skills || []})
}))
profileRouter.put('/',validate(schema),asyncHandler(async(req,res)=>{
  const {fullName,phone=null,university=null,degree=null,bio=null,preferredJobRole=null,role=null,skills=[]}=req.body
  const patch = { full_name: fullName, phone, university, degree, bio, preferred_job_role: preferredJobRole, updated_at: new Date().toISOString() }
  if (role) patch.role = role
  let { error: profErr } = await supabaseAdmin.from('profiles').update(patch).eq('user_id', req.session.userId)
  if (profErr && isColumnMissing(profErr, 'role')) {
    delete patch.role
    ;({ error: profErr } = await supabaseAdmin.from('profiles').update(patch).eq('user_id', req.session.userId))
  }
  if (profErr) throw profErr
  await supabaseAdmin.auth.admin.updateUserById(req.session.userId, { user_metadata: { full_name: fullName, ...(role ? { role } : {}) } }).catch(() => {})
  if (req.body.skills) {
    const { error: delErr } = await supabaseAdmin.from('user_skills').delete().eq('user_id', req.session.userId)
    if (delErr) throw delErr
    for (const skill of skills) {
      const { error: insErr } = await supabaseAdmin.from('user_skills').insert({ user_id: req.session.userId, name: skill })
      if (insErr) throw insErr
    }
  }
  sendData(res,{message:'Profile updated.'})
}))
profileRouter.put('/settings',validate(settingsSchema),asyncHandler(async(req,res)=>{
  const { data: profile, error: selErr } = await supabaseAdmin.from('profiles').select('settings').eq('user_id', req.session.userId).maybeSingle()
  if (selErr) throw selErr
  const current = profile?.settings || {}
  const next = { ...current, ...req.body }
  const { error: updErr } = await supabaseAdmin.from('profiles').update({ settings: next, updated_at: new Date().toISOString() }).eq('user_id', req.session.userId)
  if (updErr) throw updErr
  sendData(res,{ settings: next })
}))
