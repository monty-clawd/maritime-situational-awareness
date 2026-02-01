import { Pool } from 'pg'
import { env } from '../config/env'
import { logger } from '../services/logger'

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
})

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected Postgres client error')
})
