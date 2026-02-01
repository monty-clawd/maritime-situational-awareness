import { Router } from 'express'
import type { Alert } from '../types/maritime'

const router = Router()

const demoAlerts: Alert[] = [
  {
    id: 101,
    mmsi: 366982330,
    type: 'POSITION_DISCREPANCY',
    severity: 'HIGH',
    createdAt: new Date().toISOString(),
    details: { deltaMeters: 812, source: 'Radar vs AIS' },
  },
]

router.get('/', async (_req, res) => {
  res.json(demoAlerts)
})

router.post('/:alertId/acknowledge', async (req, res) => {
  const alertId = Number(req.params.alertId)
  res.json({ id: alertId, acknowledgedAt: new Date().toISOString() })
})

export default router
