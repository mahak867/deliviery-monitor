/**
 * Courier aggregation service
 * Attempts to fetch live data from multiple courier APIs.
 * Falls back to mock data in development when APIs are unavailable.
 */
import axios from 'axios'
import { Server as SocketIOServer } from 'socket.io'
import { logger } from '../config/logger'
import { ShipmentModel } from '../models/Shipment'
import { TrackingEventModel } from '../models/TrackingEvent'
import { query } from '../config/database'
import type { DbShipment } from '../models/Shipment'

export interface LiveTrackingData {
  trackingNumber:  string
  courier:         string
  status:          string
  origin?:         Record<string, unknown>
  destination?:    Record<string, unknown>
  currentLocation?: Record<string, unknown>
  estimatedDelivery?: string
  product?:        Record<string, unknown>
  events: Array<{
    status:       string
    description:  string
    location:     string
    geoLocation?: Record<string, unknown>
    timestamp:    string
  }>
}

// ── Courier detection ─────────────────────────────────────────────────────────

export function detectCourier(trackingNumber: string): string | null {
  const patterns: Array<[RegExp, string]> = [
    [/^\d{12}$/,           'delhivery'],
    [/^[A-Z]{3}\d{9}IN$/,  'india_post'],
    [/^\d{10}$/,           'dtdc'],
    [/^FMPP\d+$/,          'ekart'],
    [/^AMZN\d+$/,          'amazon_logistics'],
    [/^B\d{10}$/,          'bluedart'],
    [/^XB\d+$/,            'xpressbees'],
    [/^SF\d+$/,            'shadowfax'],
  ]
  for (const [regex, courier] of patterns) {
    if (regex.test(trackingNumber)) return courier
  }
  return null
}

// ── Mock data generator ───────────────────────────────────────────────────────

function generateMockData(trackingNumber: string, courier: string): LiveTrackingData {
  const statuses = ['order_placed', 'packed', 'shipped', 'in_transit']
  const status   = statuses[Math.floor(Math.random() * statuses.length)]
  const cities   = [
    { city: 'Mumbai',    state: 'Maharashtra', lat: 19.0760, lng: 72.8777 },
    { city: 'Delhi',     state: 'Delhi',       lat: 28.7041, lng: 77.1025 },
    { city: 'Bengaluru', state: 'Karnataka',   lat: 12.9716, lng: 77.5946 },
    { city: 'Chennai',   state: 'Tamil Nadu',  lat: 13.0827, lng: 80.2707 },
    { city: 'Kolkata',   state: 'West Bengal', lat: 22.5726, lng: 88.3639 },
  ]

  const origin = cities[Math.floor(Math.random() * cities.length)]
  const dest   = cities.filter((c) => c.city !== origin.city)[Math.floor(Math.random() * 4)]
  const current = cities[Math.floor(Math.random() * cities.length)]

  return {
    trackingNumber,
    courier,
    status,
    origin:      { city: origin.city, state: origin.state, pincode: '400001', address: 'Warehouse' },
    destination: { city: dest.city,   state: dest.state,   pincode: '560001', address: 'Delivery Address', name: 'Customer', phone: '9876543210' },
    currentLocation: { lat: current.lat, lng: current.lng, city: current.city, state: current.state },
    estimatedDelivery: new Date(Date.now() + 86400000 * 3).toISOString(),
    events: [
      {
        status:      status,
        description: `Package is ${status.replace(/_/g, ' ')} at ${current.city}`,
        location:    `${current.city}, ${current.state}`,
        geoLocation: { lat: current.lat, lng: current.lng, city: current.city, state: current.state },
        timestamp:   new Date().toISOString(),
      },
      {
        status:      'shipped',
        description: 'Package dispatched from origin facility',
        location:    `${origin.city}, ${origin.state}`,
        geoLocation: { lat: origin.lat, lng: origin.lng, city: origin.city, state: origin.state },
        timestamp:   new Date(Date.now() - 86400000).toISOString(),
      },
      {
        status:      'order_placed',
        description: 'Order received and confirmed',
        location:    'Online',
        timestamp:   new Date(Date.now() - 86400000 * 2).toISOString(),
      },
    ],
  }
}

// ── Main fetch function ───────────────────────────────────────────────────────

