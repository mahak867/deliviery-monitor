import { cn } from '@/lib/utils'
import { DELIVERY_STATUS_PROGRESS, type DeliveryStatus } from '@/types'

interface ProgressBarProps {
  status:     DeliveryStatus
  progress?:  number
  className?: string
  showLabel?: boolean
  height?:    'sm' | 'md' | 'lg'
}

const PROGRESS_COLORS: Record<DeliveryStatus, string> = {
  order_placed:     'from-gray-500 to-gray-400',
  packed:           'from-blue-600 to-blue-400',
  shipped:          'from-indigo-600 to-indigo-400',
  in_transit:       'from-yellow-600 to-yellow-400',
  out_for_delivery: 'from-orange-600 to-orange-400',
  delivered:        'from-green-600 to-green-400',
  delayed:          'from-red-600 to-red-400',
  cancelled:        'from-gray-600 to-gray-500',
  returned:         'from-purple-600 to-purple-400',
  failed_delivery:  'from-red-700 to-red-500',
}

const HEIGHT_CLASSES = {
  sm: 'h-1',
  md: 'h-1.5',
  lg: 'h-2.5',
}

export default function ProgressBar({
  status,
  progress,
  className,
  showLabel = false,
  height = 'md',
}: ProgressBarProps) {
  const value = progress ?? DELIVERY_STATUS_PROGRESS[status]

  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="flex justify-between text-xs text-dark-400 mb-1.5">
          <span>Progress</span>
          <span>{value}%</span>
        </div>
      )}
      <div className={cn('w-full bg-dark-700 rounded-full overflow-hidden', HEIGHT_CLASSES[height])}>
        <div
          className={cn(
            'h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out',
            PROGRESS_COLORS[status],
          )}
          style={{ width: `${value}%` }}
          role="progressbar"
          aria-valuenow={value}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  )
}
