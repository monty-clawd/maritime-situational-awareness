import { Router } from 'express'
import { pool } from '../db/pool.js'
import { getVessels } from '../services/aisstream.js'
import type { Vessel } from '../types/maritime.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const liveVessels = getVessels()
    if (liveVessels.length === 0) {
      res.json([])
      return
    }

    const mmsiList = liveVessels.map((vessel) => vessel.mmsi)
    const { rows } = await pool.query(
      `
        SELECT mmsi, imo, name, type, call_sign, length, width, flag, destination
        FROM vessels
        WHERE mmsi = ANY($1)
      `,
      [mmsiList],
    )

    const staticByMmsi = new Map<number, typeof rows[number]>(
      rows.map((row) => [Number(row.mmsi), row]),
    )

    const enriched = liveVessels.map((vessel) => {
      const staticData = staticByMmsi.get(vessel.mmsi)
      return {
        ...vessel,
        imo: vessel.imo ?? staticData?.imo ?? undefined,
        name: vessel.name ?? staticData?.name ?? undefined,
        type: vessel.type ?? staticData?.type ?? undefined,
        callSign: vessel.callSign ?? staticData?.call_sign ?? undefined,
        length: vessel.length ?? staticData?.length ?? undefined,
        width: vessel.width ?? staticData?.width ?? undefined,
        flag: vessel.flag ?? staticData?.flag ?? undefined,
        destination: vessel.destination ?? staticData?.destination ?? undefined,
      } satisfies Vessel
    })

    res.json(enriched)
  } catch (err) {
    next(err)
  }
})

router.get('/:mmsi', async (req, res, next) => {
  try {
    const mmsi = Number(req.params.mmsi)
    const vessel = getVessels().find((item) => item.mmsi === mmsi)
    if (!vessel) {
      res.status(404).json({ error: 'Vessel not found' })
      return
    }

    const { rows } = await pool.query(
      `
        SELECT mmsi, imo, name, type, call_sign, length, width, flag, destination
        FROM vessels
        WHERE mmsi = $1
        LIMIT 1
      `,
      [mmsi],
    )

    const staticData = rows[0]
    const enriched: Vessel = {
      ...vessel,
      imo: vessel.imo ?? staticData?.imo ?? undefined,
      name: vessel.name ?? staticData?.name ?? undefined,
      type: vessel.type ?? staticData?.type ?? undefined,
      callSign: vessel.callSign ?? staticData?.call_sign ?? undefined,
      length: vessel.length ?? staticData?.length ?? undefined,
      width: vessel.width ?? staticData?.width ?? undefined,
      flag: vessel.flag ?? staticData?.flag ?? undefined,
      destination: vessel.destination ?? staticData?.destination ?? undefined,
    }

    res.json(enriched)
  } catch (err) {
    next(err)
  }
})

export default router
