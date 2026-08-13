import postgres from 'postgres'
import { config } from 'dotenv'
config({ path: 'C:/Users/LENV/Desktop/InterviewAI/InterviewAI/backend/.env' })

async function tryClient(name, make) {
  const sql = make()
  try {
    const r = await sql`select 1 as ok`
    console.log(name, 'OK', JSON.stringify(r[0]))
    await sql.end({ timeout: 3 })
    return true
  } catch (e) {
    console.log(name, 'FAIL', e.message)
    try { await sql.end({ timeout: 3 }) } catch {}
    return false
  }
}

await tryClient('URL', () => postgres(process.env.DATABASE_URL))
await tryClient('OPTS', () => postgres({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
}))
