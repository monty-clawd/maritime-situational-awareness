import { createServer } from 'http'
import app from './app.js'
import { env } from './config/env.js'
import { logger } from './services/logger.js'
import { initWebsocket } from './websocket/server.js'
import { redisClient } from './services/redis.js'
import { startAISStream } from './services/aisstream.js'

const server = createServer(app)
const websocket = initWebsocket(server)

const start = async () => {
  try {
    // Try to connect to Redis in background, but don't block startup (MVP can work in-memory)
    redisClient.connect().then(
      () => logger.info('Redis connected'),
      (err) => logger.warn({ err }, 'Redis connection failed - running in memory mode')
    )
    
    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'Backend listening')
      startAISStream()
    })
  } catch (err) {
    logger.error({ err }, 'Failed to start server')
    process.exit(1)
  }
}

const shutdown = async () => {
  logger.info('Shutting down backend')
  websocket.close()
  server.close(() => {
    logger.info('HTTP server closed')
  })
  if (redisClient.isOpen) {
    await redisClient.quit()
  }
}

process.on('SIGINT', () => {
  void shutdown().then(() => process.exit(0))
})
process.on('SIGTERM', () => {
  void shutdown().then(() => process.exit(0))
})

void start()
