import { Request, Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { ShipmentModel } from '../models/Shipment'
import { TrackingEventModel } from '../models/TrackingEvent'
import { fetchTrackingData } from '../services/courierService'
import { query } from '../config/database'
import { logger } from '../config/logger'

// GET /api/search?q=…
export async function search(req: AuthenticatedRequest, res: Response): Promise<void> {
  const q      = (req.query.q as string ?? '').trim()
  const page   = parseInt((req.query.page  as string) ?? '1',  10)
  const limit  = parseInt((req.query.limit as string) ?? '10', 10)
  const offset = (page - 1) * limit

  if (!q) { res.status(400).json({ success: false, error: 'Query is required' }); return }

  try {
    const searchTerm = `%${q}%`
    const params: unknown[] = [searchTerm, searchTerm, searchTerm, searchTerm, limit, offset]
    let userWhere = ''
    if (req.user) {
      params.push(req.user.id)
      userWhere = ` AND user_id = $${params.length}`
    }

    const result = await query<Record<string, unknown>>(
      `SELECT * FROM shipments
       WHERE (
         tracking_number ILIKE $1 OR
         CAST(product AS TEXT) ILIKE $2 OR
         CAST(origin AS TEXT) ILIKE $3 OR
         CAST(destination AS TEXT) ILIKE $4
       ) ${userWhere}
       ORDER BY updated_at DESC
       LIMIT $5 OFFSET $6`,
      params,
    )

    const shipments = await Promise.all(
      result.rows.map(async (s) => {
        const events = await TrackingEventModel.findByShipmentId(s.id as string)
        return {
          id:             s.id,
          trackingNumber: s.tracking_number,
          courier:        s.courier,
          status:         s.status,
          origin:         s.origin,
          destination:    s.destination,
          currentLocation: s.current_location,
          estimatedDelivery: s.estimated_delivery,
          actualDelivery:    s.actual_delivery,
          product:           s.product,
          isFavourite:       s.is_favourite,
          isArchived:        s.is_archived,
          createdAt:         s.created_at,
          updatedAt:         s.updated_at,
          events: events.map((e) => ({
            id:          e.id,
            shipmentId:  e.shipment_id,
            status:      e.status,
            description: e.description,
            location:    e.location,
            geoLocation: e.geo_location,
            timestamp:   e.timestamp,
            courier:     e.courier,
            isLatest:    e.is_latest,
          })),
        }
      }),
    )

    res.json({
      success: true,
      data: {
        shipments,
        total:       shipments.length,
        query:       q,
        suggestions: [],
      },
    })
  } catch (err) {
    logger.error('search error', { error: err })
    res.status(500).json({ success: false, error: 'Search failed' })
  }
}

// GET /api/search/track/:trackingNumber  (public)
export async function publicTrack(req: Request, res: Response): Promise<void> {
  const { trackingNumber } = req.params

  try {
    // 1. Check DB
    const existing = await ShipmentModel.findByTrackingNumber(trackingNumber)
    if (existing) {
      const events = await TrackingEventModel.findByShipmentId(existing.id)
      res.json({
        success: true,
        data: {
          id:             existing.id,
          trackingNumber: existing.tracking_number,
          courier:        existing.courier,
          status:         existing.status,
          origin:         existing.origin,
          destination:    existing.destination,
          currentLocation: existing.current_location,
          estimatedDelivery: existing.estimated_delivery,
          isFavourite:    false,
          isArchived:     false,
          createdAt:      existing.created_at,
          updatedAt:      existing.updated_at,
          events: events.map((e) => ({
            id:          e.id,
            shipmentId:  e.shipment_id,
            status:      e.status,
            description: e.description,
            location:    e.location,
            geoLocation: e.geo_location,
            timestamp:   e.timestamp,
            courier:     e.courier,
            isLatest:    e.is_latest,
          })),
        },
      })
      return
    }

    // 2. Fetch live
    const liveData = await fetchTrackingData(trackingNumber)
    if (!liveData) {
      res.status(404).json({ success: false, error: 'Tracking number not found' })
      return
    }

    res.json({ success: true, data: liveData })
  } catch (err) {
    logger.error('publicTrack error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to track shipment' })
  }
}
