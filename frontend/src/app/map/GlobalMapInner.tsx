'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import Link from 'next/link'
import type { Shipment, DeliveryStatus } from '@/types'
import { DELIVERY_STATUS_LABELS, COURIERS } from '@/types'
import { formatRelativeTime } from '@/lib/utils'
import StatusBadge from '@/components/ui/StatusBadge'

delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const STATUS_COLORS: Partial<Record<DeliveryStatus, string>> = {
  in_transit:       '#eab308',
  out_for_delivery: '#f97316',
  shipped:          '#6366f1',
  delayed:          '#ef4444',
  packed:           '#3b82f6',
}

function createMarker(color: string, label: string) {
  return L.divIcon({
    html: `<div style="
      background:${color};
      width:36px; height:36px;
      border-radius:50%;
      border:3px solid white;
      box-shadow:0 2px 8px rgba(0,0,0,0.4);
      display:flex;align-items:center;justify-content:center;
      font-size:14px;
    ">${label}</div>`,
    className: '',
    iconSize:    [36, 36],
    iconAnchor:  [18, 18],
    popupAnchor: [0, -22],
  })
}

function AutoFit({ positions }: { positions: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [60, 60], maxZoom: 10 })
    } else if (positions.length === 1) {
      map.setView(positions[0], 6)
    }
  }, [map, positions])
  return null
}

interface Props { shipments: Shipment[] }

export default function GlobalMapInner({ shipments }: Props) {
  const INDIA_CENTER: [number, number] = [20.5937, 78.9629]

  const positions: Array<[number, number]> = shipments
    .filter((s) => s.currentLocation)
    .map((s) => [s.currentLocation!.lat, s.currentLocation!.lng])

  return (
    <MapContainer
      center={INDIA_CENTER}
      zoom={5}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {positions.length > 0 && <AutoFit positions={positions} />}

      {shipments.map((s) => {
        if (!s.currentLocation) return null
        const color  = STATUS_COLORS[s.status] ?? '#6366f1'
        const emoji  = s.status === 'out_for_delivery' ? '🛵'
          : s.status === 'delayed' ? '⚠️'
          : '📦'
        const icon   = createMarker(color, emoji)
        const courier = COURIERS[s.courier]

        return (
          <Marker
            key={s.id}
            position={[s.currentLocation.lat, s.currentLocation.lng]}
            icon={icon}
          >
            <Popup minWidth={220}>
              <div className="text-sm space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded"
                    style={{ background: `${courier?.color}22`, color: courier?.color }}
                  >
                    {courier?.name}
                  </span>
                  <StatusBadge status={s.status} size="sm" />
                </div>

                <p className="font-mono text-xs text-dark-300">{s.trackingNumber}</p>

                {s.product?.name && (
                  <p className="text-white font-medium text-xs">{s.product.name}</p>
                )}

                <p className="text-dark-400 text-xs">
                  {s.currentLocation.city}, {s.currentLocation.state}
                </p>

                <p className="text-dark-500 text-xs">
                  {s.origin.city} → {s.destination.city}
                </p>

                {s.updatedAt && (
                  <p className="text-dark-500 text-xs">
                    Updated {formatRelativeTime(s.updatedAt)}
                  </p>
                )}

                <Link
                  href={`/tracking/${s.id}`}
                  className="block text-center text-xs font-semibold text-brand-400 hover:text-brand-300 pt-1 border-t border-dark-700/50 mt-2"
                >
                  View Full Details →
                </Link>
              </div>
            </Popup>
          </Marker>
        )
      })}
    </MapContainer>
  )
}
