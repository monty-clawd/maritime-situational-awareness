import type { Server } from 'http'
import { WebSocketServer } from 'ws'
import type { Vessel } from '../types/maritime.js'

export type WebsocketMessage =
  | { type: 'vessel:update'; payload: unknown }
  | { type: 'alert:new'; payload: unknown }
  | { type: 'heartbeat'; payload: { timestamp: string } }

const HEARTBEAT_INTERVAL_MS = 15000

let broadcastMessage: ((message: WebsocketMessage) => void) | null = null

export const broadcastVessel = (vessel: Vessel) => {
  if (!broadcastMessage) return
  broadcastMessage({ type: 'vessel:update', payload: vessel })
}

export const broadcastFusedVessel = (vessel: Vessel) => {
  if (!broadcastMessage) return
  broadcastMessage({ type: 'vessel:update', payload: vessel })
}

export const initWebsocket = (server: Server) => {
  const wss = new WebSocketServer({ server, path: '/api/ws' })

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'heartbeat', payload: { timestamp: new Date().toISOString() } }))
  })

  const heartbeat = setInterval(() => {
    const message: WebsocketMessage = {
      type: 'heartbeat',
      payload: { timestamp: new Date().toISOString() },
    }
    const payload = JSON.stringify(message)
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(payload)
      }
    })
  }, HEARTBEAT_INTERVAL_MS)

  const close = () => {
    clearInterval(heartbeat)
    wss.close()
    if (broadcastMessage === broadcast) {
      broadcastMessage = null
    }
  }

  const broadcast = (message: WebsocketMessage) => {
    const payload = JSON.stringify(message)
    wss.clients.forEach((client) => {
      if (client.readyState === client.OPEN) {
        client.send(payload)
      }
    })
  }

  broadcastMessage = broadcast

  return { wss, broadcast, close }
}
