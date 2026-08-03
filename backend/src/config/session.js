import session from 'express-session'
import MySQLStoreFactory from 'express-mysql-session'
import { env } from './env.js'

const MySQLStore = MySQLStoreFactory(session)
const store = new MySQLStore({
  ...env.db,
  createDatabaseTable: true,
  schema: { tableName: 'user_sessions', columnNames: { session_id: 'session_id', expires: 'expires', data: 'data' } },
})

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
    maxAge: env.sessionTtlHours * 60 * 60 * 1000,
  },
})
