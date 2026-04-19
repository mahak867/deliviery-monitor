/**
 * Shiprocket service — dedicated client for Shiprocket API
 */
import axios from 'axios'
import { logger } from '../config/logger'
import { getCache, setCache } from '../config/redis'

const SHIPROCKET_BASE = 'https://apiv2.shiprocket.in/v1/external'

let cachedToken: string | null     = null
let tokenExpiry: number | null     = null

async function getAuthToken(): Promise<string | null> {
  const now = Date.now()
  if (cachedToken && tokenExpiry && now < tokenExpiry) return cachedToken

  const cached = await getCache<string>('shiprocket:token')
  if (cached) { cachedToken = cached; return cached }

  const email    = process.env.SHIPROCKET_EMAIL
  const password = process.env.SHIPROCKET_PASSWORD
  if (!email || !password) return null

  try {
    const res = await axios.post(`${SHIPROCKET_BASE}/auth/login`, { email, password }, { timeout: 10000 })
    const token = res.data?.token as string | undefined
    if (!token) return null
    cachedToken = token
    tokenExpiry = now + 24 * 60 * 60 * 1000 // 24h
    await setCache('shiprocket:token', token, 23 * 60 * 60) // cache 23h
    return token
  } catch (err) {
    logger.warn('Shiprocket auth failed', { error: (err as Error).message })
    return null
  }
}

export async function trackShiprocket(awb: string): Promise<Record<string, unknown> | null> {
  const token = await getAuthToken()
  if (!token) return null

  try {
    const res = await axios.get(`${SHIPROCKET_BASE}/courier/track/awb/${awb}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 8000,
    })
    return res.data?.tracking_data ?? null
  } catch (err) {
    logger.warn('Shiprocket track failed', { awb, error: (err as Error).message })
    return null
  }
}
