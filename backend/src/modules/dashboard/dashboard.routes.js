import { Router } from 'express'
import { db } from '../../config/database.js'
import { asyncHandler, sendData } from '../../utils/http.js'
export const dashboardRouter=Router()
dashboardRouter.get('/',asyncHandler(async(req,res)=>{const id=req.session.userId;const [[summary],[recent],[profile]]=await Promise.all([db.execute("SELECT COUNT(*) interviews_completed,ROUND(AVG(overall_score)) average_score,MAX(completed_at) last_interview_at FROM interview_sessions WHERE user_id=? AND status='completed'",[id]),db.execute('SELECT id,target_role,interview_type,status,overall_score,created_at FROM interview_sessions WHERE user_id=? ORDER BY created_at DESC LIMIT 5',[id]),db.execute('SELECT onboarding_step FROM profiles WHERE user_id=?',[id])]);sendData(res,{summary:summary[0],recent,onboardingStep:profile[0]?.onboarding_step||0})}))
