import { supabaseAdmin } from '../src/utils/supabase-admin.js'

function cookieFrom(setCookie) {
  return String(setCookie || '').split(';')[0]
}

const email = `flowtest_${Date.now()}@example.com`
const password = 'flowpass123'
const { data: created } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: 'Flow Test' } })
console.log('user:', created.user.id)

let t = Date.now()
const loginRes = await fetch('http://localhost:5000/api/v1/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
})
console.log('login:', loginRes.status, `(${Date.now() - t}ms)`)
const cookie = cookieFrom(loginRes.headers.get('set-cookie'))

t = Date.now()
const meRes = await fetch('http://localhost:5000/api/v1/auth/me', { headers: { Cookie: cookie } })
console.log('me:', meRes.status, `(${Date.now() - t}ms)`, (await meRes.text()).slice(0, 120))

t = Date.now()
const intRes = await fetch('http://localhost:5000/api/v1/interviews', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookie },
  body: JSON.stringify({ targetRole: 'QA Engineer', type: 'mixed', questionCount: 6 }),
})
console.log('interview create:', intRes.status, `(${Date.now() - t}ms)`)
const body = await intRes.json().catch(() => ({}))
console.log('questions:', body.data?.questions?.length, '| first:', JSON.stringify(body.data?.questions?.[0]))
console.log('all have ids:', body.data?.questions?.every((q) => q.id != null))

t = Date.now()
const getRes = await fetch(`http://localhost:5000/api/v1/interviews/${body.data?.id}`, { headers: { Cookie: cookie } })
console.log('interview get:', getRes.status, `(${Date.now() - t}ms)`)
const getBody = await getRes.json().catch(() => ({}))
console.log('GET questions:', getBody.data?.questions?.length, '| first has id:', getBody.data?.questions?.[0]?.id != null, '| first text:', (getBody.data?.questions?.[0]?.question_text || '').slice(0, 60))

await supabaseAdmin.auth.admin.deleteUser(created.user.id).catch(() => {})
console.log('cleaned')
