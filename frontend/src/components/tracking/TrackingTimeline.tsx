'use client'

import { CheckCircle2, Circle, Clock, MapPin } from 'lucide-react'
import { cn, formatDate, getStatusIcon } from '@/lib/utils'
import { DELIVERY_STATUS_LABELS, type TrackingEvent, type DeliveryStatus } from '@/types'

interface TrackingTimelineProps {
  events:        TrackingEvent[]
  currentStatus: DeliveryStatus
}

const TIMELINE_STEPS: Array<{ status: DeliveryStatus; label: string }> = [
  { status: 'order_placed',     label: 'Order Placed'     },
  { status: 'packed',           label: 'Packed'           },
  { status: 'shipped',          label: 'Shipped'          },
  { status: 'in_transit',       label: 'In Transit'       },
  { status: 'out_for_delivery', label: 'Out for Delivery' },
  { status: 'delivered',        label: 'Delivered'        },
]

const STEP_ORDER: Record<DeliveryStatus, number> = {
  order_placed:     0,
  packed:           1,
  shipped:          2,
  in_transit:       3,
  out_for_delivery: 4,
  delivered:        5,
  delayed:          3,
  cancelled:        -1,
  returned:         -1,
  failed_delivery:  4,
}

export default function TrackingTimeline({ events, currentStatus }: TrackingTimelineProps) {
  const currentStep = STEP_ORDER[currentStatus] ?? -1
  const isTerminal  = currentStatus === 'cancelled' || currentStatus === 'returned'

  return (
    <div className="space-y-6">
      {/* Visual step progress — skip for cancelled/returned */}
      {!isTerminal && (
        <div className="card">
          <h3 className="text-sm font-semibold text-dark-200 mb-5">Delivery Progress</h3>
          <div className="relative">
            {/* Connector bar */}
            <div className="absolute top-4 left-4 right-4 h-0.5 bg-dark-700 z-0" />
            <div
              className="absolute top-4 left-4 h-0.5 bg-brand-500 z-0 transition-all duration-700"
              style={{ width: `${Math.max(0, (currentStep / (TIMELINE_STEPS.length - 1)) * 100)}%` }}
            />

            <div className="relative z-10 flex justify-between">
              {TIMELINE_STEPS.map((step, i) => {
                const done    = i < currentStep
                const active  = i === currentStep
                const future  = i > currentStep

                return (
                  <div key={step.status} className="flex flex-col items-center gap-2">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300',
                        done   && 'bg-brand-600 border-brand-600',
                        active && 'bg-brand-600/20 border-brand-500 shadow-lg shadow-brand-500/20',
                        future && 'bg-dark-800 border-dark-600',
                      )}
                    >
                      {done ? (
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      ) : active ? (
                        <div className="w-2.5 h-2.5 rounded-full bg-brand-400 animate-pulse" />
                      ) : (
                        <Circle className="w-4 h-4 text-dark-500" />
                      )}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] text-center font-medium hidden sm:block max-w-[60px] leading-tight',
                        done   && 'text-brand-400',
                        active && 'text-white',
                        future && 'text-dark-500',
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Detailed event log */}
      <div className="card">
        <h3 className="text-sm font-semibold text-dark-200 mb-5 flex items-center gap-2">
          <Clock className="w-4 h-4 text-brand-400" />
          Tracking History
          <span className="ml-auto text-xs text-dark-500 font-normal">{events.length} events</span>
        </h3>

        {events.length === 0 ? (
          <p className="text-sm text-dark-400 text-center py-4">No tracking events yet.</p>
        ) : (
          <div className="relative pl-6">
            {/* Vertical line */}
            <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-dark-700" />

            <div className="space-y-6">
              {events.map((event, i) => (
                <div key={event.id} className="relative">
                  {/* Dot */}
                  <div
                    className={cn(
                      'absolute -left-6 top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 z-10',
                      i === 0
                        ? 'bg-brand-600/20 border-brand-500'
                        : 'bg-dark-800 border-dark-600',
                    )}
                  >
                    <span className="text-[9px]">{getStatusIcon(event.status)}</span>
                  </div>

                  <div className={cn('pl-2', i === 0 && 'opacity-100', i > 0 && 'opacity-80')}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p
                          className={cn(
                            'text-sm font-semibold',
                            i === 0 ? 'text-white' : 'text-dark-200',
                          )}
                        >
                          {DELIVERY_STATUS_LABELS[event.status]}
                        </p>
                        <p className="text-sm text-dark-300 mt-0.5 leading-relaxed">
                          {event.description}
                        </p>
                        {event.location && (
                          <p className="text-xs text-dark-500 flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3" />
                            {event.location}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-dark-500 whitespace-nowrap flex-shrink-0">
                        {formatDate(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
