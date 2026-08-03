import fs from 'node:fs/promises'
import mysql from 'mysql2/promise'
import { env } from '../src/config/env.js'
const sql = await fs.readFile(new URL('../database/seed.sql', import.meta.url), 'utf8')
const connection = await mysql.createConnection({ ...env.db, multipleStatements: true })
try { await connection.query(sql); console.log('Development data seeded.') } finally { await connection.end() }
