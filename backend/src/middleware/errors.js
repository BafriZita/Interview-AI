import multer from 'multer'
import { AppError } from '../utils/http.js'

export function notFound(req, _res, next) { next(new AppError(404, `Route ${req.method} ${req.path} was not found.`, 'NOT_FOUND')) }
export function errorHandler(error, _req, res, _next) {
  if (error instanceof multer.MulterError) return res.status(400).json({ success: false, error: { code: 'UPLOAD_ERROR', message: error.message } })
  const status = error.status || 500
  const message = status === 500 ? 'An unexpected server error occurred.' : error.message
  if (status === 500) console.error(error)
  res.status(status).json({ success: false, error: { code: error.code || 'SERVER_ERROR', message, ...(error.details && { details: error.details }) } })
}
