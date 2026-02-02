import { Pool } from 'pg'
import { env } from '../config/env.js'
import { logger } from '../services/logger.js'

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
})

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected Postgres client error')
})
