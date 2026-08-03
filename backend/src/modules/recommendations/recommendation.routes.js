import { Router } from 'express'
import { db } from '../../config/database.js'
import { asyncHandler, sendData } from '../../utils/http.js'
export const recommendationRouter=Router()
recommendationRouter.get('/',asyncHandler(async(req,res)=>{const [rows]=await db.execute('SELECT id,job_title,match_score,rationale,recommended_skills,courses,certifications,roadmap,created_at FROM career_recommendations WHERE user_id=? ORDER BY match_score DESC,created_at DESC',[req.session.userId]);sendData(res,rows)}))
