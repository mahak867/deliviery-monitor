import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthenticatedRequest extends Request {
  user?: {
    id:    string
    phone: string
    role:  'user' | 'admin' | 'business'
  }
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Authentication required' })
    return
  }
  const token   = authHeader.slice(7)
  const secret  = process.env.JWT_SECRET ?? 'dev-secret'
  try {
    const payload = jwt.verify(token, secret) as {
      id: string; phone: string; role: 'user' | 'admin' | 'business'
    }
    req.user = payload
    next()
  } catch {
    res.status(401).json({ success: false, error: 'Invalid or expired token' })
  }
}

export function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (req.user?.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' })
    return
  }
  next()
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token  = authHeader.slice(7)
    const secret = process.env.JWT_SECRET ?? 'dev-secret'
    try {
      const payload = jwt.verify(token, secret) as {
        id: string; phone: string; role: 'user' | 'admin' | 'business'
      }
      req.user = payload
    } catch {
      // Ignore invalid token for optional auth
    }
  }
  next()
}
