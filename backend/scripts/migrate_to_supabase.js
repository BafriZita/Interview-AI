#!/usr/bin/env node
/*
 Migration script (dry-run capable).
 - Exports MySQL rows, creates Supabase users (admin) with temporary passwords, inserts into Postgres via DATABASE_URL.
 - Creates mapping in migration_user_map.

 USAGE:
  node migrate_to_supabase.js --dry-run
  node migrate_to_supabase.js

 IMPORTANT: set env vars: MYSQL_* via env or .env, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, DATABASE_URL
*/

import mysql from 'mysql2/promise'
import postgres from 'postgres'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import { env } from '../src/config/env.js'

const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')

async function main() {
  console.log('Migration started', dryRun ? '(dry-run)' : '')
  const mysqlPool = await mysql.createPool({
    host: process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
  })
  const sql = postgres(process.env.DATABASE_URL)
  const supabaseAdmin = createClient(env.supabase.url, env.supabase.serviceRoleKey)

  // ensure target tables exist
  console.log('Checking target DB connection...')
  await sql`select 1`

  const [users] = await mysqlPool.execute('SELECT id,full_name,email,created_at FROM users')
  console.log(`Found ${users.length} MySQL users.`)

  for (const u of users) {
    console.log(`Migrating user ${u.email}`)
    if (dryRun) { console.log('[dry-run] would create supabase user and insert profile'); continue }

    // create supabase user with random temp password and send reset
    const tempPassword = crypto.randomBytes(16).toString('hex')
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: u.email,
      password: tempPassword,
      email_confirm: false,
      user_metadata: { full_name: u.full_name },
    })
    if (error) { console.error('Error creating supabase user', error); continue }
    const newUser = data.user
    console.log(`Created supabase user ${newUser.id}`)

    // insert mapping
    await sql`
      INSERT INTO migration_user_map (old_user_id, new_user_id) VALUES (${u.id}, ${newUser.id})
      ON CONFLICT (old_user_id) DO NOTHING
    `

    // create profile
    await sql`
      INSERT INTO profiles (user_id, full_name, created_at, updated_at)
      VALUES (${newUser.id}, ${u.full_name}, ${u.created_at}, ${u.created_at})
      ON CONFLICT (user_id) DO NOTHING
    `

    // generate a password recovery link so the migrated user can set a new password
    try {
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({ type: 'recovery', email: u.email })
      if (linkError) console.warn('Failed to generate recovery link', linkError.message)
      else console.log('Recovery link generated for', u.email, linkData?.properties?.action_link || '')
    } catch (e) {
      console.warn('Failed to generate recovery link', e.message)
    }
  }

  // Example: migrate resumes
  const [resumes] = await mysqlPool.execute('SELECT * FROM resumes')
  console.log(`Found ${resumes.length} resumes.`)
  for (const r of resumes) {
    const map = await sql`SELECT new_user_id FROM migration_user_map WHERE old_user_id = ${r.user_id}`
    if (!map[0]) { console.warn('No mapping for resume user', r.user_id); continue }
    const newUserId = map[0].new_user_id
    if (dryRun) { console.log(`[dry-run] would insert resume for ${r.original_name} -> user ${newUserId}`); continue }
    await sql`
      INSERT INTO resumes (user_id, original_name, stored_name, mime_type, file_size, extracted_text, strength_score, is_primary, status, created_at, updated_at)
      VALUES (${newUserId}, ${r.original_name}, ${r.stored_name}, ${r.mime_type}, ${r.file_size}, ${r.extracted_text}, ${r.strength_score}, ${r.is_primary}, ${r.status}, ${r.created_at}, ${r.updated_at})
    `
  }

  console.log('Migration completed')
  await mysqlPool.end()
  sql.end({ timeout: 0 })
}

main().catch(err => { console.error(err); process.exit(1) })
