import { Router } from 'express'
import { behaviorService } from '../services/behavior.js'

const router = Router()

// Analyze a specific vessel
router.post('/analyze/:mmsi', async (req, res, next) => {
  try {
    const mmsi = Number(req.params.mmsi)
    if (isNaN(mmsi)) {
      res.status(400).json({ error: 'Invalid MMSI' })
      return
    }

    const result = await behaviorService.analyzeVessel(mmsi)
    res.json(result)
  } catch (err: any) {
    if (err.message === 'Vessel not found') {
      res.status(404).json({ error: 'Vessel not found' })
    } else {
      next(err)
    }
  }
})

// Get static heatmap/lane data
router.get('/lanes', (_req, res) => {
    res.json(behaviorService.getMockLanes())
})

export default router
