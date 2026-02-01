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

export interface Vessel {
  mmsi: number
  imo?: number
  name?: string
  flag?: string
  type?: string
  destination?: string
  lastPosition?: Position
}

export interface Alert {
  id: number
  mmsi: number
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  acknowledgedAt?: string
  details?: Record<string, unknown>
}
