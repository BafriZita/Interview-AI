import { env } from '../../config/env.js'
import { AppError, sendData } from '../../utils/http.js'
import { supabaseAdmin, supabase } from '../../../lib/supabase.js'
import { requireSupabaseAdmin } from '../../utils/supabase-admin.js'
import { isColumnMissing, toFriendlyError } from '../../utils/supabase-errors.js'

function emailAlreadyExists(error) {
  return error?.status === 422 || /already (been )?registered|already registered/i.test(String(error?.message || ''))
}

async function ensureProfile(userId, fullName, role) {
  const now = new Date().toISOString()
  const base = { user_id: userId, full_name: fullName, created_at: now, updated_at: now }
  const { error } = await supabaseAdmin.from('profiles').insert({ ...base, role: role || 'job_seeker' })
  // 23505 = unique_violation (profile already exists) -> acceptable
  if (!error || error.code === '23505') return
  if (isColumnMissing(error, 'role')) {
    // profiles.role only exists after migration 002 is applied — retry without it
    // so signup still works and the role stays in user_metadata.
    const { error: retryError } = await supabaseAdmin.from('profiles').insert(base)
    if (retryError && retryError.code !== '23505') throw retryError
    return
  }
  throw error
}

export async function register(req, res) {
  const { fullName, email, password, role } = req.body
  const admin = requireSupabaseAdmin()

  let created
  try {
    created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    })
  } catch (error) {
    if (emailAlreadyExists(error)) throw new AppError(409, 'An account with this email already exists.', 'EMAIL_EXISTS')
    throw toFriendlyError(error, { action: 'create your account' })
  }
  const { data, error } = created
  if (error) {
    if (emailAlreadyExists(error)) throw new AppError(409, 'An account with this email already exists.', 'EMAIL_EXISTS')
    throw toFriendlyError(error, { action: 'create your account' })
  }

  const user = data.user
  try {
    await ensureProfile(user.id, fullName, role)
    await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())))
  } catch (error) {
    // Keep auth.users and public.profiles consistent: roll back the auth user
    // (profiles.user_id has ON DELETE CASCADE from auth.users).
    await admin.auth.admin.deleteUser(user.id).catch(() => {})
    throw toFriendlyError(error, { action: 'create your account' })
  }
  req.session.userId = user.id
  sendData(res, { user: { id: user.id, fullName, email, role } }, 201)
}

export async function login(req, res) {
  if (!supabase) throw new AppError(500, 'Supabase client not configured')
  const { data, error } = await supabase.auth.signInWithPassword({ email: req.body.email, password: req.body.password })
  if (error || !data?.user) throw new AppError(401, 'Incorrect email or password.', 'INVALID_CREDENTIALS')
  const user = data.user

  const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, role, created_at').eq('user_id', user.id).maybeSingle()

  await new Promise((resolve, reject) => req.session.regenerate((e) => (e ? reject(e) : resolve())))
  req.session.userId = user.id
  sendData(res, {
    user: {
      id: user.id,
      fullName: profile?.full_name || user.user_metadata?.full_name || null,
      email: user.email,
      role: profile?.role || user.user_metadata?.role || 'job_seeker',
      createdAt: profile?.created_at || null,
    },
  })
}

export async function logout(req, res) {
  await new Promise((resolve, reject) => req.session.destroy((e) => (e ? reject(e) : resolve())))
  res.clearCookie(env.sessionName)
  res.status(204).end()
}

export async function me(req, res) {
  const admin = requireSupabaseAdmin()
  const { data, error } = await admin.auth.admin.getUserById(req.session.userId)
  if (error || !data?.user) throw new AppError(404, 'User not found.')
  const user = data.user

  const { data: profile } = await supabaseAdmin.from('profiles').select('full_name, role, created_at').eq('user_id', user.id).maybeSingle()

  sendData(res, {
    user: {
      id: user.id,
      fullName: profile?.full_name || user.user_metadata?.full_name || null,
      email: user.email,
      role: profile?.role || user.user_metadata?.role || 'job_seeker',
      createdAt: profile?.created_at || user.created_at || null,
    },
  })
}

export async function forgotPassword(req, res) {
  if (!supabase) throw new AppError(500, 'Supabase client not configured')
  // Supabase sends the recovery email with a link back to the frontend
  try {
    await supabase.auth.resetPasswordForEmail(req.body.email, { redirectTo: `${env.frontendUrl}/reset-password` })
  } catch {
    // ignore errors to avoid leaking user existence
  }
  sendData(res, { message: 'If that account exists, a reset link will be sent.' })
}

export async function resetPassword(_req, _res) {
  throw new AppError(400, 'Password reset is handled through the email link. Please use the reset link sent to your email.')
}
