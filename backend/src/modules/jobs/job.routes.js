import { Router } from 'express'
import { z } from 'zod'
import { supabaseAdmin } from '../../utils/supabase-admin.js'
import { AppError, asyncHandler, sendData } from '../../utils/http.js'
import { validate } from '../../utils/validation.js'
const jobSchema=z.object({jobTitle:z.string().trim().min(2).max(180),companyName:z.string().trim().max(180).nullable().optional(),description:z.string().trim().min(50).max(100000),experienceLevel:z.string().max(80).nullable().optional(),location:z.string().max(160).nullable().optional()})
const matchSchema=z.object({resumeId:z.coerce.number().int().positive(),jobDescriptionId:z.coerce.number().int().positive()})
export const jobRouter=Router()
jobRouter.get('/',asyncHandler(async(req,res)=>{
  const { data: rows, error } = await supabaseAdmin.from('job_descriptions').select('id,job_title,company_name,experience_level,location,status,created_at').eq('user_id', req.session.userId).order('created_at', { ascending: false })
  if (error) throw error
  sendData(res, rows || [])
}))
jobRouter.post('/',validate(jobSchema),asyncHandler(async(req,res)=>{
  const j=req.body
  const { data: result, error } = await supabaseAdmin.from('job_descriptions').insert({ user_id: req.session.userId, job_title: j.jobTitle, company_name: j.companyName || null, original_text: j.description, experience_level: j.experienceLevel || null, location: j.location || null, status: 'analysed' }).select('id').single()
  if (error) throw error
  sendData(res,{ id: result.id, ...j },201)
}))
jobRouter.get('/:id',asyncHandler(async(req,res)=>{
  const { data: row, error } = await supabaseAdmin.from('job_descriptions').select('*').eq('id', req.params.id).eq('user_id', req.session.userId).maybeSingle()
  if (error) throw error
  if (!row) throw new AppError(404,'Job description not found.')
  const { data: requirements } = await supabaseAdmin.from('job_requirements').select('id,category,value,required').eq('job_description_id', req.params.id)
  sendData(res,{ ...row, requirements: requirements || [] })
}))
jobRouter.delete('/:id',asyncHandler(async(req,res)=>{
  const { data: deleted, error } = await supabaseAdmin.from('job_descriptions').delete().eq('id', req.params.id).eq('user_id', req.session.userId).select('id')
  if (error) throw error
  if (!deleted || deleted.length === 0) throw new AppError(404,'Job description not found.')
  res.status(204).end()
}))
jobRouter.post('/match/calculate',validate(matchSchema),asyncHandler(async(req,res)=>{
  const { resumeId, jobDescriptionId } = req.body
  const { data: resume } = await supabaseAdmin.from('resumes').select('extracted_text').eq('id', resumeId).eq('user_id', req.session.userId).maybeSingle()
  const { data: job } = await supabaseAdmin.from('job_descriptions').select('original_text').eq('id', jobDescriptionId).eq('user_id', req.session.userId).maybeSingle()
  if (!resume || !job) throw new AppError(404,'Resume or job description not found.')
  const tokens=(s)=>new Set((s||'').toLowerCase().match(/[a-z][a-z+#.]{2,}/g)||[])
  const cv=tokens(resume.extracted_text), jt=tokens(job.original_text)
  const overlap=[...jt].filter(x=>cv.has(x))
  const missing=[...jt].filter(x=>!cv.has(x)).slice(0,15)
  const score=Math.max(10,Math.min(100,Math.round((overlap.length/Math.max(jt.size,1))*140)))
  const strongSkills=overlap.slice(0,15)
  const { data: result, error } = await supabaseAdmin.from('resume_job_matches').insert({
    user_id: req.session.userId,
    resume_id: resumeId,
    job_description_id: jobDescriptionId,
    overall_score: score,
    scores: { strong_skills: strongSkills, missing_skills: missing },
    recommendations: ['Add measurable results','Reflect important role keywords naturally'],
  }).select('id').single()
  if (error) throw error
  sendData(res,{ id: result.id, overallScore: score, strongSkills, missingSkills: missing },201)
}))
