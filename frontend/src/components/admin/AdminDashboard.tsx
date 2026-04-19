'use client'

import { useState } from 'react'
import { BarChart3, Users, Package, TrendingUp, RefreshCw, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { DashboardStats } from '@/types'
import { MOCK_STATS, MOCK_SHIPMENTS } from '@/hooks/useDeliveries'
import DeliveryCard from '@/components/ui/DeliveryCard'

export default function AdminDashboard() {
  const [loading] = useState(false)
  const stats: DashboardStats = MOCK_STATS

  const STAT_CARDS = [
    { label: 'Total Shipments',   value: stats.total,          icon: Package,    color: 'text-white',          bg: 'bg-brand-500/10'  },
    { label: 'Active',            value: stats.active,         icon: TrendingUp, color: 'text-brand-400',      bg: 'bg-brand-500/10'  },
    { label: 'Out for Delivery',  value: stats.outForDelivery, icon: BarChart3,  color: 'text-orange-400',     bg: 'bg-orange-500/10' },
    { label: 'Delayed',           value: stats.delayed,        icon: AlertTriangle, color: 'text-red-400',     bg: 'bg-red-500/10'    },
    { label: 'Delivered',         value: stats.delivered,      icon: Users,      color: 'text-green-400',      bg: 'bg-green-500/10'  },
    { label: 'Cancelled',         value: stats.cancelled,      icon: RefreshCw,  color: 'text-dark-400',       bg: 'bg-dark-500/10'   },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">Admin Dashboard</h2>
        <span className="text-xs text-dark-500">Live data</span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="card py-4 px-4 text-center">
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mx-auto mb-2', bg)}>
              <Icon className={cn('w-4 h-4', color)} />
            </div>
            <p className={cn('text-2xl font-bold', color)}>{value}</p>
            <p className="text-xs text-dark-500 mt-0.5 leading-tight">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent shipments */}
      <div>
        <h3 className="text-sm font-semibold text-dark-200 mb-3">Recent Shipments</h3>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[1, 2].map((i) => <div key={i} className="skeleton h-44 rounded-2xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MOCK_SHIPMENTS.slice(0, 4).map((s) => (
              <DeliveryCard key={s.id} shipment={s} compact />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
