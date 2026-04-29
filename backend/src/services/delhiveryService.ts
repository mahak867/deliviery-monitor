/**
 * Delhivery API service
 */
import axios from 'axios'
import { logger } from '../config/logger'

const DELHIVERY_BASE = 'https://track.delhivery.com/api/v1'

export async function trackDelhivery(waybill: string): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.DELHIVERY_API_KEY
  if (!apiKey) return null

  try {
    const res = await axios.get(`${DELHIVERY_BASE}/packages/json/`, {
      params:  { waybill },
      headers: { Authorization: `Token ${apiKey}` },
      timeout: 8000,
    })
    return res.data ?? null
  } catch (err) {
    logger.warn('Delhivery track failed', { waybill, error: (err as Error).message })
    return null
  }
}
