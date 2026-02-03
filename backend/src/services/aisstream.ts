import WebSocket from 'ws'
import { env } from '../config/env.js'
import { logger } from './logger.js'
import type { Vessel } from '../types/maritime.js'
import { broadcastVessel } from '../websocket/server.js'
import { fusePosition } from './fusion.js'
import { pool } from '../db/pool.js'

const AISSTREAM_URL = 'wss://stream.aisstream.io/v0/stream'
const GLOBAL_BOUNDING_BOXES: BoundingBox[] = [[[-90, -180], [90, 180]]]

const BASE_BACKOFF_MS = 1000
const MAX_BACKOFF_MS = 30_000

type BoundingBox = [[number, number], [number, number]]

type AisStreamSubscription = {
  Apikey: string
  BoundingBoxes: BoundingBox[]
  FiltersShipMMSI?: string[]
  FilterMessageTypes?: string[]
}

type AisStreamMetadata = {
  ShipName?: string
  VesselName?: string
  Name?: string
  MMSI?: number
  Latitude?: number
  Longitude?: number
  [key: string]: unknown
}

type AisPositionReport = {
  UserID: number
  Latitude: number
  Longitude: number
  Sog?: number
  Cog?: number
  TrueHeading?: number
  [key: string]: unknown
}

type AisStreamMessage = {
  MessageType: string
  Metadata?: AisStreamMetadata
  Message?: {
    PositionReport?: AisPositionReport
    ShipStaticData?: Record<string, unknown>
    [key: string]: unknown
  }
  [key: string]: unknown
}

let socket: WebSocket | null = null
let reconnectTimer: NodeJS.Timeout | null = null
let reconnectAttempts = 0
let hasStarted = false
const latestVessels = new Map<number, Vessel>()

// --- Simulation Logic ---
const SIMULATION_CENTER = { lat: 54.0, lon: 10.0 }
const SIMULATED_COUNT = 25
let simulationInterval: NodeJS.Timeout | null = null

const SIMULATED_NAMES = [
  'Spirit of the North', 'Baltic Queen', 'Nordic Star', 'Ocean Giant', 
  'Sea Explorer', 'Hamburg Express', 'Viking Grace', 'Stena Germanica',
  'Color Magic', 'Pearl Seaways', 'Finnlines Star', 'Crown Seaways',
  'Stena Scandinavica', 'Peter Pan', 'Nils Holgersson', 'Robin Hood',
  'Tom Sawyer', 'Huckleberry Finn', 'Akka', 'Tinker Bell', 'Europa',
  'Skane', 'Mecklenburg-Vorpommern', 'Berlin', 'Copenhagen'
]

const startSimulation = () => {
    if (simulationInterval) return
    logger.info('Starting AIS simulation mode (No API Key found)')

    // Initialize random vessels
    for (let i = 0; i < SIMULATED_COUNT; i++) {
        const mmsi = 200000000 + i
        // Spread them out a bit more
        const lat = SIMULATION_CENTER.lat + (Math.random() - 0.5) * 3.0
        const lon = SIMULATION_CENTER.lon + (Math.random() - 0.5) * 6.0
        const heading = Math.random() * 360
        const speed = 5 + Math.random() * 15
        
        const vessel: Vessel = {
            mmsi,
            name: SIMULATED_NAMES[i] || `Sim Vessel ${i}`,
            type: Math.random() > 0.5 ? 'Cargo' : 'Passenger',
            length: 100 + Math.random() * 200,
            width: 20 + Math.random() * 10,
            destination: Math.random() > 0.5 ? 'Hamburg' : 'Kiel',
            flag: 'DE',
            imo: 9000000 + i,
            callSign: `D${Math.floor(Math.random() * 1000)}`,
            lastPosition: {
                timestamp: new Date().toISOString(),
                latitude: lat,
                longitude: lon,
                speed,
                heading,
                source: 'AIS',
                confidence: 1.0
            }
        }
        latestVessels.set(mmsi, vessel)
    }

    simulationInterval = setInterval(() => {
        const now = new Date().toISOString()
        for (const mmsi of latestVessels.keys()) {
            const vessel = latestVessels.get(mmsi)
            if (!vessel || !vessel.lastPosition) continue

            const speed = vessel.lastPosition.speed || 0
            const heading = vessel.lastPosition.heading || 0
            
            // 1 degree lat ~ 60nm ~ 111km
            // speed is knots (nm/h)
            // update every 2s
            const distDeg = (speed * (2/3600)) / 60 
            
            const rad = (heading * Math.PI) / 180
            const dLat = Math.cos(rad) * distDeg
            const dLon = Math.sin(rad) * distDeg // ignoring lat projection for simplicity
            
            // Random course changes
            const newHeading = (heading + (Math.random() - 0.5) * 5) % 360
            
            // Bounce off boundaries (rough box)
            let newLat = vessel.lastPosition.latitude + dLat
            let newLon = vessel.lastPosition.longitude + dLon
            let finalHeading = newHeading

            if (newLat > 57 || newLat < 53) finalHeading = (180 - finalHeading + 360) % 360
            if (newLon > 15 || newLon < 3) finalHeading = (360 - finalHeading) % 360

            const updatedVessel: Vessel = {
                ...vessel,
                lastPosition: {
                    ...vessel.lastPosition,
                    timestamp: now,
                    latitude: newLat,
                    longitude: newLon,
                    heading: finalHeading
                }
            }
            
            latestVessels.set(mmsi, updatedVessel)
            broadcastVessel(updatedVessel)
            fusePosition(mmsi, 'AIS', newLat, newLon)
        }
    }, 2000)
}

