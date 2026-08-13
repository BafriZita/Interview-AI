import session from 'express-session'
import { env } from './env.js'
import { supabaseAdmin } from '../utils/supabase-admin.js'

const SESSION_TABLE = 'user_sessions'
const ttlMs = env.sessionTtlHours * 60 * 60 * 1000

function sessionExpiry(sess) {
  const expires = sess?.cookie?.expires
  if (expires) {
    const t = new Date(expires)
    if (!Number.isNaN(t.getTime())) return t.toISOString()
  }
  return new Date(Date.now() + ttlMs).toISOString()
}

// Session store backed by Supabase PostgREST (service-role client). Sessions are
// persisted in the `user_sessions` table so they survive server restarts.
class SupabaseSessionStore extends session.Store {
  constructor(client) {
    super()
    this.client = client
  }

  get(sid, cb) {
    this.client.from(SESSION_TABLE).select('sess, expire').eq('sid', sid).maybeSingle()
      .then(({ data, error }) => {
        if (error) return cb(new Error(error.message))
        if (!data) return cb(null, null)
        if (data.expire && new Date(data.expire).getTime() <= Date.now()) return cb(null, null)
        cb(null, data.sess)
      })
      .catch(cb)
  }

  set(sid, sess, cb) {
    this.client.from(SESSION_TABLE).upsert({ sid, sess, expire: sessionExpiry(sess) }, { onConflict: 'sid' })
      .then(({ error }) => cb(error ? new Error(error.message) : null))
      .catch(cb)
  }

  destroy(sid, cb) {
    this.client.from(SESSION_TABLE).delete().eq('sid', sid)
      .then(({ error }) => cb(error ? new Error(error.message) : null))
      .catch(cb)
  }

  touch(sid, sess, cb) {
    this.client.from(SESSION_TABLE).update({ expire: sessionExpiry(sess) }).eq('sid', sid)
      .then(({ error }) => cb(error ? new Error(error.message) : null))
      .catch(cb)
  }

  clear(cb) {
    this.client.from(SESSION_TABLE).delete()
      .then(({ error }) => cb(error ? new Error(error.message) : null))
      .catch(cb)
  }
}

let store
if (supabaseAdmin) {
  store = new SupabaseSessionStore(supabaseAdmin)
} else {
  store = new session.MemoryStore()
  console.warn('[session] Supabase admin client not configured; using in-memory sessions (lost on restart).')
}

export const sessionMiddleware = session({
  name: env.sessionName,
  secret: env.sessionSecret,
  store,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: env.nodeEnv === 'production',
    sameSite: env.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: ttlMs,
  },
})
