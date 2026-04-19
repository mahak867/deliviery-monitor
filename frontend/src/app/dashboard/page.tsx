'use client'

import { useState } from 'react'
import { Plus, RefreshCw, Package, Clock, CheckCircle, AlertTriangle, XCircle, TruckIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import DeliveryCard from '@/components/ui/DeliveryCard'
import { useDeliveries } from '@/hooks/useDeliveries'
import type { DeliveryStatus } from '@/types'
import { cn } from '@/lib/utils'

type FilterTab = 'all' | DeliveryStatus

const FILTER_TABS: Array<{ key: FilterTab; label: string; icon: React.ElementType }> = [
  { key: 'all',             label: 'All',            icon: Package        },
  { key: 'in_transit',      label: 'In Transit',     icon: TruckIcon      },
  { key: 'out_for_delivery',label: 'Out for Delivery',icon: Clock         },
  { key: 'delivered',       label: 'Delivered',      icon: CheckCircle    },
  { key: 'delayed',         label: 'Delayed',        icon: AlertTriangle  },
  { key: 'cancelled',       label: 'Cancelled',      icon: XCircle        },
]

export default function DashboardPage() {
  const {
    shipments, stats, loading, refresh,
    toggleFavourite, archiveShipment, refreshShipment, deleteShipment, addShipment,
  } = useDeliveries()

  const [activeTab,    setActiveTab]    = useState<FilterTab>('all')
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [newTracking,  setNewTracking]  = useState('')
  const [adding,       setAdding]       = useState(false)

  const filtered = activeTab === 'all'
    ? shipments
    : shipments.filter((s) => s.status === activeTab)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTracking.trim()) return
    setAdding(true)
    try {
      await addShipment(newTracking.trim())
      toast.success('Shipment added!')
      setNewTracking('')
      setAddModalOpen(false)
    } catch {
      toast.error('Could not find shipment. Check the tracking number.')
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this shipment from your list?')) return
    await deleteShipment(id)
    toast.success('Shipment removed')
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 page-enter">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">My Deliveries</h1>
          <p className="text-dark-400 text-sm mt-1">
            {stats ? `${stats.total} shipments · ${stats.active} active` : 'Loading…'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            className="btn-secondary py-2 px-3"
            title="Refresh all"
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          <button
            onClick={() => setAddModalOpen(true)}
            className="btn-primary py-2"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Shipment</span>
          </button>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: 'Total',          value: stats.total,          color: 'text-white'         },
            { label: 'Active',         value: stats.active,         color: 'text-brand-400'      },
            { label: 'Out for Delivery', value: stats.outForDelivery, color: 'text-orange-400'   },
            { label: 'Delayed',        value: stats.delayed,        color: 'text-red-400'        },
          ].map(({ label, value, color }) => (
            <div key={label} className="card py-3 px-4">
              <p className={cn('text-2xl font-bold', color)}>{value}</p>
              <p className="text-xs text-dark-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Filter tabs ─────────────────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 no-scrollbar">
        {FILTER_TABS.map(({ key, label, icon: Icon }) => {
          const count = key === 'all'
            ? shipments.length
            : shipments.filter((s) => s.status === key).length
          return (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0',
                activeTab === key
                  ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                  : 'text-dark-400 hover:text-white hover:bg-dark-700 border border-transparent',
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {count > 0 && (
                <span className={cn(
                  'text-xs px-1.5 py-0.5 rounded-md',
                  activeTab === key ? 'bg-brand-500/30 text-brand-300' : 'bg-dark-700 text-dark-400',
                )}>
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* ── Shipment grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card h-52 skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package className="w-16 h-16 text-dark-600 mb-4" />
          <h3 className="text-lg font-semibold text-dark-300 mb-2">
            {activeTab === 'all' ? 'No shipments yet' : `No ${activeTab.replace(/_/g, ' ')} shipments`}
          </h3>
          <p className="text-dark-500 text-sm mb-6 max-w-xs">
            {activeTab === 'all'
              ? 'Add a tracking number to start monitoring your deliveries.'
              : 'Switch to "All" to see all your shipments.'}
          </p>
          {activeTab === 'all' && (
            <button onClick={() => setAddModalOpen(true)} className="btn-primary">
              <Plus className="w-4 h-4" />
              Add Your First Shipment
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <DeliveryCard
              key={s.id}
              shipment={s}
              onToggleFavourite={toggleFavourite}
              onArchive={archiveShipment}
              onRefresh={refreshShipment}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* ── Add shipment modal ──────────────────────────────────────────────── */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setAddModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md card p-6">
            <h2 className="text-lg font-bold text-white mb-1">Add Shipment</h2>
            <p className="text-sm text-dark-400 mb-5">
              Enter a tracking number from any supported courier.
            </p>
            <form onSubmit={handleAdd} className="space-y-4">
              <input
                type="text"
                value={newTracking}
                onChange={(e) => setNewTracking(e.target.value.trim())}
                placeholder="e.g. 127429287160"
                className="input-field font-mono"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="btn-secondary flex-1 justify-center"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adding || !newTracking.trim()}
                  className="btn-primary flex-1 justify-center"
                >
                  {adding ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Track'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
