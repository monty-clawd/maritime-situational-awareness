import { Router } from 'express'
import { pool } from '../db/pool.js'
import { redisClient } from '../services/redis.js'
import { getAisStatus, getVessels } from '../services/aisstream.js'

type StatusState = 'ONLINE' | 'OFFLINE' | 'DEGRADED'

type SystemStatus = {
  aisStream: StatusState
  radar: StatusState
  database: StatusState
  redis: StatusState
  metrics: {
    messagesPerMinute: number
    totalTrackedVessels: number
  }
  lastUpdate: string
  debug?: {
    messageCount: number
    lastMessage: string | null
    types: Record<string, number>
    lastPayload: string | null
  }
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
  const aisStatus = getAisStatus()
  const aisStream = aisStatus.connected ? 'ONLINE' : 'OFFLINE'
  const vessels = getVessels()

  const payload: SystemStatus = {
    aisStream,
    radar: 'OFFLINE',
    database,
    redis,
    metrics: {
      messagesPerMinute: aisStatus.messagesPerMinute,
      totalTrackedVessels: vessels.length,
    },
    lastUpdate: new Date().toISOString(),
    debug: {
      messageCount: aisStatus.messageCount,
      lastMessage: aisStatus.lastMessageTime,
      types: aisStatus.messageTypes,
      lastPayload: aisStatus.lastPayload
    }
  }

  res.json(payload)
})

export default router
