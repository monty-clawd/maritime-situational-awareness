import { Router } from 'express'
import { getVessels } from '../services/aisstream'

const router = Router()

router.get('/', async (_req, res) => {
  res.json(getVessels())
})

router.get('/:mmsi', async (req, res) => {
  const mmsi = Number(req.params.mmsi)
  const vessel = getVessels().find((item) => item.mmsi === mmsi)
  if (!vessel) {
    res.status(404).json({ error: 'Vessel not found' })
    return
  }
  res.json(vessel)
})

export default router
