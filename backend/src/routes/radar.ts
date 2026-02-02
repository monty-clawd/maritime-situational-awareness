import { Router } from 'express'
import { fusePosition } from '../services/fusion.js'

type RadarTrackPayload = {
  mmsi: number
  latitude: number
  longitude: number
  speed: number
  heading: number
  confidence?: number
}

const router = Router()

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

router.post('/inject', (req, res) => {
  const payload = req.body as Partial<RadarTrackPayload>

  if (
    !isFiniteNumber(payload.mmsi) ||
    !isFiniteNumber(payload.latitude) ||
    !isFiniteNumber(payload.longitude) ||
    !isFiniteNumber(payload.speed) ||
    !isFiniteNumber(payload.heading) ||
    (payload.confidence !== undefined && !isFiniteNumber(payload.confidence))
  ) {
    return res.status(400).json({ error: 'Invalid radar track payload' })
  }

  const radarTrack: RadarTrackPayload = {
    mmsi: payload.mmsi,
    latitude: payload.latitude,
    longitude: payload.longitude,
    speed: payload.speed,
    heading: payload.heading,
    confidence: payload.confidence,
  }

  console.log('Radar track received', radarTrack)
  fusePosition(radarTrack.mmsi, 'RADAR', radarTrack.latitude, radarTrack.longitude)
  res.status(202).json({ status: 'accepted' })
})

export default router
