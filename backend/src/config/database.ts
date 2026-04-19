import { Pool, type PoolConfig } from 'pg'
import { logger } from './logger'

const config: PoolConfig = {
  connectionString: process.env.DATABASE_URL,
  host:             process.env.DB_HOST     || 'localhost',
  port:             parseInt(process.env.DB_PORT  || '5432', 10),
  database:         process.env.DB_NAME     || 'trackall_db',
  user:             process.env.DB_USER     || 'trackall',
  password:         process.env.DB_PASSWORD || 'trackall_pass',
  max:              20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
}

export const pool = new Pool(config)

pool.on('error', (err) => {
  logger.error('Unexpected PostgreSQL pool error', { error: err.message })
})

export async function connectDB(): Promise<void> {
  try {
    const client = await pool.connect()
    const result = await client.query('SELECT NOW()')
    client.release()
    logger.info('PostgreSQL connected', { time: result.rows[0].now })
  } catch (err) {
    logger.warn('PostgreSQL not available — running without database', { error: (err as Error).message })
    // Do not throw — allow server to start without DB in dev
  }
}

export async function query<T = unknown>(
  text: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number | null }> {
  const start = Date.now()
  const result = await pool.query(text, params)
  const duration = Date.now() - start
  if (duration > 1000) {
    logger.warn('Slow query detected', { text: text.slice(0, 100), duration })
  }
  return result as { rows: T[]; rowCount: number | null }
}
