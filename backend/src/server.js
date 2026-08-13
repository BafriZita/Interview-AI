import { app } from './app.js'
import { env } from './config/env.js'
import { testSupabaseConnection } from '../lib/supabase.js'

const result = await testSupabaseConnection()
if (result.ok) {
  console.log(`Supabase connection verified (${result.message} ${result.details || ''})`)
} else {
  console.warn(`Supabase is not available: ${result.message} ${result.details || ''}`)
}

app.listen(env.port, () => console.log(`InterviewAI API listening on http://localhost:${env.port}`))
