'use client'

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Shipment } from '@/types'
import { DELIVERY_STATUS_LABELS } from '@/types'
import { formatDate } from '@/lib/utils'

// Fix default marker icons in Next.js
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const createCustomIcon = (color: string, label: string) =>
  L.divIcon({
    html: `
      <div style="
        background: ${color};
        width: 32px; height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.4);
        display:flex; align-items:center; justify-content:center;
      ">
        <div style="transform:rotate(45deg); color:white; font-size:12px; font-weight:bold">
          ${label}
        </div>
      </div>`,
    className: '',
    iconSize:     [32, 32],
    iconAnchor:   [16, 32],
    popupAnchor:  [0, -34],
  })

const originIcon  = createCustomIcon('#4f46e5', 'O')
const currentIcon = createCustomIcon('#f97316', '●')
const destIcon    = createCustomIcon('#16a34a', 'D')

function FitBounds({ positions }: { positions: Array<[number, number]> }) {
  const map = useMap()
  useEffect(() => {
    if (positions.length > 1) {
      map.fitBounds(positions, { padding: [40, 40] })
    } else if (positions.length === 1) {
      map.setView(positions[0], 10)
    }
  }, [map, positions])
  return null
}

interface Props {
  shipment: Shipment
}

export default function DeliveryMapInner({ shipment }: Props) {
  const eventsWithGeo = (shipment.events ?? []).filter((e) => e.geoLocation)

  // Build coordinate path from events
  const pathCoords: Array<[number, number]> = eventsWithGeo
    .slice()
    .reverse()
    .map((e) => [e.geoLocation!.lat, e.geoLocation!.lng])

  const currentGeo = shipment.currentLocation
  const currentCoord: [number, number] | null =
    currentGeo ? [currentGeo.lat, currentGeo.lng] : null

  // Default centre: India
  const defaultCenter: [number, number] = [20.5937, 78.9629]
  const centre: [number, number] = currentCoord ?? defaultCenter

  const allPositions: Array<[number, number]> = [
    ...pathCoords,
    ...(currentCoord ? [currentCoord] : []),
  ]

  return (
    <MapContainer
      center={centre}
      zoom={5}
      style={{ height: '100%', width: '100%', background: '#1e293b' }}
      zoomControl={true}
      scrollWheelZoom={false}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {allPositions.length > 0 && <FitBounds positions={allPositions} />}

      {/* Path polyline */}
      {pathCoords.length > 1 && (
        <Polyline
          positions={pathCoords}
          pathOptions={{ color: '#6366f1', weight: 3, opacity: 0.7, dashArray: '6, 6' }}
        />
      )}

      {/* Current location */}
      {currentCoord && (
        <Marker position={currentCoord} icon={currentIcon}>
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-white mb-1">Current Location</p>
              <p className="text-dark-300">
                {currentGeo?.city ?? 'Unknown'}
                {currentGeo?.state ? `, ${currentGeo.state}` : ''}
              </p>
              <p className="text-xs text-dark-400 mt-1">
                Status: {DELIVERY_STATUS_LABELS[shipment.status]}
              </p>
            </div>
          </Popup>
        </Marker>
      )}

      {/* Event markers */}
      {eventsWithGeo.map((event, i) => (
        <Marker
          key={event.id}
          position={[event.geoLocation!.lat, event.geoLocation!.lng]}
          icon={i === 0 ? originIcon : destIcon}
          opacity={0.8}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-semibold text-white mb-1">
                {DELIVERY_STATUS_LABELS[event.status]}
              </p>
              <p className="text-dark-300 text-xs">{event.description}</p>
              <p className="text-dark-400 text-xs mt-1">{formatDate(event.timestamp)}</p>
              {event.location && (
                <p className="text-dark-400 text-xs">{event.location}</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  )
}
