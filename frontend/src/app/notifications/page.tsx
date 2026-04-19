'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, CheckCheck, Trash2, RefreshCw, Package, AlertTriangle, Zap } from 'lucide-react'
import toast from 'react-hot-toast'
import { notificationsApi } from '@/lib/api'
import type { Notification, NotificationType } from '@/types'
import { formatRelativeTime, cn } from '@/lib/utils'

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: 'notif_001',
    userId: 'user_1',
    shipmentId: 'shp_001',
    type: 'status_update',
    title: 'Shipment In Transit',
    message: 'Your OnePlus 12R is now in transit at Hyderabad hub. Expected delivery tomorrow.',
    isRead: false,
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'notif_002',
    userId: 'user_1',
    shipmentId: 'shp_002',
    type: 'out_for_delivery',
    title: 'Out for Delivery!',
    message: 'Your Nike Air Max 270 is out for delivery. Expect it today by 7 PM.',
    isRead: false,
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'notif_003',
    userId: 'user_1',
    shipmentId: 'shp_004',
    type: 'delay_alert',
    title: 'Delivery Delayed',
    message: 'Your Banarasi Silk Saree shipment has been delayed due to weather conditions.',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'notif_004',
    userId: 'user_1',
    shipmentId: 'shp_003',
    type: 'delivered',
    title: 'Delivered!',
    message: 'Your Levi\'s 511 Jeans has been delivered to Coimbatore. Enjoy!',
    isRead: true,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
]

const TYPE_ICONS: Record<NotificationType, React.ElementType> = {
  status_update:    Package,
  delivery_attempt: AlertTriangle,
  delay_alert:      AlertTriangle,
  out_for_delivery: Zap,
  delivered:        CheckCheck,
  system:           Bell,
}

const TYPE_COLORS: Record<NotificationType, string> = {
  status_update:    'text-blue-400 bg-blue-500/10',
  delivery_attempt: 'text-orange-400 bg-orange-500/10',
  delay_alert:      'text-red-400 bg-red-500/10',
  out_for_delivery: 'text-orange-400 bg-orange-500/10',
  delivered:        'text-green-400 bg-green-500/10',
  system:           'text-brand-400 bg-brand-500/10',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading,       setLoading]       = useState(true)
  const [filter,        setFilter]        = useState<'all' | 'unread'>('all')

  const load = async () => {
    setLoading(true)
    try {
      const res = await notificationsApi.getAll()
      setNotifications(res.data.data)
    } catch {
      setNotifications(MOCK_NOTIFICATIONS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    try { await notificationsApi.markAllRead() } catch { /* best effort */ }
    toast.success('All notifications marked as read')
  }

  const handleMarkRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    )
    try { await notificationsApi.markRead(id) } catch { /* best effort */ }
  }

  const handleDelete = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try { await notificationsApi.delete(id) } catch { /* best effort */ }
  }

  const displayed = filter === 'unread'
    ? notifications.filter((n) => !n.isRead)
    : notifications

  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 page-enter">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-400" />
            Notifications
            {unreadCount > 0 && (
              <span className="text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-dark-400 text-sm mt-1">
            {notifications.length} total · {unreadCount} unread
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={load} className="btn-ghost p-2">
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
          </button>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn-secondary py-1.5 text-xs">
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-5">
        {(['all', 'unread'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-all',
              filter === f
                ? 'bg-brand-600/20 text-brand-300 border border-brand-500/30'
                : 'text-dark-400 hover:text-white border border-transparent',
            )}
          >
            {f === 'all' ? 'All' : 'Unread'}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="skeleton h-20 rounded-2xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="text-center py-16">
          <BellOff className="w-14 h-14 text-dark-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-dark-300 mb-2">No notifications</h3>
          <p className="text-dark-500 text-sm">
            {filter === 'unread' ? 'All caught up!' : 'You\'ll see updates here when your shipments move.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((n) => {
            const Icon      = TYPE_ICONS[n.type]
            const colorClass = TYPE_COLORS[n.type]

            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
                className={cn(
                  'card cursor-pointer transition-all group',
                  !n.isRead && 'border-brand-500/20 bg-brand-900/10',
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-sm font-semibold', n.isRead ? 'text-dark-200' : 'text-white')}>
                        {n.title}
                        {!n.isRead && (
                          <span className="ml-2 w-1.5 h-1.5 rounded-full bg-brand-500 inline-block" />
                        )}
                      </p>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(n.id) }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-dark-500 hover:text-red-400 p-0.5"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-dark-400 mt-0.5 leading-relaxed">{n.message}</p>
                    <p className="text-xs text-dark-600 mt-1.5">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
