/**
 * AfterShip service — universal multi-courier tracking
 */
import axios from 'axios'
import { logger } from '../config/logger'

const AFTERSHIP_BASE = 'https://api.aftership.com/v4'

export async function trackAfterShip(
  trackingNumber: string,
  courier?: string,
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.AFTERSHIP_API_KEY
  if (!apiKey) return null

  const path = courier
    ? `/trackings/${encodeURIComponent(courier)}/${encodeURIComponent(trackingNumber)}`
    : `/trackings/${encodeURIComponent(trackingNumber)}`

  try {
    const res = await axios.get(`${AFTERSHIP_BASE}${path}`, {
      headers: { 'aftership-api-key': apiKey },
      timeout: 8000,
    })
    return res.data?.data?.tracking ?? null
  } catch (err) {
    logger.warn('AfterShip track failed', { trackingNumber, error: (err as Error).message })
    return null
  }
}

export async function createAfterShipTracking(
  trackingNumber: string,
  courier: string,
): Promise<boolean> {
  const apiKey = process.env.AFTERSHIP_API_KEY
  if (!apiKey) return false

  try {
    await axios.post(
      `${AFTERSHIP_BASE}/trackings`,
      { tracking: { tracking_number: trackingNumber, slug: courier } },
      { headers: { 'aftership-api-key': apiKey }, timeout: 8000 },
    )
    return true
  } catch (err) {
    logger.warn('AfterShip create tracking failed', { trackingNumber, error: (err as Error).message })
    return false
  }
}
