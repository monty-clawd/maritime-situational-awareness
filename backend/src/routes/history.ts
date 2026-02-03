import { Router } from 'express'
import { pool } from '../db/pool.js'
import { logger } from '../services/logger.js'

const router = Router()

// GET /api/history/:mmsi?start=...&end=...
router.get('/:mmsi', async (req, res) => {
  const mmsi = Number(req.params.mmsi)
  if (Number.isNaN(mmsi)) {
    res.status(400).json({ error: 'Invalid MMSI' })
    return
  }

  const { start, end } = req.query
  let startTime = new Date(Date.now() - 24 * 60 * 60 * 1000) // Default last 24h
  let endTime = new Date()

  if (typeof start === 'string') {
    const parsed = new Date(start)
    if (!Number.isNaN(parsed.getTime())) startTime = parsed
  }

  if (typeof end === 'string') {
    const parsed = new Date(end)
    if (!Number.isNaN(parsed.getTime())) endTime = parsed
  }

  try {
    const result = await pool.query(
      `
      SELECT timestamp, latitude, longitude, speed, heading, source
      FROM positions
      WHERE mmsi = $1
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp ASC
      `,
      [mmsi, startTime, endTime]
    )

    // Convert to GeoJSON LineString
    const coordinates = result.rows.map(row => [row.longitude, row.latitude])
    const geojson = {
      type: 'Feature',
      properties: {
        mmsi,
        count: result.rowCount
      },
      geometry: {
        type: 'LineString',
        coordinates
      }
    }

    res.json({
      mmsi,
      range: { start: startTime, end: endTime },
      points: result.rows,
      track: geojson
    })
  } catch (err) {
    logger.error({ err, mmsi }, 'Failed to fetch history')
    res.status(500).json({ error: 'Internal server error' })
  }
})

export default router
