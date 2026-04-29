import { Router } from 'express'
import { authenticate, requireAdmin } from '../middleware/auth'
import { getAdminStats, getAllShipments, getAllUsers } from '../controllers/adminController'
import type { AuthenticatedRequest } from '../middleware/auth'

const router = Router()

router.use(authenticate, requireAdmin)

router.get('/stats',     getAdminStats)
router.get('/shipments', getAllShipments)
router.get('/users',     getAllUsers)

export default router
