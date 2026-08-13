import { supabaseAdmin } from '../../lib/supabase.js'

export { supabaseAdmin }

export function requireSupabaseAdmin() {
  if (!supabaseAdmin) throw new Error('Supabase admin client is not configured.')
  return supabaseAdmin
}

export async function createUserWithEmail(email, options = {}) {
  const client = requireSupabaseAdmin()
  // options may include password, email_confirm, user_metadata
  const { data, error } = await client.auth.admin.createUser({
    email,
    password: options.password,
    email_confirm: options.email_confirm ?? false,
    user_metadata: options.user_metadata || {},
  })
  if (error) throw error
  return data
}

export async function generateRecoveryLinkForEmail(email) {
  const client = requireSupabaseAdmin()
  const { data, error } = await client.auth.admin.generateLink({ type: 'recovery', email })
  if (error) throw error
  return data
}

export async function getUserByEmail(email) {
  const client = requireSupabaseAdmin()
  const { data, error } = await client.auth.admin.listUsers({ page: 1, perPage: 1000 })
  if (error) throw error
  return (data?.users || []).find((u) => u.email === email) || null
}
