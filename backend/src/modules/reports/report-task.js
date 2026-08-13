import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { supabaseAdmin } from '../../utils/supabase-admin.js'
import { isTableMissing } from '../../utils/supabase-errors.js'
import { withTimeout } from '../../utils/timeout.js'

const cacheDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../storage/reports')
const inFlight = new Map()

export function startReportTask(sessionId, task) {
  if (inFlight.has(sessionId)) return inFlight.get(sessionId)
  const promise = Promise.resolve()
    .then(task)
    .finally(() => inFlight.delete(sessionId))
  inFlight.set(sessionId, promise)
  return promise
}

export function isReportPending(sessionId) {
  return inFlight.has(sessionId)
}

export async function readCachedReport(sessionId) {
  try {
    return JSON.parse(await fs.readFile(path.join(cacheDir, `${sessionId}.json`), 'utf8'))
  } catch {
    return null
  }
}

export async function writeCachedReport(sessionId, report) {
  try {
    await fs.mkdir(cacheDir, { recursive: true })
    await fs.writeFile(path.join(cacheDir, `${sessionId}.json`), JSON.stringify(report), 'utf8')
  } catch {
    // cache is best-effort only
  }
}

export async function writeReportToStore({ userId, sessionId, report }) {
  await writeCachedReport(sessionId, report)
  try {
    const { error } = await withTimeout(supabaseAdmin.from('session_reports').upsert({
      interview_session_id: sessionId,
      user_id: userId,
      summary: report.summary,
      overall_score: report.overallScore,
      strengths: report.strengths,
      improvements: report.improvements,
      solutions: report.solutions,
      skill_scores: report.skillScores,
    }, { onConflict: 'interview_session_id' }), 5000)
    if (error && !isTableMissing(error, 'session_reports')) {
      console.warn('Could not store report in DB:', error.message)
    }
  } catch (err) {
    console.warn('Report DB write skipped:', err.message)
  }
}

export async function readReportFromStore(sessionId) {
  // Local file cache first — instant and never depends on the network.
  const cached = await readCachedReport(sessionId)
  if (cached) return cached
  try {
    const { data: stored, error } = await withTimeout(supabaseAdmin.from('session_reports')
      .select('summary, overall_score, strengths, improvements, solutions, skill_scores')
      .eq('interview_session_id', sessionId)
      .maybeSingle(), 5000)
    if (error && !isTableMissing(error, 'session_reports')) throw error
    if (stored) {
      return {
        summary: stored.summary,
        overallScore: stored.overall_score,
        strengths: stored.strengths || [],
        improvements: stored.improvements || [],
        solutions: stored.solutions || [],
        skillScores: stored.skill_scores || {},
      }
    }
    return readCachedReport(sessionId)
  } catch (err) {
    console.warn('Report DB read skipped:', err.message)
    return readCachedReport(sessionId)
  }
}
