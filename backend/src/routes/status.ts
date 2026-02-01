import { Router } from 'express'
import { pool } from '../db/pool'
import { redisClient } from '../services/redis'

type StatusState = 'ONLINE' | 'OFFLINE' | 'DEGRADED'

type SystemStatus = {
  aisStream: StatusState
  radar: StatusState
  database: StatusState
  redis: StatusState
  lastUpdate: string
}

const router = Router()

const checkDatabaseStatus = async (): Promise<StatusState> => {
  try {
    await pool.query('SELECT 1')
    return 'ONLINE'
  } catch {
    return 'OFFLINE'
  }
}

router.get('/', async (_req, res) => {
  const database = await checkDatabaseStatus()
  const redis = redisClient.isOpen ? 'ONLINE' : 'OFFLINE'

  const payload: SystemStatus = {
    aisStream: 'OFFLINE',
    radar: 'OFFLINE',
    database,
    redis,
    lastUpdate: new Date().toISOString(),
  }

  res.json(payload)
})

export default router
