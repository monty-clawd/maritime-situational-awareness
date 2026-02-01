import { Router } from 'express'
import type { Vessel } from '../types/maritime'

const router = Router()

const demoVessels: Vessel[] = [
  {
    mmsi: 366982330,
    imo: 9241061,
    name: 'Pacific Sentinel',
    flag: 'US',
    type: 'Container',
    destination: 'Los Angeles',
    lastPosition: {
      timestamp: new Date().toISOString(),
      latitude: 34.245,
      longitude: -120.121,
      speed: 18.2,
      heading: 246,
      source: 'FUSED',
      confidence: 0.93,
    },
  },
]

router.get('/', async (_req, res) => {
  res.json(demoVessels)
})

router.get('/:mmsi', async (req, res) => {
  const mmsi = Number(req.params.mmsi)
  const vessel = demoVessels.find((item) => item.mmsi === mmsi)
  if (!vessel) {
    res.status(404).json({ error: 'Vessel not found' })
    return
  }
  res.json(vessel)
})

export default router
