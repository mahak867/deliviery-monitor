import { query } from '../config/database'

export interface DbTrackingEvent {
  id:           string
  shipment_id:  string
  status:       string
  description:  string
  location:     string
  geo_location?: Record<string, unknown>
  timestamp:    string
  courier:      string
  is_latest:    boolean
}

export const TrackingEventModel = {
  async findByShipmentId(shipmentId: string): Promise<DbTrackingEvent[]> {
    try {
      const result = await query<DbTrackingEvent>(
        'SELECT * FROM tracking_events WHERE shipment_id = $1 ORDER BY timestamp DESC',
        [shipmentId],
      )
      return result.rows
    } catch {
      return []
    }
  },

  async create(data: {
    shipmentId:   string
    status:       string
    description:  string
    location:     string
    geoLocation?: Record<string, unknown>
    timestamp?:   Date
    courier:      string
  }): Promise<DbTrackingEvent> {
    // Mark all existing events as not latest
    await query(
      'UPDATE tracking_events SET is_latest = false WHERE shipment_id = $1',
      [data.shipmentId],
    )

    const result = await query<DbTrackingEvent>(
      `INSERT INTO tracking_events
         (shipment_id, status, description, location, geo_location, timestamp, courier, is_latest)
       VALUES ($1,$2,$3,$4,$5,$6,$7,true)
       RETURNING *`,
      [
        data.shipmentId,
        data.status,
        data.description,
        data.location,
        JSON.stringify(data.geoLocation ?? {}),
        data.timestamp ?? new Date(),
        data.courier,
      ],
    )
    return result.rows[0]
  },

  async deleteByShipmentId(shipmentId: string): Promise<void> {
    await query('DELETE FROM tracking_events WHERE shipment_id = $1', [shipmentId])
  },
}
