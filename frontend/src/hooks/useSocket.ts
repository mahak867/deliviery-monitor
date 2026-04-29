'use client'

import { useEffect, useRef, useCallback } from 'react'
import { connectSocket, disconnectSocket, subscribeToShipment } from '@/lib/socket'
import type { SocketTrackingUpdate } from '@/types'

export function useSocket(userId?: string) {
  const connectedRef = useRef(false)

  useEffect(() => {
    if (!connectedRef.current) {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('accessToken') ?? undefined
        : undefined
      connectSocket(token)
      connectedRef.current = true
    }
    return () => {
      disconnectSocket()
      connectedRef.current = false
    }
  }, [userId])
}

export function useShipmentSocket(
  shipmentId: string | null,
  onUpdate: (update: SocketTrackingUpdate) => void,
) {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    if (!shipmentId) return
    const unsubscribe = subscribeToShipment(shipmentId, (update) => {
      onUpdateRef.current(update)
    })
    return unsubscribe
  }, [shipmentId])
}

export function useSocketCallback<T>(eventName: string, callback: (data: T) => void) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  const subscribe = useCallback(() => {
    const { getSocket } = require('@/lib/socket')
    const socket = getSocket()
    const handler = (data: T) => callbackRef.current(data)
    socket.on(eventName, handler)
    return () => socket.off(eventName, handler)
  }, [eventName])

  useEffect(() => {
    const unsubscribe = subscribe()
    return unsubscribe
  }, [subscribe])
}
