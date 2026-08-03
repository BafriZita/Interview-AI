import fs from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { env } from '../src/config/env.js'

const sql = await fs.readFile(new URL('../database/schema.sql', import.meta.url), 'utf8')
const connection = await mysql.createConnection({ ...env.db, database: undefined, multipleStatements: true })
if (!/^[a-zA-Z0-9_]+$/.test(env.db.database)) throw new Error('DB_NAME may contain only letters, numbers, and underscores.')
try {
  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${env.db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
  await connection.query(`USE \`${env.db.database}\``)
  await connection.query(sql)
  console.log(`Database ${env.db.database} is ready.`)
} finally { await connection.end() }
