import { z } from 'zod'
export const registerSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  email: z.email().toLowerCase(),
  password: z.string().min(8).max(72),
  role: z.enum(['job_seeker', 'student']).optional().default('job_seeker'),
})
export const loginSchema = z.object({ email: z.email().toLowerCase(), password: z.string().min(1) })
export const forgotSchema = z.object({ email: z.email().toLowerCase() })
export const resetSchema = z.object({ token: z.string().min(32), password: z.string().min(8).max(72) })
