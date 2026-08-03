import { AppError } from '../utils/http.js'

export function requireAuth(req, _res, next) {
  if (!req.session?.userId) return next(new AppError(401, 'Please sign in to continue.', 'AUTH_REQUIRED'))
  next()
}
