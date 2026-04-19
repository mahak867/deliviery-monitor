import { query } from '../config/database'

export interface DbNotification {
  id:           string
  user_id:      string
  shipment_id?: string
  type:         string
  title:        string
  message:      string
  is_read:      boolean
  created_at:   string
  metadata?:    Record<string, unknown>
}

export const NotificationModel = {
  async findByUserId(userId: string, opts: {
    page?:       number
    limit?:      number
    unreadOnly?: boolean
  } = {}): Promise<{ rows: DbNotification[]; total: number }> {
    const { page = 1, limit = 30, unreadOnly = false } = opts
    const offset = (page - 1) * limit
    let where    = 'user_id = $1'
    const params: unknown[] = [userId, limit, offset]
    if (unreadOnly) where += ' AND is_read = false'

    try {
      const [rows, count] = await Promise.all([
        query<DbNotification>(
          `SELECT * FROM notifications WHERE ${where} ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
          params,
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) FROM notifications WHERE ${where}`,
          [userId],
        ),
      ])
      return { rows: rows.rows, total: parseInt(count.rows[0]?.count ?? '0', 10) }
    } catch {
      return { rows: [], total: 0 }
    }
  },

  async create(data: {
    userId:      string
    shipmentId?: string
    type:        string
    title:       string
    message:     string
    metadata?:   Record<string, unknown>
  }): Promise<DbNotification | null> {
    try {
      const result = await query<DbNotification>(
        `INSERT INTO notifications (user_id, shipment_id, type, title, message, metadata)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          data.userId,
          data.shipmentId ?? null,
          data.type,
          data.title,
          data.message,
          JSON.stringify(data.metadata ?? {}),
        ],
      )
      return result.rows[0]
    } catch {
      return null
    }
  },

  async markRead(id: string, userId: string): Promise<void> {
    await query(
      'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2',
      [id, userId],
    )
  },

  async markAllRead(userId: string): Promise<void> {
    await query(
      'UPDATE notifications SET is_read = true WHERE user_id = $1 AND is_read = false',
      [userId],
    )
  },

  async delete(id: string, userId: string): Promise<void> {
    await query('DELETE FROM notifications WHERE id = $1 AND user_id = $2', [id, userId])
  },

  async unreadCount(userId: string): Promise<number> {
    try {
      const result = await query<{ count: string }>(
        'SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false',
        [userId],
      )
      return parseInt(result.rows[0]?.count ?? '0', 10)
    } catch {
      return 0
    }
  },
}
