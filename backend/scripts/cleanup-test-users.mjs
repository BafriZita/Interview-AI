import { supabaseAdmin } from '../lib/supabase.js'

const match = (user) => {
  const email = (user.email || '').toLowerCase()
  const name = (user.user_metadata?.full_name || '').toLowerCase()
  const emailMatch = email.startsWith('fix-test-') || email.includes('fix-verification') || email.includes('fixverification')
  const nameMatch = name.includes('fix verification') || name.includes('fix-verification')
  return emailMatch || nameMatch
}

const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 })
if (error) {
  console.log(`listUsers failed: ${error.message}`)
  process.exit(1)
}

const targets = users.filter(match)
console.log(`Found ${targets.length} test users out of ${users.length} total.`)

let deleted = 0
for (const user of targets) {
  const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(user.id)
  if (delErr) {
    console.log(`  ! ${user.email} -> ${delErr.message}`)
  } else {
    deleted += 1
    console.log(`  - deleted ${user.email}`)
  }
}
console.log(`Done. Deleted ${deleted}/${targets.length}.`)
