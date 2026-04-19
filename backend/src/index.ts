import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import compression from 'compression'
import cron from 'node-cron'
import { logger } from './config/logger'
import { connectDB } from './config/database'
import { connectRedis } from './config/redis'
import authRouter from './routes/auth'
import trackingRouter from './routes/tracking'
import searchRouter from './routes/search'
import notificationsRouter from './routes/notifications'
import adminRouter from './routes/admin'
import usersRouter from './routes/users'
import { setupSocketHandlers } from './services/socketService'
import { scheduledRefresh } from './services/courierService'

const app    = express()
const server = createServer(app)

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// ── Socket.io ────────────────────────────────────────────────────────────────

const io = new SocketIOServer(server, {
  cors: {
    origin:      [FRONTEND_URL, 'http://localhost:3000'],
    methods:     ['GET', 'POST'],
    credentials: true,
  },
})

// ── Express middleware ────────────────────────────────────────────────────────

app.use(helmet({
  contentSecurityPolicy: false, // let Next.js handle CSP
}))
app.use(compression())
app.use(cors({
  origin:      [FRONTEND_URL, 'http://localhost:3000'],
  credentials: true,
}))
app.use(express.json({ limit: '2mb' }))
app.use(express.urlencoded({ extended: true }))

// Request logger
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip })
  next()
})

// ── Health check ─────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ── API routes ────────────────────────────────────────────────────────────────

app.use('/api/auth',          authRouter)
app.use('/api/tracking',      trackingRouter)
app.use('/api/search',        searchRouter)
app.use('/api/notifications', notificationsRouter)
app.use('/api/admin',         adminRouter)
app.use('/api/users',         usersRouter)

// ── 404 / error handler ───────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Route not found' })
})

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', { message: err.message, stack: err.stack })
  res.status(500).json({ success: false, error: 'Internal server error' })
})

// ── Startup ───────────────────────────────────────────────────────────────────

const PORT = parseInt(process.env.PORT ?? '4000', 10)

async function start() {
  try {
    await connectDB()
    await connectRedis()
    setupSocketHandlers(io)

    // Scheduled job: refresh active shipments every 15 minutes
    cron.schedule('*/15 * * * *', async () => {
      logger.info('Running scheduled shipment refresh')
      await scheduledRefresh(io)
    })

    server.listen(PORT, () => {
      logger.info(`TrackAll API running on port ${PORT}`)
    })
  } catch (err) {
    logger.error('Failed to start server', { error: err })
    process.exit(1)
  }
}

start()

export { io }
