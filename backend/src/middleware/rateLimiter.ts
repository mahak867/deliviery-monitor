import rateLimit from 'express-rate-limit'

export const defaultLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max:      100,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many requests, please try again later.' },
})

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many auth attempts. Please wait 15 minutes.' },
})

export const otpLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max:      5,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many OTP requests. Please try again in 1 hour.' },
})

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max:      30,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { success: false, error: 'Too many search requests. Slow down!' },
})
