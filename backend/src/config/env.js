import 'dotenv/config'

const requiredInProduction = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD', 'SESSION_SECRET']
if (process.env.NODE_ENV === 'production') {
  const missing = requiredInProduction.filter((key) => !process.env[key])
  if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`)
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 5000),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    database: process.env.DB_NAME || 'interview_ai',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  },
  sessionSecret: process.env.SESSION_SECRET || 'development_only_change_this_secret',
  sessionName: process.env.SESSION_NAME || 'interviewai.sid',
  sessionTtlHours: Number(process.env.SESSION_TTL_HOURS || 24),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB || 10),
  uploadDir: process.env.UPLOAD_DIR || 'storage/uploads',
}
