import { query } from '../config/database'

export interface DbShipment {
  id:               string
  user_id?:         string
  tracking_number:  string
  courier:          string
  status:           string
  origin:           Record<string, unknown>
  destination:      Record<string, unknown>
  current_location?: Record<string, unknown>
  estimated_delivery?: string
  actual_delivery?:    string
  product?:            Record<string, unknown>
  weight?:             number
  dimensions?:         Record<string, unknown>
  order_number?:       string
  is_favourite:        boolean
  is_archived:         boolean
  notes?:              string
  created_at:          string
  updated_at:          string
}

export const ShipmentModel = {
  async findByUserId(userId: string, opts: {
    page?:   number
    limit?:  number
    status?: string
  } = {}): Promise<{ rows: DbShipment[]; total: number }> {
    const { page = 1, limit = 20, status } = opts
    const offset  = (page - 1) * limit
    const params: unknown[] = [userId, limit, offset]
    let where = 'user_id = $1 AND is_archived = false'
    if (status) { where += ` AND status = $${params.length + 1}`; params.push(status) }

    try {
      const [rows, count] = await Promise.all([
        query<DbShipment>(
          `SELECT * FROM shipments WHERE ${where} ORDER BY updated_at DESC LIMIT $2 OFFSET $3`,
          params,
        ),
        query<{ count: string }>(
          `SELECT COUNT(*) FROM shipments WHERE ${where}`,
          [userId, ...(status ? [status] : [])],
        ),
      ])
      return { rows: rows.rows, total: parseInt(count.rows[0]?.count ?? '0', 10) }
    } catch {
      return { rows: [], total: 0 }
    }
  },

  async findById(id: string): Promise<DbShipment | null> {
    try {
      const result = await query<DbShipment>('SELECT * FROM shipments WHERE id = $1', [id])
      return result.rows[0] ?? null
    } catch {
      return null
    }
  },

  async findByTrackingNumber(trackingNumber: string): Promise<DbShipment | null> {
    try {
      const result = await query<DbShipment>(
        'SELECT * FROM shipments WHERE tracking_number = $1',
        [trackingNumber],
      )
      return result.rows[0] ?? null
    } catch {
      return null
    }
  },

  async create(data: {
    userId?:        string
    trackingNumber: string
    courier:        string
    origin?:        Record<string, unknown>
    destination?:   Record<string, unknown>
    product?:       Record<string, unknown>
    orderNumber?:   string
  }): Promise<DbShipment> {
    const result = await query<DbShipment>(
      `INSERT INTO shipments
         (user_id, tracking_number, courier, status, origin, destination, product, order_number)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        data.userId ?? null,
        data.trackingNumber,
        data.courier,
        'order_placed',
        JSON.stringify(data.origin    ?? {}),
        JSON.stringify(data.destination ?? {}),
        JSON.stringify(data.product   ?? {}),
        data.orderNumber ?? null,
      ],
    )
    return result.rows[0]
  },

  async updateStatus(id: string, status: string, currentLocation?: Record<string, unknown>): Promise<void> {
    await query(
      `UPDATE shipments
       SET status = $1, current_location = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, JSON.stringify(currentLocation ?? {}), id],
    )
  },

  async toggleFavourite(id: string): Promise<void> {
    await query(
      'UPDATE shipments SET is_favourite = NOT is_favourite, updated_at = NOW() WHERE id = $1',
      [id],
    )
  },

  async archive(id: string): Promise<void> {
    await query(
      'UPDATE shipments SET is_archived = true, updated_at = NOW() WHERE id = $1',
      [id],
    )
  },

  async delete(id: string): Promise<void> {
    await query('DELETE FROM shipments WHERE id = $1', [id])
  },

  async getStats(userId: string): Promise<Record<string, number>> {
    try {
      const result = await query<{ status: string; count: string }>(
        `SELECT status, COUNT(*) as count FROM shipments
         WHERE user_id = $1 AND is_archived = false
         GROUP BY status`,
        [userId],
      )
      const stats: Record<string, number> = {
        total: 0, active: 0, delivered: 0, delayed: 0, outForDelivery: 0, cancelled: 0,
      }
      for (const row of result.rows) {
        const c = parseInt(row.count, 10)
        stats.total += c
        if (row.status === 'delivered')        stats.delivered      += c
        if (row.status === 'delayed')          stats.delayed        += c
        if (row.status === 'out_for_delivery') stats.outForDelivery += c
        if (row.status === 'cancelled')        stats.cancelled      += c
        if (['shipped','in_transit','out_for_delivery','packed'].includes(row.status)) stats.active += c
      }
      return stats
    } catch {
      return { total: 0, active: 0, delivered: 0, delayed: 0, outForDelivery: 0, cancelled: 0 }
    }
  },
}
