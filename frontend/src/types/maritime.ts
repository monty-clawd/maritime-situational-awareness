export type PositionSource = 'AIS' | 'RADAR' | 'FUSED'

export interface Position {
  timestamp: string
  latitude: number
  longitude: number
  speed?: number
  heading?: number
  source: PositionSource
  confidence?: number
}

export interface TrackPosition {
  timestamp: string
  latitude: number
  longitude: number
}

export interface Vessel {
  mmsi: number
  imo?: number
  name?: string
  callSign?: string
  flag?: string
  type?: string
  length?: number
  width?: number
  destination?: string
  lastPosition?: Position
}

export interface WatchlistEntry extends Vessel {
  notes?: string | null
  addedAt?: string
}

export interface Alert {
  id: number
  mmsi: number
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  acknowledged: boolean
  acknowledgedAt?: string | null
  details?: Record<string, unknown> | string // Relaxed to allow string details
}

export interface IntegrityAlertPayload {
  mmsi: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  type: string
  details: string
  timestamp: string
}

export interface InterferenceZone {
  latitude: number
  longitude: number
  radiusMeters: number
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  eventCount: number
}
