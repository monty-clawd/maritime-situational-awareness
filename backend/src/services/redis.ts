import { createClient } from 'redis'
import { env } from '../config/env'
import { logger } from './logger'

export const redisClient = createClient({ url: env.REDIS_URL })

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis client error')
})
