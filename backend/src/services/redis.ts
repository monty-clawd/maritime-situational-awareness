import { createClient } from 'redis'
import { env } from '../config/env'
import { logger } from './logger'

export const redisClient = createClient({ url: env.REDIS_URL })

// Only log first Redis error, not all reconnection attempts
let redisErrorLogged = false
redisClient.on('error', (err) => {
  if (!redisErrorLogged) {
    logger.warn({ err }, 'Redis client error (suppressing further errors)')
    redisErrorLogged = true
  }
})
