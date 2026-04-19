'use client'

import Link from 'next/link'
import { useState } from 'react'
import { MapPin, Clock, MoreVertical, Star, Archive, RefreshCw, Trash2, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import type { Shipment } from '@/types'
import { COURIERS } from '@/types'
import { cn, formatRelativeTime, formatShortDate, copyToClipboard, truncate } from '@/lib/utils'
import StatusBadge from './StatusBadge'
import ProgressBar from './ProgressBar'

interface DeliveryCardProps {
  shipment:         Shipment
  onToggleFavourite?: (id: string) => void
  onArchive?:        (id: string) => void
  onRefresh?:        (id: string) => void
  onDelete?:         (id: string) => void
  compact?:          boolean
}

export default function DeliveryCard({
  shipment,
  onToggleFavourite,
  onArchive,
  onRefresh,
  onDelete,
  compact = false,
}: DeliveryCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const courier = COURIERS[shipment.courier]

  const handleRefresh = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!onRefresh) return
    setRefreshing(true)
    await onRefresh(shipment.id)
    setRefreshing(false)
  }

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const ok = await copyToClipboard(shipment.trackingNumber)
    if (ok) toast.success('Tracking number copied!')
  }

  const latestEvent = shipment.events?.[0]

  return (
    <Link href={`/tracking/${shipment.id}`} className="block">
      <article
        className={cn(
          'card-interactive group relative overflow-hidden',
          shipment.isFavourite && 'border-yellow-500/30',
          shipment.status === 'delivered' && 'border-green-500/20',
          shipment.status === 'delayed'   && 'border-red-500/20',
        )}
      >
        {/* Favourite star */}
        {shipment.isFavourite && (
          <span className="absolute top-3 right-10 text-yellow-400 text-sm">★</span>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-md"
                style={{ backgroundColor: `${courier?.color}22`, color: courier?.color }}
              >
                {courier?.name ?? shipment.courier.toUpperCase()}
              </span>
              {shipment.orderNumber && (
                <span className="text-xs text-dark-400">#{shipment.orderNumber}</span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-white font-mono tracking-wide truncate">
                {shipment.trackingNumber}
              </p>
              <button
                onClick={handleCopy}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-dark-400 hover:text-white"
                title="Copy tracking number"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {shipment.product?.name && (
              <p className="text-xs text-dark-400 mt-0.5 truncate">
                {truncate(shipment.product.name, 40)}
              </p>
            )}
          </div>

          {/* Context menu */}
          <div className="relative ml-2">
            <button
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="p-1.5 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false) }}
                />
                <div className="absolute right-0 top-8 z-20 w-44 bg-dark-800 border border-dark-700 rounded-xl shadow-2xl py-1.5 overflow-hidden">
                  {onRefresh && (
                    <button
                      onClick={(e) => { e.stopPropagation(); setMenuOpen(false); handleRefresh(e) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                    >
                      <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
                      Refresh
                    </button>
                  )}
                  {onToggleFavourite && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onToggleFavourite(shipment.id) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                    >
                      <Star className={cn('w-4 h-4', shipment.isFavourite && 'fill-yellow-400 text-yellow-400')} />
                      {shipment.isFavourite ? 'Unfavourite' : 'Favourite'}
                    </button>
                  )}
                  {onArchive && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onArchive(shipment.id) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-dark-200 hover:bg-dark-700 hover:text-white transition-colors"
                    >
                      <Archive className="w-4 h-4" />
                      Archive
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen(false); onDelete(shipment.id) }}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between mb-3">
          <StatusBadge status={shipment.status} />
          {shipment.estimatedDelivery && shipment.status !== 'delivered' && (
            <span className="text-xs text-dark-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ETA {formatShortDate(shipment.estimatedDelivery)}
            </span>
          )}
          {shipment.status === 'delivered' && shipment.actualDelivery && (
            <span className="text-xs text-green-400 flex items-center gap-1">
              ✓ {formatShortDate(shipment.actualDelivery)}
            </span>
          )}
        </div>

        {/* Progress */}
        <ProgressBar status={shipment.status} className="mb-3" />

        {/* Route */}
        {!compact && (
          <div className="flex items-center gap-2 text-xs text-dark-400 mb-3">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">
              {shipment.origin.city} → {shipment.destination.city}
            </span>
          </div>
        )}

        {/* Latest event */}
        {latestEvent && !compact && (
          <div className="bg-dark-700/50 rounded-lg px-3 py-2">
            <p className="text-xs text-dark-300 leading-relaxed">
              <span className="text-dark-500 mr-1.5">
                {formatRelativeTime(latestEvent.timestamp)}
              </span>
              {latestEvent.description}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-dark-700/50">
          <span className="text-xs text-dark-500">
            Added {formatRelativeTime(shipment.createdAt)}
          </span>
          <span className="text-xs text-brand-400 group-hover:text-brand-300 transition-colors font-medium">
            View Details →
          </span>
        </div>
      </article>
    </Link>
  )
}
