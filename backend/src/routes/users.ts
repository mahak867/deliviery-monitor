import { Router, Response } from 'express'
import { authenticate } from '../middleware/auth'
import { UserModel } from '../models/User'
import type { AuthenticatedRequest } from '../middleware/auth'
import { logger } from '../config/logger'

const router = Router()

router.put('/profile', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  const { name, email } = req.body as { name?: string; email?: string }
  try {
    const updated = await UserModel.update(req.user!.id, { name, email })
    if (!updated) { res.status(404).json({ success: false, error: 'User not found' }); return }
    res.json({ success: true, data: updated })
  } catch (err) {
    logger.error('updateProfile error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to update profile' })
  }
})

router.put('/preferences', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await UserModel.update(req.user!.id, { preferences: req.body })
    if (!updated) { res.status(404).json({ success: false, error: 'User not found' }); return }
    res.json({ success: true, data: updated })
  } catch (err) {
    logger.error('updatePreferences error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to update preferences' })
  }
})

router.delete('/account', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    await import('../config/database').then(({ query }) =>
      query('DELETE FROM users WHERE id = $1', [req.user!.id]),
    )
    res.json({ success: true, data: { message: 'Account deleted' } })
  } catch (err) {
    logger.error('deleteAccount error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to delete account' })
  }
})

export default router
