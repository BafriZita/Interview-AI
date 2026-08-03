import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { authRouter } from '../modules/auth/auth.routes.js'
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js'
import { profileRouter } from '../modules/profile/profile.routes.js'
import { resumeRouter } from '../modules/resumes/resume.routes.js'
import { jobRouter } from '../modules/jobs/job.routes.js'
import { interviewRouter } from '../modules/interviews/interview.routes.js'
import { reportRouter } from '../modules/reports/report.routes.js'
import { recommendationRouter } from '../modules/recommendations/recommendation.routes.js'

export const apiRouter=Router()
apiRouter.use('/auth',authRouter)
apiRouter.use('/dashboard',requireAuth,dashboardRouter)
apiRouter.use('/profile',requireAuth,profileRouter)
apiRouter.use('/resumes',requireAuth,resumeRouter)
apiRouter.use('/jobs',requireAuth,jobRouter)
apiRouter.use('/interviews',requireAuth,interviewRouter)
apiRouter.use('/reports',requireAuth,reportRouter)
apiRouter.use('/recommendations',requireAuth,recommendationRouter)