// --- End Simulation Logic ---

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return undefined
}

const toStringValue = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed.length ? trimmed : undefined
}

const parseMessage = (raw: string): AisStreamMessage | null => {
  try {
    const parsed = JSON.parse(raw)
    if (!isRecord(parsed)) return null
    if (typeof parsed.MessageType !== 'string') return null
    return parsed as AisStreamMessage
  } catch {
    return null
  }
}

const getVesselName = (metadata?: AisStreamMetadata): string | undefined =>
  metadata?.ShipName ?? metadata?.VesselName ?? metadata?.Name

type VesselStaticUpdate = {
  mmsi: number
  imo?: number
  name?: string
  type?: string
  callSign?: string
  length?: number
  width?: number
}

const getDimensions = (value: unknown): { length?: number; width?: number } => {
  if (!isRecord(value)) return {}
  const toBow = toNumber(value.ToBow)
  const toStern = toNumber(value.ToStern)
  const toPort = toNumber(value.ToPort)
  const toStarboard = toNumber(value.ToStarboard)
  const length = toBow !== undefined && toStern !== undefined ? toBow + toStern : undefined
  const width = toPort !== undefined && toStarboard !== undefined ? toPort + toStarboard : undefined
  return { length, width }
}

const upsertVesselStatic = async (update: VesselStaticUpdate) => {
  try {
    await pool.query(
      `
        INSERT INTO vessels (mmsi, imo, name, type, call_sign, length, width, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (mmsi)
        DO UPDATE SET
          imo = COALESCE(EXCLUDED.imo, vessels.imo),
          name = COALESCE(EXCLUDED.name, vessels.name),
          type = COALESCE(EXCLUDED.type, vessels.type),
          call_sign = COALESCE(EXCLUDED.call_sign, vessels.call_sign),
          length = COALESCE(EXCLUDED.length, vessels.length),
          width = COALESCE(EXCLUDED.width, vessels.width),
          updated_at = NOW()
      `,
      [
        update.mmsi,
        update.imo ?? null,
        update.name ?? null,
        update.type ?? null,
        update.callSign ?? null,
        update.length ?? null,
        update.width ?? null,
      ],
    )
  } catch (err) {
    logger.error({ err, mmsi: update.mmsi }, 'Failed to upsert vessel static data')
  }
}

const extractStaticData = (message: AisStreamMessage): VesselStaticUpdate | null => {
  const messageBody = message.Message
  if (!isRecord(messageBody)) return null
  const staticPayload = (messageBody.ShipStaticData ??
    messageBody.ShipStaticDataReport ??
    messageBody.StaticDataReport ??
    messageBody.StaticData ??
    messageBody) as Record<string, unknown> | undefined
  if (!staticPayload || !isRecord(staticPayload)) return null

  const metadata = message.Metadata
  const mmsi =
    toNumber(staticPayload.MMSI) ??
    toNumber(staticPayload.UserID) ??
    toNumber(metadata?.MMSI)

  if (!mmsi) return null

  const name =
    toStringValue(staticPayload.ShipName) ??
    toStringValue(staticPayload.Name) ??
    toStringValue(staticPayload.VesselName) ??
    getVesselName(metadata)

  const callSign =
    toStringValue(staticPayload.CallSign) ??
    toStringValue(staticPayload.Callsign) ??
    toStringValue(staticPayload.CallSignNumber)

  const shipTypeValue = staticPayload.ShipType ?? staticPayload.Type
  const type =
    toStringValue(shipTypeValue) ??
    (typeof shipTypeValue === 'number' ? String(shipTypeValue) : undefined)

  const imo = toNumber(staticPayload.IMO) ?? toNumber(staticPayload.Imo)
  const dimensions = getDimensions(staticPayload.Dimension ?? staticPayload.Dimensions)

  return {
    mmsi,
    imo,
    name,
    type,
    callSign,
    length: dimensions.length,
    width: dimensions.width,
  }
}