export async function fetchTrackingData(
  trackingNumber: string,
  courier?: string,
): Promise<LiveTrackingData | null> {
  const detectedCourier = courier ?? detectCourier(trackingNumber) ?? 'unknown'

  // Try Aftership universal API first (if configured)
  const aftershipKey = process.env.AFTERSHIP_API_KEY
  if (aftershipKey) {
    try {
      const response = await axios.get(
        `https://api.aftership.com/v4/trackings/${detectedCourier}/${trackingNumber}`,
        {
          headers: { 'aftership-api-key': aftershipKey },
          timeout: 8000,
        },
      )
      const d = response.data?.data?.tracking
      if (d) {
        return {
          trackingNumber,
          courier: detectedCourier,
          status:  mapAftershipStatus(d.tag),
          currentLocation: d.current_location
            ? { city: d.current_location, state: '' }
            : undefined,
          estimatedDelivery: d.expected_delivery,
          events: (d.checkpoints ?? []).map((cp: Record<string, unknown>) => ({
            status:      mapAftershipStatus(cp.tag as string),
            description: (cp.message as string) ?? '',
            location:    (cp.location as string) ?? '',
            timestamp:   (cp.checkpoint_time as string) ?? new Date().toISOString(),
          })),
        }
      }
    } catch (err) {
      logger.debug('Aftership API error (non-fatal)', { error: (err as Error).message })
    }
  }

  // Try Shiprocket if configured
  const shiprocketToken = process.env.SHIPROCKET_TOKEN
  if (shiprocketToken) {
    try {
      const response = await axios.get(
        `https://apiv2.shiprocket.in/v1/external/courier/track/awb/${trackingNumber}`,
        {
          headers: { Authorization: `Bearer ${shiprocketToken}` },
          timeout: 8000,
        },
      )
      if (response.data?.tracking_data) {
        const td = response.data.tracking_data
        return {
          trackingNumber,
          courier: detectedCourier,
          status:  mapShiprocketStatus(td.shipment_track?.[0]?.current_status),
          events: (td.shipment_track_activities ?? []).map((a: Record<string, unknown>) => ({
            status:      mapShiprocketStatus(a.status as string),
            description: (a.activity as string) ?? '',
            location:    (a.location as string) ?? '',
            timestamp:   (a.date as string)     ?? new Date().toISOString(),
          })),
        }
      }
    } catch (err) {
      logger.debug('Shiprocket API error (non-fatal)', { error: (err as Error).message })
    }
  }

  // In development: return mock data
  if (process.env.NODE_ENV !== 'production') {
    logger.debug(`Using mock data for ${trackingNumber}`)
    return generateMockData(trackingNumber, detectedCourier)
  }

  return null
}

// ── Status mappers ────────────────────────────────────────────────────────────

function mapAftershipStatus(tag: string): string {
  const map: Record<string, string> = {
    Pending:           'order_placed',
    InfoReceived:      'packed',
    InTransit:         'in_transit',
    OutForDelivery:    'out_for_delivery',
    AttemptFail:       'failed_delivery',
    Delivered:         'delivered',
    Exception:         'delayed',
    Expired:           'cancelled',
  }
  return map[tag] ?? 'in_transit'
}

function mapShiprocketStatus(status: string): string {
  if (!status) return 'in_transit'
  const s = status.toLowerCase()
  if (s.includes('delivered'))        return 'delivered'
  if (s.includes('out for delivery')) return 'out_for_delivery'
  if (s.includes('transit'))          return 'in_transit'
  if (s.includes('pickup'))           return 'packed'
  if (s.includes('cancel'))           return 'cancelled'
  if (s.includes('delay'))            return 'delayed'
  return 'in_transit'
}

// ── Scheduled background refresh ─────────────────────────────────────────────

export async function scheduledRefresh(io: SocketIOServer): Promise<void> {
  try {
    const activeStatuses = ['packed', 'shipped', 'in_transit', 'out_for_delivery']
    const result = await query<DbShipment>(
      `SELECT * FROM shipments WHERE status = ANY($1::text[]) AND is_archived = false`,
      [activeStatuses],
    )

    for (const shipment of result.rows) {
      try {
        const live = await fetchTrackingData(
          shipment.tracking_number as string,
          shipment.courier as string,
        )
        if (!live) continue

        const prevStatus = shipment.status
        if (live.status !== prevStatus) {
          await ShipmentModel.updateStatus(shipment.id, live.status, live.currentLocation)
          await TrackingEventModel.create({
            shipmentId:  shipment.id,
            status:      live.status,
            description: live.events[0]?.description ?? `Status updated to ${live.status}`,
            location:    live.events[0]?.location    ?? '',
            geoLocation: live.events[0]?.geoLocation,
            timestamp:   new Date(),
            courier:     shipment.courier as string,
          })

          // Emit socket event
          if (shipment.user_id) {
            io.to(`user:${shipment.user_id}`).emit('tracking:update', {
              shipmentId:    shipment.id,
              trackingNumber: shipment.tracking_number,
              status:        live.status,
              courier:       shipment.courier,
            })
          }
        }
      } catch (err) {
        logger.error(`Failed to refresh shipment ${shipment.id}`, { error: err })
      }
    }
  } catch (err) {
    logger.error('scheduledRefresh error', { error: err })
  }
}
