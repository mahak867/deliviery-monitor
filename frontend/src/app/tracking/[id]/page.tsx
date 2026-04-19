'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ChevronLeft, RefreshCw, Star, Copy, Share2,
  Package, MapPin, Truck, Phone, Calendar,
} from 'lucide-react'
import toast from 'react-hot-toast'
import dynamic from 'next/dynamic'
import { trackingApi } from '@/lib/api'
import type { Shipment } from '@/types'
import { COURIERS } from '@/types'
import { MOCK_SHIPMENTS } from '@/hooks/useDeliveries'
import StatusBadge from '@/components/ui/StatusBadge'
import ProgressBar from '@/components/ui/ProgressBar'
import TrackingTimeline from '@/components/tracking/TrackingTimeline'
import { formatDate, formatShortDate, formatWeight, copyToClipboard } from '@/lib/utils'

const DeliveryMap = dynamic(
  () => import('@/components/tracking/DeliveryMap'),
  { ssr: false },
)

export default function TrackingDetailPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const [shipment, setShipment]   = useState<Shipment | null>(null)
  const [loading,  setLoading]    = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await trackingApi.getById(params.id)
        setShipment(res.data.data)
      } catch {
        // Fallback to mock
        const mock = MOCK_SHIPMENTS.find((s) => s.id === params.id)
        if (mock) setShipment(mock)
        else {
          toast.error('Shipment not found')
          router.push('/dashboard')
        }
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params.id, router])

  const handleRefresh = async () => {
    if (!shipment) return
    setRefreshing(true)
    try {
      const res = await trackingApi.refresh(shipment.id)
      setShipment(res.data.data)
      toast.success('Tracking updated!')
    } catch {
      toast.error('Could not refresh tracking')
    } finally {
      setRefreshing(false)
    }
  }

  const handleCopy = async () => {
    if (!shipment) return
    const ok = await copyToClipboard(shipment.trackingNumber)
    if (ok) toast.success('Tracking number copied!')
  }

  const handleShare = async () => {
    if (!shipment) return
    const url  = window.location.href
    const text = `Track my ${COURIERS[shipment.courier]?.name} shipment: ${shipment.trackingNumber}`
    if (navigator.share) {
      await navigator.share({ title: 'TrackAll', text, url })
    } else {
      await copyToClipboard(url)
      toast.success('Link copied!')
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <div className="skeleton h-8 w-32 mb-6 rounded-xl" />
        <div className="skeleton h-48 rounded-2xl mb-4" />
        <div className="skeleton h-64 rounded-2xl" />
      </div>
    )
  }

  if (!shipment) return null

  const courier = COURIERS[shipment.courier]

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 page-enter">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-dark-400 hover:text-white mb-6 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Dashboard
      </Link>

      {/* ── Header card ─────────────────────────────────────────────────────── */}
      <div className="card mb-4">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-sm font-bold px-2.5 py-1 rounded-lg"
                style={{ background: `${courier?.color}22`, color: courier?.color }}
              >
                {courier?.name ?? shipment.courier}
              </span>
              {shipment.orderNumber && (
                <span className="text-xs text-dark-400">Order #{shipment.orderNumber}</span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xl font-bold text-white font-mono tracking-wider">
                {shipment.trackingNumber}
              </p>
              <button onClick={handleCopy} className="text-dark-400 hover:text-white transition-colors">
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {shipment.product?.name && (
              <p className="text-sm text-dark-300 mt-1">{shipment.product.name}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={handleRefresh} disabled={refreshing} className="btn-ghost p-2" title="Refresh">
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button className="btn-ghost p-2" title="Favourite">
              <Star className={`w-4 h-4 ${shipment.isFavourite ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            </button>
            <button onClick={handleShare} className="btn-ghost p-2" title="Share">
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status + Progress */}
        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={shipment.status} />
          {shipment.estimatedDelivery && shipment.status !== 'delivered' && (
            <span className="text-xs text-dark-400 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              ETA: {formatShortDate(shipment.estimatedDelivery)}
            </span>
          )}
        </div>
        <ProgressBar status={shipment.status} showLabel height="lg" />

        {/* Route */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-dark-700">
          <div className="flex-1 text-center">
            <p className="text-xs text-dark-500 mb-1">From</p>
            <p className="text-sm font-semibold text-white">{shipment.origin.city}</p>
            <p className="text-xs text-dark-400">{shipment.origin.state}</p>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-1 text-dark-500">
              <div className="w-8 h-0.5 bg-dark-600" />
              <Truck className="w-4 h-4 text-brand-400" />
              <div className="w-8 h-0.5 bg-dark-600" />
            </div>
          </div>
          <div className="flex-1 text-center">
            <p className="text-xs text-dark-500 mb-1">To</p>
            <p className="text-sm font-semibold text-white">{shipment.destination.city}</p>
            <p className="text-xs text-dark-400">{shipment.destination.state}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left column: timeline */}
        <div className="lg:col-span-2 space-y-4">
          <TrackingTimeline
            events={shipment.events}
            currentStatus={shipment.status}
          />
        </div>

        {/* Right column: map + details */}
        <div className="space-y-4">
          {/* Map */}
          {shipment.currentLocation && (
            <DeliveryMap shipment={shipment} height="260px" />
          )}

          {/* Delivery details */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
              <Package className="w-4 h-4 text-brand-400" />
              Package Details
            </h3>

            {shipment.weight && (
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Weight</span>
                <span className="text-white">{formatWeight(shipment.weight)}</span>
              </div>
            )}

            {shipment.product?.value && (
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Value</span>
                <span className="text-white">₹{shipment.product.value.toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between text-sm">
              <span className="text-dark-400">Added</span>
              <span className="text-white">{formatShortDate(shipment.createdAt)}</span>
            </div>

            {shipment.actualDelivery && (
              <div className="flex justify-between text-sm">
                <span className="text-dark-400">Delivered</span>
                <span className="text-green-400">{formatDate(shipment.actualDelivery)}</span>
              </div>
            )}
          </div>

          {/* Recipient */}
          <div className="card space-y-3">
            <h3 className="text-sm font-semibold text-dark-200 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-400" />
              Delivery Address
            </h3>
            <div className="space-y-1">
              <p className="text-sm text-white font-medium">{shipment.destination.name}</p>
              <p className="text-xs text-dark-400 leading-relaxed">{shipment.destination.address}</p>
              <p className="text-xs text-dark-400">
                {shipment.destination.city}, {shipment.destination.state} — {shipment.destination.pincode}
              </p>
              {shipment.destination.phone && (
                <p className="text-xs text-dark-400 flex items-center gap-1 mt-1">
                  <Phone className="w-3 h-3" />
                  {shipment.destination.phone}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
