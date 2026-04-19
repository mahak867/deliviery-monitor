import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { authLimiter, otpLimiter } from '../middleware/rateLimiter'
import { validate, sendOtpSchema, loginSchema, registerSchema } from '../middleware/validation'
import { sendOtp, login, register, refresh, me } from '../controllers/authController'

const router = Router()

router.post('/otp/send', otpLimiter,  validate(sendOtpSchema),  sendOtp)
router.post('/login',    authLimiter, validate(loginSchema),     login)
router.post('/register', authLimiter, validate(registerSchema),  register)
router.post('/refresh',               refresh)
router.get ('/me',       authenticate, me)
router.post('/logout',   authenticate, (_req, res) => {
  res.json({ success: true, data: { message: 'Logged out' } })
})

export default router
