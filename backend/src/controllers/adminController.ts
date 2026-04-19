import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { query } from '../config/database'
import { logger } from '../config/logger'

// GET /api/admin/stats
export async function getAdminStats(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const [users, shipments, statusCounts] = await Promise.all([
      query<{ count: string }>('SELECT COUNT(*) FROM users'),
      query<{ count: string }>('SELECT COUNT(*) FROM shipments'),
      query<{ status: string; count: string }>(
        'SELECT status, COUNT(*) as count FROM shipments GROUP BY status',
      ),
    ])

    const statusMap: Record<string, number> = {}
    for (const row of statusCounts.rows) {
      statusMap[row.status] = parseInt(row.count, 10)
    }

    res.json({
      success: true,
      data: {
        totalUsers:     parseInt(users.rows[0]?.count     ?? '0', 10),
        totalShipments: parseInt(shipments.rows[0]?.count ?? '0', 10),
        statusBreakdown: statusMap,
      },
    })
  } catch (err) {
    logger.error('getAdminStats error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to fetch admin stats' })
  }
}

// GET /api/admin/shipments
export async function getAllShipments(req: AuthenticatedRequest, res: Response): Promise<void> {
  const page   = parseInt((req.query.page  as string) ?? '1',  10)
  const limit  = parseInt((req.query.limit as string) ?? '20', 10)
  const offset = (page - 1) * limit

  try {
    const [rows, count] = await Promise.all([
      query<Record<string, unknown>>(
        'SELECT * FROM shipments ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      ),
      query<{ count: string }>('SELECT COUNT(*) FROM shipments'),
    ])

    res.json({
      success: true,
      data:       rows.rows,
      pagination: {
        page,
        limit,
        total:      parseInt(count.rows[0]?.count ?? '0', 10),
        totalPages: Math.ceil(parseInt(count.rows[0]?.count ?? '0', 10) / limit),
      },
    })
  } catch (err) {
    logger.error('getAllShipments admin error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to fetch shipments' })
  }
}

// GET /api/admin/users
export async function getAllUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
  const page   = parseInt((req.query.page  as string) ?? '1',  10)
  const limit  = parseInt((req.query.limit as string) ?? '20', 10)
  const offset = (page - 1) * limit

  try {
    const [rows, count] = await Promise.all([
      query<Record<string, unknown>>(
        'SELECT id, phone, name, email, role, created_at FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset],
      ),
      query<{ count: string }>('SELECT COUNT(*) FROM users'),
    ])

    res.json({
      success: true,
      data:       rows.rows,
      pagination: {
        page,
        limit,
        total:      parseInt(count.rows[0]?.count ?? '0', 10),
        totalPages: Math.ceil(parseInt(count.rows[0]?.count ?? '0', 10) / limit),
      },
    })
  } catch (err) {
    logger.error('getAllUsers admin error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to fetch users' })
  }
}
