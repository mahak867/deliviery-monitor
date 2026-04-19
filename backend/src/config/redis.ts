import { createClient } from 'redis'
import { logger } from './logger'

export const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
})

redisClient.on('error', (err) => {
  logger.warn('Redis error (non-fatal)', { error: err.message })
})

export async function connectRedis(): Promise<void> {
  try {
    await redisClient.connect()
    logger.info('Redis connected')
  } catch (err) {
    logger.warn('Redis not available — caching disabled', { error: (err as Error).message })
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  try {
    const value = await redisClient.get(key)
    return value ? (JSON.parse(value) as T) : null
  } catch {
    return null
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  try {
    await redisClient.setEx(key, ttlSeconds, JSON.stringify(value))
  } catch {
    // Silently fail — cache is best-effort
  }
}

export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const keys = await redisClient.keys(pattern)
    if (keys.length > 0) await redisClient.del(keys)
  } catch {
    // Silently fail
  }
}
