'use client'

import dynamic from 'next/dynamic'
import { MapPin } from 'lucide-react'
import type { Shipment } from '@/types'

// Dynamic import to avoid SSR issues with Leaflet
const DeliveryMapInner = dynamic(() => import('./DeliveryMapInner'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-64 bg-dark-800 rounded-2xl flex items-center justify-center border border-dark-700">
      <div className="text-center text-dark-400">
        <MapPin className="w-8 h-8 mx-auto mb-2 animate-pulse" />
        <p className="text-sm">Loading map…</p>
      </div>
    </div>
  ),
})

interface DeliveryMapProps {
  shipment: Shipment
  height?:  string
}

export default function DeliveryMap({ shipment, height = '300px' }: DeliveryMapProps) {
  return (
    <div className="card p-0 overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-brand-400" />
          Live Location
        </h3>
        {shipment.currentLocation && (
          <span className="text-xs text-dark-400">
            {shipment.currentLocation.city ?? 'Unknown'}
            {shipment.currentLocation.state ? `, ${shipment.currentLocation.state}` : ''}
          </span>
        )}
      </div>
      <div style={{ height }}>
        <DeliveryMapInner shipment={shipment} />
      </div>
    </div>
  )
}
