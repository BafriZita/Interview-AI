export class AppError extends Error {
  constructor(status, message, code = 'REQUEST_ERROR', details) {
    super(message); this.status = status; this.code = code; this.details = details
  }
}

export const asyncHandler = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next)
export const sendData = (res, data, status = 200) => res.status(status).json({ success: true, data })
