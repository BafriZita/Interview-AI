import { AppError } from './http.js'

export const validate = (schema, source = 'body') => (req, _res, next) => {
  const result = schema.safeParse(req[source])
  if (!result.success) return next(new AppError(422, 'Please check the submitted information.', 'VALIDATION_ERROR', result.error.flatten()))
  req[source] = result.data
  next()
}
