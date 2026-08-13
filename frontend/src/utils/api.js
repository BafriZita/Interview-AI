export async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  })
  if (res.status === 204) return null
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.error?.message
      || (body === null ? 'The server is not responding right now. Please try again in a moment.' : 'Something went wrong. Please try again.')
    const error = new Error(message)
    error.code = body?.error?.code
    error.status = res.status
    throw error
  }
  return body.data
}

export async function apiUpload(path, field, file) {
  const form = new FormData()
  form.append(field, file)
  const res = await fetch(path, { method: 'POST', credentials: 'include', body: form })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const message = body?.error?.message
      || (body === null ? 'The server is not responding right now. Please try again in a moment.' : 'Something went wrong. Please try again.')
    const error = new Error(message)
    error.code = body?.error?.code
    error.status = res.status
    throw error
  }
  return body.data
}

export function storeUser(user) {
  const safe = user || {}
  localStorage.setItem('interviewai.user', JSON.stringify({ ...safe, username: safe.fullName || safe.username || '' }))
  localStorage.setItem('interviewai.username', safe.fullName || safe.username || '')
}

export function clearUser() {
  localStorage.removeItem('interviewai.user')
  localStorage.removeItem('interviewai.username')
  localStorage.removeItem('interviewai.dashboardSeen')
}
