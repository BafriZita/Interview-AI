import mysql from 'mysql2/promise'
import { env } from './env.js'

export const db = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  queueLimit: 0,
  namedPlaceholders: true,
  timezone: 'Z',
  decimalNumbers: true,
})

export async function checkDatabaseConnection() {
  const connection = await db.getConnection()
  try { await connection.ping() } finally { connection.release() }
}
