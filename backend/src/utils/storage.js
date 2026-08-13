import path from 'node:path'
import { env } from '../config/env.js'

// Local disk storage is only writable under /tmp on serverless runtimes
// (Vercel). In development we keep files under <backend>/storage so the
// existing behaviour is preserved.
export function storageDir(sub) {
  return env.nodeEnv === 'production'
    ? `/tmp/${sub}`
    : path.join(process.cwd(), 'storage', sub)
}
