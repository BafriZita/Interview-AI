import { Router } from 'express'
import { asyncHandler, sendData } from '../../utils/http.js'
import { listNotifications, markRead, markAllRead } from './notification-store.js'

export const notificationRouter = Router()

notificationRouter.get('/', asyncHandler(async (req, res) => {
  const rows = await listNotifications(req.session.userId)
  const unread = (rows || []).filter((n) => !n.read).length
  sendData(res, { notifications: rows || [], unread })
}))

notificationRouter.post('/:id/read', asyncHandler(async (req, res) => {
  await markRead(req.session.userId, req.params.id)
  sendData(res, { message: 'Notification marked as read.' })
}))

notificationRouter.post('/read-all', asyncHandler(async (req, res) => {
  await markAllRead(req.session.userId)
  sendData(res, { message: 'All notifications marked as read.' })
}))
