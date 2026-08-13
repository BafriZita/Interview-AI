import fs from 'node:fs/promises'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { supabaseAdmin } from '../../utils/supabase-admin.js'
import { isTableMissing } from '../../utils/supabase-errors.js'
import { withTimeout } from '../../utils/timeout.js'

const cacheDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../../storage/notifications')

async function cacheFile(userId) {
  return path.join(cacheDir, `${userId}.json`)
}

async function readCache(userId) {
  try {
    const list = JSON.parse(await fs.readFile(await cacheFile(userId), 'utf8'))
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

async function writeCache(userId, list) {
  try {
    await fs.mkdir(cacheDir, { recursive: true })
    await fs.writeFile(await cacheFile(userId), JSON.stringify(list), 'utf8')
  } catch {
    // cache is best-effort only
  }
}

// migration 002 adds the notifications table; before it is applied we persist
// to a per-user file so the notification centre still works.
export async function createNotification(userId, { title, body, type = 'general' }) {
  if (!userId || !title) return
  const row = { id: randomUUID(), user_id: userId, title, body: body || '', type, read: false, created_at: new Date().toISOString() }
  let error
  try {
    ;({ error } = await withTimeout(supabaseAdmin.from('notifications').insert({ user_id: userId, title, body: body || '', type }), 5000))
  } catch (err) {
    error = err
  }
  if (error && isTableMissing(error, 'notifications')) {
    const list = await readCache(userId)
    list.unshift(row)
    await writeCache(userId, list.slice(0, 50))
    return
  }
  if (error) console.warn('Failed to create notification:', error.message)
}

export async function listNotifications(userId) {
  const { data, error } = await supabaseAdmin.from('notifications')
    .select('id,title,body,type,read,created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error && isTableMissing(error, 'notifications')) {
    const list = await readCache(userId)
    return list.map(({ user_id, ...n }) => n)
  }
  if (error) throw error
  return data || []
}

export async function markRead(userId, id) {
  const { error } = await supabaseAdmin.from('notifications').update({ read: true }).eq('id', id).eq('user_id', userId)
  if (error && isTableMissing(error, 'notifications')) {
    const list = await readCache(userId)
    for (const n of list) if (n.id === id) n.read = true
    await writeCache(userId, list)
    return
  }
  if (error) throw error
}

export async function markAllRead(userId) {
  const { error } = await supabaseAdmin.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false)
  if (error && isTableMissing(error, 'notifications')) {
    const list = await readCache(userId)
    for (const n of list) n.read = true
    await writeCache(userId, list)
    return
  }
  if (error) throw error
}
