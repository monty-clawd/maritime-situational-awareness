import WebSocket from 'ws'
import { env } from '../config/env'
import { logger } from './logger'

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
    [key: string]: unknown
  }
  [key: string]: unknown
}

let socket: WebSocket | null = null
let reconnectTimer: NodeJS.Timeout | null = null
let reconnectAttempts = 0
let hasStarted = false

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

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

const handleMessage = (rawData: WebSocket.RawData) => {
  const payload = typeof rawData === 'string' ? rawData : rawData.toString()
  const message = parseMessage(payload)
  if (!message || message.MessageType !== 'PositionReport') {
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

  console.log(parsed)
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
    return
  }

  clearReconnectTimer()
  socket = new WebSocket(AISSTREAM_URL)

  socket.on('open', () => {
    reconnectAttempts = 0
    const subscription: AisStreamSubscription = {
      Apikey: env.AISSTREAM_API_KEY as string,
      BoundingBoxes: GLOBAL_BOUNDING_BOXES,
      FilterMessageTypes: ['PositionReport'],
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
