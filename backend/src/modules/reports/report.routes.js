import { Router } from 'express'
import { db } from '../../config/database.js'
import { AppError, asyncHandler, sendData } from '../../utils/http.js'
export const reportRouter=Router()
reportRouter.get('/',asyncHandler(async(req,res)=>{const [rows]=await db.execute("SELECT id,target_role,interview_type,overall_score,completed_at FROM interview_sessions WHERE user_id=? AND status='completed' ORDER BY completed_at DESC",[req.session.userId]);sendData(res,rows)}))
reportRouter.get('/:sessionId',asyncHandler(async(req,res)=>{const [sessions]=await db.execute("SELECT * FROM interview_sessions WHERE id=? AND user_id=? AND status='completed'",[req.params.sessionId,req.session.userId]);if(!sessions[0])throw new AppError(404,'Report not found.');const [answers]=await db.execute('SELECT q.question_text,q.question_type,a.* FROM interview_questions q LEFT JOIN interview_answers a ON a.question_id=q.id WHERE q.interview_session_id=? ORDER BY q.sort_order',[req.params.sessionId]);sendData(res,{session:sessions[0],answers})}))
