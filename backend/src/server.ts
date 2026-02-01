import { createServer } from 'http'
import app from './app'
import { env } from './config/env'
import { logger } from './services/logger'
import { initWebsocket } from './websocket/server'
import { redisClient } from './services/redis'

const server = createServer(app)
const websocket = initWebsocket(server)

const start = async () => {
  try {
    await redisClient.connect()
    server.listen(env.PORT, () => {
      logger.info({ port: env.PORT }, 'Backend listening')
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
