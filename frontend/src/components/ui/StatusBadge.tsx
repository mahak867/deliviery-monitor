import {
  DELIVERY_STATUS_COLORS,
  DELIVERY_STATUS_LABELS,
  type DeliveryStatus,
} from '@/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status:    DeliveryStatus
  className?: string
  size?:     'sm' | 'md'
  showDot?:  boolean
}

const DOT_COLORS: Record<DeliveryStatus, string> = {
  order_placed:     'bg-gray-400',
  packed:           'bg-blue-400',
  shipped:          'bg-indigo-400',
  in_transit:       'bg-yellow-400',
  out_for_delivery: 'bg-orange-400',
  delivered:        'bg-green-400',
  delayed:          'bg-red-400',
  cancelled:        'bg-gray-500',
  returned:         'bg-purple-400',
  failed_delivery:  'bg-red-500',
}

export default function StatusBadge({
  status,
  className,
  size = 'md',
  showDot = true,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'badge',
        DELIVERY_STATUS_COLORS[status],
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        className,
      )}
    >
      {showDot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full', DOT_COLORS[status])}
          aria-hidden="true"
        />
      )}
      {DELIVERY_STATUS_LABELS[status]}
    </span>
  )
}
