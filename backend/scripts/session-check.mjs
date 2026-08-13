import { supabaseAdmin } from '../src/utils/supabase-admin.js'

// 1. does the user_sessions table exist?
const { data: t, error: tErr } = await supabaseAdmin.from('user_sessions').select('sid').limit(1)
console.log('user_sessions table:', tErr ? `MISSING/ERR: ${tErr.message}` : `OK (${t.length} rows fetched)`)

const email = `sesscheck_${Date.now()}@example.com`
const { data: created } = await supabaseAdmin.auth.admin.createUser({ email, password: 'flowpass123', email_confirm: true })
console.log('created:', created.user.id)

const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const setCookie = loginRes.headers.get('set-cookie')
console.log('login:', loginRes.status)

// 2. after login, is a row persisted?
const { data: rows, error: rErr } = await supabaseAdmin.from('user_sessions').select('sid').limit(5)
console.log('rows after login:', rErr ? `ERR ${rErr.message}` : rows.map((r) => r.sid.slice(0, 10)).join(', '))

// 3. call /auth/me with cookie
const meRes = await fetch('http://localhost:5000/api/v1/auth/me', { headers: { Cookie: setCookie } })
console.log('/auth/me status:', meRes.status)
const meBody = await meRes.json().catch(() => ({}))
console.log('me body:', JSON.stringify(meBody).slice(0, 200))

await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {})
console.log('cleaned')
