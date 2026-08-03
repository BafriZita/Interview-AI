import { Router } from 'express'
import { asyncHandler } from '../../utils/http.js'
import { validate } from '../../utils/validation.js'
import { requireAuth } from '../../middleware/auth.js'
import { forgotSchema, loginSchema, registerSchema, resetSchema } from './auth.schemas.js'
import * as controller from './auth.controller.js'
export const authRouter=Router()
authRouter.post('/register',validate(registerSchema),asyncHandler(controller.register))
authRouter.post('/login',validate(loginSchema),asyncHandler(controller.login))
authRouter.post('/logout',requireAuth,asyncHandler(controller.logout))
authRouter.get('/me',requireAuth,asyncHandler(controller.me))
authRouter.post('/forgot-password',validate(forgotSchema),asyncHandler(controller.forgotPassword))
authRouter.post('/reset-password',validate(resetSchema),asyncHandler(controller.resetPassword))
