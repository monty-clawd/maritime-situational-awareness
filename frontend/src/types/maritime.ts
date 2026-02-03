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
  isLoitering?: boolean
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

export interface Deviation {
  type: 'ROUTE_DEVIATION' | 'SPEED_ANOMALY' | 'LOITERING' | 'COURSE_MISMATCH'
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  description: string
  details: any
}

export interface AnalysisResult {
  vesselId: number
  timestamp: string
  deviations: Deviation[]
  explanation?: string
}

export interface ShippingLane {
    id: string
    name: string
    bounds: { minLon: number, minLat: number, maxLon: number, maxLat: number }
    direction: number
    tolerance: number
    maxSpeed: number
    minSpeed: number
}
