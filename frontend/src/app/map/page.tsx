'use client'

import dynamic from 'next/dynamic'
import { MapPin, RefreshCw } from 'lucide-react'
import { useDeliveries, MOCK_SHIPMENTS } from '@/hooks/useDeliveries'

const GlobalMapInner = dynamic(() => import('./GlobalMapInner'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center bg-dark-900 rounded-2xl border border-dark-700">
      <div className="text-center text-dark-400">
        <MapPin className="w-10 h-10 mx-auto mb-3 animate-pulse text-brand-500" />
        <p className="text-sm font-medium">Loading live map…</p>
      </div>
    </div>
  ),
})

export default function MapPage() {
  const { shipments, loading, refresh } = useDeliveries()

  const activeShipments = (shipments.length > 0 ? shipments : MOCK_SHIPMENTS).filter(
    (s) => s.currentLocation && s.status !== 'delivered' && s.status !== 'cancelled',
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Map</h1>
          <p className="text-dark-400 text-sm mt-1">
            {activeShipments.length} active shipment{activeShipments.length !== 1 ? 's' : ''} on the map
          </p>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="btn-secondary py-2 px-3"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="relative rounded-2xl overflow-hidden border border-dark-700" style={{ height: 'calc(100vh - 220px)', minHeight: '400px' }}>
        <GlobalMapInner shipments={activeShipments} />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-4">
        {[
          { color: 'bg-yellow-400',  label: 'In Transit' },
          { color: 'bg-orange-400',  label: 'Out for Delivery' },
          { color: 'bg-indigo-400',  label: 'Shipped' },
          { color: 'bg-red-400',     label: 'Delayed' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5 text-xs text-dark-400">
            <span className={`w-2.5 h-2.5 rounded-full ${color}`} />
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}