const handleStaticDataMessage = (message: AisStreamMessage) => {
  const staticUpdate = extractStaticData(message)
  if (!staticUpdate) return
  const existing = latestVessels.get(staticUpdate.mmsi)
  if (existing) {
    latestVessels.set(staticUpdate.mmsi, {
      ...existing,
      name: existing.name ?? staticUpdate.name,
      type: existing.type ?? staticUpdate.type,
      imo: existing.imo ?? staticUpdate.imo,
      callSign: existing.callSign ?? staticUpdate.callSign,
      length: existing.length ?? staticUpdate.length,
      width: existing.width ?? staticUpdate.width,
    })
  }
  void upsertVesselStatic(staticUpdate)
}

const handleMessage = (rawData: WebSocket.RawData) => {
  const payload = typeof rawData === 'string' ? rawData : rawData.toString()
  const message = parseMessage(payload)
  if (!message) {
    return
  }

  if (
    message.MessageType === 'ShipStaticData' ||
    message.MessageType === 'ShipStaticDataReport' ||
    message.MessageType === 'StaticDataReport' ||
    message.MessageType === 'StaticData'
  ) {
    handleStaticDataMessage(message)
    return
  }

  if (message.MessageType !== 'PositionReport') {
    return
  }

  const positionReport = message.Message?.PositionReport
  if (!positionReport) return

  const parsed = {
    mmsi: positionReport.UserID,
    latitude: positionReport.Latitude,
    longitude: positionReport.Longitude,
    sog: positionReport.Sog,
    cog: positionReport.Cog,
    vesselName: getVesselName(message.Metadata),
  }

  if (typeof parsed.latitude !== 'number' || typeof parsed.longitude !== 'number') {
    return
  }

  const vessel: Vessel = {
    mmsi: parsed.mmsi,
    name: parsed.vesselName,
    lastPosition: {
      timestamp: new Date().toISOString(),
      latitude: parsed.latitude,
      longitude: parsed.longitude,
      speed: parsed.sog,
      heading: positionReport.TrueHeading ?? parsed.cog,
      source: 'AIS',
    },
  }

  latestVessels.set(vessel.mmsi, vessel)
  broadcastVessel(vessel)
  fusePosition(vessel.mmsi, 'AIS', parsed.latitude, parsed.longitude)
}

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

const scheduleReconnect = () => {
  clearReconnectTimer()
  reconnectAttempts += 1
  const delay = Math.min(MAX_BACKOFF_MS, BASE_BACKOFF_MS * 2 ** (reconnectAttempts - 1))
  logger.warn({ delayMs: delay }, 'AISStream disconnected; scheduling reconnect')
  reconnectTimer = setTimeout(connect, delay)
}

const connect = () => {
  if (!env.AISSTREAM_API_KEY) {
    logger.warn('AISSTREAM_API_KEY not set; AISStream client disabled')
    startSimulation() // Fallback to simulation
    return
  }

  clearReconnectTimer()
  socket = new WebSocket(AISSTREAM_URL)

  socket.on('open', () => {
    reconnectAttempts = 0
    const subscription: AisStreamSubscription = {
      Apikey: env.AISSTREAM_API_KEY as string,
      BoundingBoxes: GLOBAL_BOUNDING_BOXES,
      FilterMessageTypes: [
        'PositionReport',
        'ShipStaticData',
        'ShipStaticDataReport',
        'StaticDataReport',
        'StaticData',
      ],
    }
    socket?.send(JSON.stringify(subscription))
    logger.info('AISStream connected')
  })

  socket.on('message', handleMessage)

  socket.on('error', (err) => {
    logger.error({ err }, 'AISStream websocket error')
  })

  socket.on('close', (code, reason) => {
    logger.warn(
      { code, reason: reason.toString() },
      'AISStream websocket closed'
    )
    socket = null
    scheduleReconnect()
  })
}

export const startAISStream = () => {
  if (hasStarted) return
  hasStarted = true
  connect()
}

export const getVessels = (): Vessel[] => Array.from(latestVessels.values())
