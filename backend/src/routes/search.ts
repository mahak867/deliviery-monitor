import { Router } from 'express'
import { optionalAuth } from '../middleware/auth'
import { searchLimiter } from '../middleware/rateLimiter'
import { search, publicTrack } from '../controllers/searchController'

const router = Router()

router.get('/track/:trackingNumber', searchLimiter, publicTrack)
router.get('/',                      searchLimiter, optionalAuth, search)

export default router
