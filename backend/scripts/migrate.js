#!/usr/bin/env node
/*
 Apply the InterviewAI schema to your Supabase project.

 This app talks to Supabase over HTTPS (Auth + PostgREST), so it cannot execute
 DDL itself. Apply the schema once through the Supabase dashboard:

   1. npm run db:migrate        -> prints the full schema SQL (also: --print)
   2. Open your project at https://supabase.com/dashboard -> SQL Editor
   3. Paste the printed SQL and run it.
   4. PostgREST auto-detects the new tables within ~1 minute.
*/

import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(dir, '..', 'migrations')
const files = (await fs.readdir(migrationsDir)).filter((f) => f.endsWith('.sql')).sort()

let combined = ''
for (const file of files) {
  const content = await fs.readFile(path.join(migrationsDir, file), 'utf8')
  combined += `-- ===== ${file} =====\n${content.trim()}\n\n`
}

if (process.argv.includes('--print')) {
  console.log(combined)
} else {
  console.log('InterviewAI schema is applied via the Supabase SQL Editor.')
  console.log('1) Copy the migration SQL below (or run: node scripts/migrate.js --print)')
  console.log('2) In the Supabase dashboard, open SQL Editor for your project and paste it.')
  console.log('3) Run it. PostgREST auto-detects the new tables within ~1 minute.\n')
  console.log(combined)
}
