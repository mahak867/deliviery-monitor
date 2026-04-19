import { Router, Request, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { NotificationModel } from '../models/Notification'
import type { AuthenticatedRequest } from '../middleware/auth'
import { logger } from '../config/logger'

const router = Router()

router.get('/', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const page       = parseInt((req.query.page       as string) ?? '1',    10)
  const limit      = parseInt((req.query.limit      as string) ?? '30',   10)
  const unreadOnly = (req.query.unreadOnly as string) === 'true'

  try {
    const { rows, total } = await NotificationModel.findByUserId(req.user!.id, { page, limit, unreadOnly })
    res.json({
      success: true,
      data:       rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    })
  } catch (err) {
    logger.error('getNotifications error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to fetch notifications' })
  }
})

router.get('/unread-count', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const count = await NotificationModel.unreadCount(req.user!.id)
    res.json({ success: true, data: { count } })
  } catch {
    res.json({ success: true, data: { count: 0 } })
  }
})

router.patch('/:id/read', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await NotificationModel.markRead(req.params.id, req.user!.id)
    res.json({ success: true, data: null })
  } catch (err) {
    logger.error('markRead error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to mark notification read' })
  }
})

router.patch('/read-all', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await NotificationModel.markAllRead(req.user!.id)
    res.json({ success: true, data: null })
  } catch (err) {
    logger.error('markAllRead error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to mark all read' })
  }
})

router.delete('/:id', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await NotificationModel.delete(req.params.id, req.user!.id)
    res.json({ success: true, data: null })
  } catch (err) {
    logger.error('deleteNotification error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to delete notification' })
  }
})

export default router
