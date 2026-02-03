import { Router } from 'express'
import { pool } from '../db/pool.js'
import { getVessels } from '../services/aisstream.js'
import type { Vessel } from '../types/maritime.js'

const router = Router()
const DEFAULT_USER_ID = 1

const isValidMmsi = (value: number): boolean => Number.isFinite(value) && value > 0

router.get('/', async (_req, res, next) => {
  try {
    const { rows } = await pool.query(
      `
        SELECT w.mmsi,
               w.notes,
               w.added_at,
               v.imo,
               v.name,
               v.type,
               v.call_sign,
               v.length,
               v.width,
               v.flag,
               v.destination
        FROM watchlist w
        LEFT JOIN vessels v ON v.mmsi = w.mmsi
        WHERE w.user_id = $1
        ORDER BY w.added_at DESC
      `,
      [DEFAULT_USER_ID],
    )

    const liveMap = new Map<number, Vessel>(
      getVessels().map((vessel) => [vessel.mmsi, vessel]),
    )

    const response = rows.map((row) => {
      const mmsi = Number(row.mmsi)
      const live = liveMap.get(mmsi)
      const enriched: Vessel = {
        mmsi,
        imo: live?.imo ?? row.imo ?? undefined,
        name: live?.name ?? row.name ?? undefined,
        type: live?.type ?? row.type ?? undefined,
        callSign: live?.callSign ?? row.call_sign ?? undefined,
        length: live?.length ?? row.length ?? undefined,
        width: live?.width ?? row.width ?? undefined,
        flag: live?.flag ?? row.flag ?? undefined,
        destination: live?.destination ?? row.destination ?? undefined,
        lastPosition: live?.lastPosition,
      }

      return {
        ...enriched,
        notes: row.notes ?? null,
        addedAt: row.added_at,
      }
    })

    res.json(response)
  } catch (err) {
    next(err)
  }
})

router.post('/', async (req, res, next) => {
  try {
    const mmsi = Number(req.body?.mmsi)
    if (!isValidMmsi(mmsi)) {
      res.status(400).json({ error: 'Invalid MMSI' })
      return
    }

    const notes =
      typeof req.body?.notes === 'string' && req.body.notes.trim().length
        ? req.body.notes.trim()
        : null

    await pool.query(
      `
        INSERT INTO vessels (mmsi)
        VALUES ($1)
        ON CONFLICT (mmsi) DO NOTHING
      `,
      [mmsi],
    )

    await pool.query(
      `
        INSERT INTO watchlist (user_id, mmsi, notes)
        VALUES ($1, $2, $3)
        ON CONFLICT (user_id, mmsi)
        DO UPDATE SET notes = COALESCE(EXCLUDED.notes, watchlist.notes)
      `,
      [DEFAULT_USER_ID, mmsi, notes],
    )

    res.status(201).json({ mmsi, notes })
  } catch (err) {
    next(err)
  }
})

router.delete('/:mmsi', async (req, res, next) => {
  try {
    const mmsi = Number(req.params.mmsi)
    if (!isValidMmsi(mmsi)) {
      res.status(400).json({ error: 'Invalid MMSI' })
      return
    }

    const result = await pool.query(
      `
        DELETE FROM watchlist
        WHERE user_id = $1 AND mmsi = $2
      `,
      [DEFAULT_USER_ID, mmsi],
    )

    if (result.rowCount === 0) {
      res.status(404).json({ error: 'Watchlist entry not found' })
      return
    }

    res.status(204).send()
  } catch (err) {
    next(err)
  }
})

export default router
