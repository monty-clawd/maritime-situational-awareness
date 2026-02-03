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
  callSign?: string
  flag?: string
  type?: string
  length?: number
  width?: number
  destination?: string
  lastPosition?: Position
  isLoitering?: boolean
  firstStationaryTime?: string
}

export interface Alert {
  id: number
  mmsi: number
  type: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  acknowledged: boolean
  acknowledgedAt?: string | null
  details?: Record<string, unknown>
}
