import { Response } from 'express'
import { AuthenticatedRequest } from '../middleware/auth'
import { ShipmentModel } from '../models/Shipment'
import { TrackingEventModel } from '../models/TrackingEvent'
import { fetchTrackingData } from '../services/courierService'
import { logger } from '../config/logger'

function buildShipmentResponse(s: Record<string, unknown>, events: Record<string, unknown>[]) {
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
    product:        s.product,
    weight:         s.weight,
    orderNumber:    s.order_number,
    isFavourite:    s.is_favourite,
    isArchived:     s.is_archived,
    notes:          s.notes,
    createdAt:      s.created_at,
    updatedAt:      s.updated_at,
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
}

// GET /api/tracking
export async function getAll(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.id
  const page   = parseInt((req.query.page as string) ?? '1', 10)
  const limit  = parseInt((req.query.limit as string) ?? '20', 10)
  const status = req.query.status as string | undefined

  try {
    const { rows, total } = await ShipmentModel.findByUserId(userId, { page, limit, status })
    const totalPages      = Math.ceil(total / limit)

    const data = await Promise.all(
      rows.map(async (s) => {
        const events = await TrackingEventModel.findByShipmentId(s.id)
        return buildShipmentResponse(s as unknown as Record<string, unknown>, events as unknown as Record<string, unknown>[])
      }),
    )

    res.json({
      success: true,
      data,
      pagination: { page, limit, total, totalPages },
    })
  } catch (err) {
    logger.error('getAll tracking error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to fetch shipments' })
  }
}

// GET /api/tracking/stats
export async function getStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const stats = await ShipmentModel.getStats(req.user!.id)
    res.json({ success: true, data: stats })
  } catch (err) {
    logger.error('getStats error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to fetch stats' })
  }
}

// GET /api/tracking/:id
export async function getById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const shipment = await ShipmentModel.findById(req.params.id)
    if (!shipment) { res.status(404).json({ success: false, error: 'Shipment not found' }); return }

    const events = await TrackingEventModel.findByShipmentId(shipment.id)
    res.json({
      success: true,
      data: buildShipmentResponse(
        shipment as unknown as Record<string, unknown>,
        events   as unknown as Record<string, unknown>[],
      ),
    })
  } catch (err) {
    logger.error('getById error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to fetch shipment' })
  }
}

// POST /api/tracking
export async function addShipment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { trackingNumber, courier } = req.body as { trackingNumber: string; courier?: string }
  const userId = req.user!.id

  try {
    // Check for duplicate
    const existing = await ShipmentModel.findByTrackingNumber(trackingNumber)
    if (existing && existing.user_id === userId) {
      res.status(409).json({ success: false, error: 'Shipment already in your list' })
      return
    }

    // Try to fetch live data
    const liveData = await fetchTrackingData(trackingNumber, courier)

    const shipment = await ShipmentModel.create({
      userId,
      trackingNumber,
      courier:     liveData?.courier ?? courier ?? 'unknown',
      origin:      liveData?.origin,
      destination: liveData?.destination,
      product:     liveData?.product,
    })

    if (liveData?.events?.length) {
      for (const event of liveData.events.reverse()) {
        await TrackingEventModel.create({
          shipmentId:  shipment.id,
          status:      event.status,
          description: event.description,
          location:    event.location,
          geoLocation: event.geoLocation,
          timestamp:   new Date(event.timestamp),
          courier:     liveData.courier,
        })
      }
      await ShipmentModel.updateStatus(shipment.id, liveData.status, liveData.currentLocation)
    }

    const events = await TrackingEventModel.findByShipmentId(shipment.id)
    const fresh  = await ShipmentModel.findById(shipment.id)
    res.status(201).json({
      success: true,
      data: buildShipmentResponse(
        fresh  as unknown as Record<string, unknown>,
        events as unknown as Record<string, unknown>[],
      ),
    })
  } catch (err) {
    logger.error('addShipment error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to add shipment' })
  }
}

// POST /api/tracking/:id/refresh
export async function refreshShipment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const shipment = await ShipmentModel.findById(req.params.id)
    if (!shipment) { res.status(404).json({ success: false, error: 'Shipment not found' }); return }

    const liveData = await fetchTrackingData(
      shipment.tracking_number as string,
      shipment.courier as string,
    )

    if (liveData) {
      await ShipmentModel.updateStatus(shipment.id, liveData.status, liveData.currentLocation)
      if (liveData.events?.length) {
        await TrackingEventModel.deleteByShipmentId(shipment.id)
        for (const event of liveData.events.reverse()) {
          await TrackingEventModel.create({
            shipmentId:  shipment.id,
            status:      event.status,
            description: event.description,
            location:    event.location,
            geoLocation: event.geoLocation,
            timestamp:   new Date(event.timestamp),
            courier:     liveData.courier,
          })
        }
      }
    }

    const events  = await TrackingEventModel.findByShipmentId(shipment.id)
    const updated = await ShipmentModel.findById(shipment.id)
    res.json({
      success: true,
      data: buildShipmentResponse(
        updated as unknown as Record<string, unknown>,
        events  as unknown as Record<string, unknown>[],
      ),
    })
  } catch (err) {
    logger.error('refreshShipment error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to refresh shipment' })
  }
}

// PATCH /api/tracking/:id/favourite
export async function toggleFavourite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await ShipmentModel.toggleFavourite(req.params.id)
    const updated = await ShipmentModel.findById(req.params.id)
    const events  = await TrackingEventModel.findByShipmentId(req.params.id)
    res.json({
      success: true,
      data: buildShipmentResponse(
        updated as unknown as Record<string, unknown>,
        events  as unknown as Record<string, unknown>[],
      ),
    })
  } catch (err) {
    logger.error('toggleFavourite error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to update shipment' })
  }
}

// PATCH /api/tracking/:id/archive
export async function archiveShipment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await ShipmentModel.archive(req.params.id)
    res.json({ success: true, data: null })
  } catch (err) {
    logger.error('archiveShipment error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to archive shipment' })
  }
}

// DELETE /api/tracking/:id
export async function deleteShipment(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    await TrackingEventModel.deleteByShipmentId(req.params.id)
    await ShipmentModel.delete(req.params.id)
    res.json({ success: true, data: null })
  } catch (err) {
    logger.error('deleteShipment error', { error: err })
    res.status(500).json({ success: false, error: 'Failed to delete shipment' })
  }
}
