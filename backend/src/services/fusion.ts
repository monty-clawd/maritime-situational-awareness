import type { Vessel } from '../types/maritime.js'
import { detectDiscrepancy } from './discrepancy.js'
import { logger } from './logger.js'
import { broadcastFusedVessel } from '../websocket/server.js'

type FusionSource = 'AIS' | 'RADAR'

type PositionSnapshot = {
  latitude: number
  longitude: number
  timestamp: string
}

const aisPositions = new Map<number, PositionSnapshot>()
const radarPositions = new Map<number, PositionSnapshot>()
const fusedVessels = new Map<number, Vessel>()

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const toRadians = (value: number): number => (value * Math.PI) / 180

const haversineDistanceMeters = (a: PositionSnapshot, b: PositionSnapshot): number => {
  const lat1 = toRadians(a.latitude)
  const lon1 = toRadians(a.longitude)
  const lat2 = toRadians(b.latitude)
  const lon2 = toRadians(b.longitude)

  const deltaLat = lat2 - lat1
  const deltaLon = lon2 - lon1

  const sinLat = Math.sin(deltaLat / 2)
  const sinLon = Math.sin(deltaLon / 2)

  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon

  const centralAngle = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))

  return 6371000 * centralAngle
}

const toDiscrepancyPosition = (mmsi: number, position: PositionSnapshot) => ({
  mmsi: String(mmsi),
  latitude: position.latitude,
  longitude: position.longitude,
})

export const fusePosition = (
  mmsi: number,
  source: FusionSource,
  latitude: number,
  longitude: number
): Vessel | null => {
  const timestamp = new Date().toISOString()
  const snapshot: PositionSnapshot = { latitude, longitude, timestamp }

  if (source === 'AIS') {
    aisPositions.set(mmsi, snapshot)
  } else {
    radarPositions.set(mmsi, snapshot)
  }

  const aisPosition = aisPositions.get(mmsi)
  const radarPosition = radarPositions.get(mmsi)
  if (!aisPosition || !radarPosition) {
    return null
  }

  const fusedLatitude = (aisPosition.latitude + radarPosition.latitude) / 2
  const fusedLongitude = (aisPosition.longitude + radarPosition.longitude) / 2
  const deltaMeters = haversineDistanceMeters(aisPosition, radarPosition)
  const confidence = clamp(1 - deltaMeters / 1000, 0, 1)

  const vessel: Vessel = {
    mmsi,
    lastPosition: {
      timestamp,
      latitude: fusedLatitude,
      longitude: fusedLongitude,
      source: 'FUSED',
      confidence,
    },
  }

  fusedVessels.set(mmsi, vessel)

  const discrepancy = detectDiscrepancy(
    toDiscrepancyPosition(mmsi, aisPosition),
    toDiscrepancyPosition(mmsi, radarPosition)
  )
  if (discrepancy) {
    logger.warn({ discrepancy }, 'Position discrepancy detected')
  }

  broadcastFusedVessel(vessel)

  return vessel
}

export const getFusedVessels = (): Vessel[] => Array.from(fusedVessels.values())
