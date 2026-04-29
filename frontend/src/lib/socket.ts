import { io, Socket } from 'socket.io-client'
import type { SocketTrackingUpdate } from '@/types'

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function connectSocket(token?: string): Socket {
  const s = getSocket()
  if (token) {
    s.auth = { token }
  }
  if (!s.connected) {
    s.connect()
  }
  return s
}

export function disconnectSocket(): void {
  if (socket?.connected) {
    socket.disconnect()
  }
}

export function subscribeToShipment(
  shipmentId: string,
  callback: (update: SocketTrackingUpdate) => void,
): () => void {
  const s = getSocket()
  s.emit('subscribe:shipment', { shipmentId })
  s.on(`tracking:${shipmentId}`, callback)
  return () => {
    s.emit('unsubscribe:shipment', { shipmentId })
    s.off(`tracking:${shipmentId}`, callback)
  }
}

export function subscribeToUserUpdates(
  userId: string,
  callback: (update: SocketTrackingUpdate) => void,
): () => void {
  const s = getSocket()
  s.emit('subscribe:user', { userId })
  s.on('tracking:update', callback)
  return () => {
    s.off('tracking:update', callback)
  }
}
