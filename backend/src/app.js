import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env.js'
import { sessionMiddleware } from './config/session.js'
import { apiRouter } from './routes/index.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { testSupabaseConnection } from '../lib/supabase.js'
import { buildOpenApiDocument } from './docs/swagger.js'

export const app=express()
app.set('trust proxy',env.nodeEnv==='production'?1:false)
app.disable('x-powered-by')
app.use(helmet())
app.use(cors({origin:env.frontendUrl,credentials:true,methods:['GET','POST','PUT','PATCH','DELETE']}))
app.use(express.json({limit:'1mb'}))
app.use(express.urlencoded({extended:false,limit:'1mb'}))
app.use(sessionMiddleware)
app.get('/api/v1/health',(_req,res)=>res.json({success:true,data:{service:'InterviewAI API',status:'healthy',timestamp:new Date().toISOString()}}))
app.get('/api/v1/health/supabase', async (_req,res) => {
  const result = await testSupabaseConnection()
  res.json({ success: true, data: { service: 'Supabase', ...result } })
})
app.get('/api/v1/docs.json', (_req, res) => {
  res.json(buildOpenApiDocument())
})
app.use('/api/v1',apiRouter)
app.use(notFound)
app.use(errorHandler)
