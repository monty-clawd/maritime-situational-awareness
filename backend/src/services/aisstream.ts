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
let isConnected = false
const latestVessels = new Map<number, Vessel>()

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
    isConnected = false
    return
  }

  clearReconnectTimer()
  socket = new WebSocket(AISSTREAM_URL)

  socket.on('open', () => {
    reconnectAttempts = 0
    isConnected = true
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
    isConnected = false
    logger.error({ err }, 'AISStream websocket error')
  })

  socket.on('close', (code, reason) => {
    isConnected = false
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
export const getAisStatus = (): boolean => isConnected
