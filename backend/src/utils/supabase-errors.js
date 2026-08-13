import { AppError } from './http.js'

const NETWORK_PATTERN = /fetch failed|ECONNRESET|ECONNREFUSED|ETIMEDOUT|ENOTFOUND|socket hang up|timeout|network/i

export function isNetworkError(error) {
  if (!error) return false
  const message = String(error.message || error.cause?.message || '')
  return NETWORK_PATTERN.test(message)
}

export function isColumnMissing(error, column) {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '')
  if (code === 'PGRST204') {
    // PostgREST: "<name> column of '<table>' not found in the schema cache"
    return column ? new RegExp(`\\b${column}\\b`, 'i').test(message) : true
  }
  if (code === '42703' || code === '42P01') return true
  if (column) return new RegExp(`column [^ ]+\\.${column} does not exist`, 'i').test(message)
  return /column .* does not exist/i.test(message)
}

export function isTableMissing(error, table) {
  if (!error) return false
  const code = String(error.code || '')
  const message = String(error.message || '')
  if (code === 'PGRST205' || code === '42P01') return true
  if (table) return new RegExp(`\\b${table}\\b`, 'i').test(message) && /does not exist|could not find/i.test(message)
  return /does not exist|could not find/i.test(message)
}

export function toFriendlyError(error, { action = 'complete this request' } = {}) {
  if (!error || error instanceof AppError) return error
  if (isNetworkError(error)) {
    return new AppError(502, `Could not reach the server to ${action}. Please check your connection and try again.`, 'SERVICE_UNAVAILABLE')
  }
  if (error.status && error.status < 500) {
    return new AppError(error.status, error.message, error.code || 'REQUEST_ERROR')
  }
  return error
}
