import { Server as SocketIOServer, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import { logger } from '../config/logger'

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret'

export function setupSocketHandlers(io: SocketIOServer): void {
  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined
    if (token) {
      try {
        const payload = jwt.verify(token, JWT_SECRET) as { id: string }
        socket.data.userId = payload.id
      } catch {
        // Allow unauthenticated connections for public tracking
      }
    }
    next()
  })

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string | undefined
    logger.info('Socket connected', { socketId: socket.id, userId })

    if (userId) {
      socket.join(`user:${userId}`)
    }

    socket.on('subscribe:shipment', ({ shipmentId }: { shipmentId: string }) => {
      socket.join(`shipment:${shipmentId}`)
      logger.debug('Subscribed to shipment', { socketId: socket.id, shipmentId })
    })

    socket.on('unsubscribe:shipment', ({ shipmentId }: { shipmentId: string }) => {
      socket.leave(`shipment:${shipmentId}`)
    })

    socket.on('disconnect', (reason) => {
      logger.info('Socket disconnected', { socketId: socket.id, reason })
    })
  })
}

export function emitTrackingUpdate(
  io: SocketIOServer,
  payload: {
    shipmentId:     string
    userId?:        string
    trackingNumber: string
    status:         string
    courier:        string
    event:          Record<string, unknown>
  },
): void {
  // Emit to specific shipment room
  io.to(`shipment:${payload.shipmentId}`).emit(`tracking:${payload.shipmentId}`, payload)

  // Also emit to user room
  if (payload.userId) {
    io.to(`user:${payload.userId}`).emit('tracking:update', payload)
  }
}
