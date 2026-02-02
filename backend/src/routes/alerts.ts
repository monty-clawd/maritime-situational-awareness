import { Router } from 'express'
import type { Alert } from '../types/maritime.js'

const router = Router()

const alerts: Alert[] = [
  {
    id: 101,
    mmsi: 366982330,
    type: 'POSITION_DISCREPANCY',
    severity: 'HIGH',
    createdAt: new Date().toISOString(),
    acknowledged: false,
    acknowledgedAt: null,
    details: { deltaMeters: 812, source: 'Radar vs AIS' },
  },
]

router.get('/', async (_req, res) => {
  const sortedAlerts = [...alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  res.json(sortedAlerts)
})

router.post('/:alertId/acknowledge', async (req, res) => {
  const alertId = Number(req.params.alertId)
  const alert = alerts.find((entry) => entry.id === alertId)
  if (!alert) {
    res.status(404).json({ message: 'Alert not found' })
    return
  }

  if (!alert.acknowledged) {
    alert.acknowledged = true
    alert.acknowledgedAt = new Date().toISOString()
  }

  res.json(alert)
})

export default router
