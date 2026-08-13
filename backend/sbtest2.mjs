import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import ws from 'ws'
config({ path: 'C:/Users/LENV/Desktop/InterviewAI/InterviewAI/backend/.env' })

const url = process.env.SUPABASE_URL
const anon = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY
const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const anonClient = createClient(url, anon, { auth: { persistSession: false }, realtime: { transport: ws } })
const admin = createClient(url, secret, { auth: { persistSession: false }, realtime: { transport: ws } })

const r = await anonClient.auth.signInWithPassword({ email: 'no-such-user-xyz@example.com', password: 'whatever123' })
console.log('anon signInWithPassword (expect invalid creds):', r.error ? `${r.error.status} ${r.error.message}` : 'UNEXPECTED SUCCESS')

const byId = await admin.auth.admin.getUserById('00000000-0000-0000-0000-000000000000')
console.log('admin getUserById (expect user:null):', byId.error ? `ERR ${byId.error.message}` : `OK user=${JSON.stringify(byId.data.user)}`)

const upd = await admin.auth.admin.updateUserById('00000000-0000-0000-0000-000000000000', { user_metadata: { full_name: 'x' } })
console.log('admin updateUserById (expect error):', upd.error ? `ERR ${upd.error.message}` : `OK ${JSON.stringify(upd.data.user)}`)

const reset = await admin.auth.admin.resetUserPasswordByEmail('no-such-user-xyz@example.com')
console.log('admin resetUserPasswordByEmail (expect error):', reset.error ? `ERR ${reset.error.message}` : `OK ${JSON.stringify(reset.data)}`)
