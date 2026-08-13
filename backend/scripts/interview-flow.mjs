import { supabaseAdmin } from '../src/utils/supabase-admin.js'

const email = `flowtest_${Date.now()}@example.com`
const password = 'flowpass123'

const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Flow Test' } })
if (cErr) { console.log('CREATE ERR', cErr.message); process.exit(1) }
console.log('created user:', created.user.id)

// login to get session cookie
const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
const setCookie = loginRes.headers.get('set-cookie')
console.log('login status:', loginRes.status, '| cookie present:', Boolean(setCookie))

const res = await fetch('http://localhost:5000/api/v1/interviews', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: setCookie },
  body: JSON.stringify({ targetRole: 'QA Engineer', type: 'mixed', questionCount: 6 }),
})
const body = await res.json().catch(() => ({}))
console.log('interview create status:', res.status)
console.log('questions count:', body.data?.questions?.length)
console.log('first question:', JSON.stringify(body.data?.questions?.[0], null, 1))
console.log('has ids:', body.data?.questions?.every((q) => q.id != null))

// cleanup test user
await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {})
console.log('cleaned up')
