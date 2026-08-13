import 'dotenv/config'

const requiredInProduction = ['SUPABASE_URL', 'SUPABASE_SECRET_KEY', 'SESSION_SECRET']
if (process.env.NODE_ENV === 'production') {
  const missing = requiredInProduction.filter((key) => !process.env[key])
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`)
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || 'development_only_change_this_secret',
  sessionName: process.env.SESSION_NAME || 'interviewai.sid',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 24),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 10),
  uploadDir: process.env.UPLOAD_DIR || 'storage/uploads',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  openaiWhisperModel: process.env.OPENAI_WHISPER_MODEL || 'whisper-1',
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || '',
  },
}
