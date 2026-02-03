import type { Alert, Vessel } from '@/types/maritime'

export type WebsocketMessage =
  | { type: 'vessel:update'; payload: Vessel }
  | { type: 'alert:new'; payload: unknown }
  | { type: 'heartbeat'; payload: { timestamp: string } }

export type WebsocketHandlers = {
  onVesselUpdate?: (vessel: Vessel) => void
  onAlert?: (alert: unknown) => void
  onHeartbeat?: (timestamp: string) => void
}

export class MaritimeWebSocket {
  private socket: WebSocket | null = null
  private readonly url: string
  private readonly handlers: WebsocketHandlers

  constructor(url: string, handlers: WebsocketHandlers) {
    this.url = url
    this.handlers = handlers
  }

  connect(): void {
    if (this.socket) return
    this.socket = new WebSocket(this.url)
    this.socket.onopen = () => {
      console.info('WebSocket connected', this.url)
    }
    this.socket.onmessage = (event) => {
      const parsed = JSON.parse(event.data) as WebsocketMessage
      if (parsed.type === 'vessel:update') this.handlers.onVesselUpdate?.(parsed.payload)
      if (parsed.type === 'alert:new') this.handlers.onAlert?.(parsed.payload)
      if (parsed.type === 'heartbeat') this.handlers.onHeartbeat?.(parsed.payload.timestamp)
    }
    this.socket.onerror = (event) => {
      console.error('WebSocket error', event)
    }
    this.socket.onclose = () => {
      this.socket = null
    }
  }

  disconnect(): void {
    this.socket?.close()
    this.socket = null
  }
}
