import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import ws from 'ws'
config({ path: 'C:/Users/LENV/Desktop/InterviewAI/InterviewAI/backend/.env' })

const url = process.env.SUPABASE_URL
const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

console.log('url:', url)
console.log('anon set:', Boolean(anon))
console.log('secret set:', Boolean(secret))

const admin = createClient(url, secret, { auth: { persistSession: false }, realtime: { transport: ws } })

try {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 3 })
  console.log('ADMIN listUsers:', error ? `ERROR ${error.status} ${error.message}` : `OK ${data.users.length} users`)
} catch (e) {
  console.log('ADMIN listUsers THREW', e.message)
}

try {
  const { data, error } = await admin.from('profiles').select('*', { head: true, count: 'exact' })
  console.log('ADMIN profiles count:', error ? `ERROR ${error.message}` : `OK count=${data.length}`)
} catch (e) {
  console.log('ADMIN profiles THREW', e.message)
}
