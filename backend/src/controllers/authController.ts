import { Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import { UserModel } from '../models/User'
import { getCache, setCache } from '../config/redis'
import { logger } from '../config/logger'

const JWT_SECRET         = process.env.JWT_SECRET         ?? 'dev-secret'
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET ?? 'dev-refresh-secret'
const JWT_EXPIRES_IN     = process.env.JWT_EXPIRES_IN     ?? '15m'
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN ?? '7d'
const OTP_EXPIRY_MINUTES = parseInt(process.env.OTP_EXPIRY_MINUTES ?? '10', 10)

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

function generateTokens(user: { id: string; phone: string; role: string }) {
  const payload = { id: user.id, phone: user.phone, role: user.role }
  const accessToken  = jwt.sign(payload, JWT_SECRET,         { expiresIn: JWT_EXPIRES_IN     } as jwt.SignOptions)
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions)
  return { accessToken, refreshToken }
}

function sanitiseUser(user: { id: string; phone: string; name: string; email?: string; role: string; created_at: string; preferences: Record<string, unknown> }) {
  return {
    id:          user.id,
    phone:       user.phone,
    name:        user.name,
    email:       user.email,
    role:        user.role,
    createdAt:   user.created_at,
    preferences: user.preferences,
  }
}

// POST /api/auth/otp/send
export async function sendOtp(req: Request, res: Response): Promise<void> {
  const { phone } = req.body as { phone: string }
  const otp      = generateOtp()
  const cacheKey = `otp:${phone}`

  try {
    await setCache(cacheKey, otp, OTP_EXPIRY_MINUTES * 60)

    // In production send via Twilio; log in dev
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`[DEV] OTP for ${phone}: ${otp}`)
    } else {
      // TODO: twilio SMS
    }

    res.json({ success: true, data: { message: 'OTP sent successfully' } })
  } catch (err) {
    logger.error('sendOtp error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to send OTP' })
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  const { phone, otp } = req.body as { phone: string; otp: string }

  try {
    const cachedOtp = await getCache<string>(`otp:${phone}`)

    // Allow test OTP "123456" in development
    const isDevBypass = process.env.NODE_ENV !== 'production' && otp === '123456'
    if (!isDevBypass && cachedOtp !== otp) {
      res.status(401).json({ success: false, error: 'Invalid or expired OTP' })
      return
    }

    const user = await UserModel.findByPhone(phone)
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found. Please register first.' })
      return
    }

    const tokens = generateTokens(user)
    res.json({ success: true, data: { user: sanitiseUser(user), tokens } })
  } catch (err) {
    logger.error('login error', { error: err })
    res.status(500).json({ success: false, error: 'Login failed' })
  }
}

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  const { phone, name, email, otp } = req.body as {
    phone: string; name: string; email?: string; otp: string
  }

  try {
    const cachedOtp = await getCache<string>(`otp:${phone}`)
    const isDevBypass = process.env.NODE_ENV !== 'production' && otp === '123456'
    if (!isDevBypass && cachedOtp !== otp) {
      res.status(401).json({ success: false, error: 'Invalid or expired OTP' })
      return
    }

    const existing = await UserModel.findByPhone(phone)
    if (existing) {
      // User already exists — just log them in
      const tokens = generateTokens(existing)
      res.json({ success: true, data: { user: sanitiseUser(existing), tokens } })
      return
    }

    const user   = await UserModel.create({ phone, name, email })
    const tokens = generateTokens(user)
    res.status(201).json({ success: true, data: { user: sanitiseUser(user), tokens } })
  } catch (err) {
    logger.error('register error', { error: err })
    res.status(500).json({ success: false, error: 'Registration failed' })
  }
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response): Promise<void> {
  const { refreshToken } = req.body as { refreshToken: string }
  try {
    const payload = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      id: string; phone: string; role: 'user' | 'admin' | 'business'
    }
    const tokens = generateTokens(payload)
    res.json({ success: true, data: tokens })
  } catch {
    res.status(401).json({ success: false, error: 'Invalid refresh token' })
  }
}

// GET /api/auth/me
export async function me(req: Request & { user?: { id: string } }, res: Response): Promise<void> {
  try {
    const user = await UserModel.findById(req.user!.id)
    if (!user) { res.status(404).json({ success: false, error: 'User not found' }); return }
    res.json({ success: true, data: sanitiseUser(user) })
  } catch (err) {
    logger.error('me error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to fetch user' })
  }
}
