import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { validate, addShipmentSchema } from '../middleware/validation'
import {
  getAll,
  getStats,
  getById,
  addShipment,
  refreshShipment,
  toggleFavourite,
  archiveShipment,
  deleteShipment,
} from '../controllers/trackingController'

const router = Router()

router.get   ('/',              authenticate, getAll)
router.get   ('/stats',         authenticate, getStats)
router.get   ('/:id',           authenticate, getById)
router.post  ('/',              authenticate, validate(addShipmentSchema), addShipment)
router.post  ('/:id/refresh',   authenticate, refreshShipment)
router.patch ('/:id/favourite', authenticate, toggleFavourite)
router.patch ('/:id/archive',   authenticate, archiveShipment)
router.delete('/:id',           authenticate, deleteShipment)

export default router
