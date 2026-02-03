import axios from 'axios'
import type { Alert, AnalysisResult, ShippingLane, Vessel, WatchlistEntry } from '@/types/maritime'

const resolveApiBaseUrl = (): string => {
  const envUrl = (import.meta.env.VITE_API_URL as string | undefined)?.trim()
  if (envUrl) return envUrl.replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) return window.location.origin
  return 'http://localhost:3000'
}

export const getApiBaseUrl = (): string => resolveApiBaseUrl()

const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 15000, // Increased for AI analysis
})

export type SystemStatus = {
  aisStream: 'ONLINE' | 'OFFLINE' | 'DEGRADED'
  radar: 'ONLINE' | 'OFFLINE' | 'DEGRADED'
  database: 'ONLINE' | 'OFFLINE' | 'DEGRADED'
  redis: 'ONLINE' | 'OFFLINE' | 'DEGRADED'
  metrics?: {
    messagesPerMinute: number
    totalTrackedVessels: number
  }
  lastUpdate: string
}

export const fetchVessels = async (): Promise<Vessel[]> => {
  const response = await api.get<Vessel[]>('/api/vessels')
  return response.data
}

export const fetchWatchlist = async (): Promise<WatchlistEntry[]> => {
  const response = await api.get<WatchlistEntry[]>('/api/watchlist')
  return response.data
}

export const addToWatchlist = async (mmsi: number, notes?: string): Promise<WatchlistEntry> => {
  const response = await api.post<WatchlistEntry>('/api/watchlist', { mmsi, notes })
  return response.data
}

export const removeFromWatchlist = async (mmsi: number): Promise<void> => {
  await api.delete(`/api/watchlist/${mmsi}`)
}

export const fetchAlerts = async (): Promise<Alert[]> => {
  const response = await api.get<Alert[]>('/api/alerts')
  return response.data
}

export const fetchStatus = async (): Promise<SystemStatus> => {
  const response = await api.get<SystemStatus>('/api/status')
  return response.data
}

export const analyzeVessel = async (mmsi: number): Promise<AnalysisResult> => {
    const response = await api.post<AnalysisResult>(`/api/behavior/analyze/${mmsi}`)
    return response.data
}

export const fetchLanes = async (): Promise<ShippingLane[]> => {
    const response = await api.get<ShippingLane[]>('/api/behavior/lanes')
    return response.data
}

export interface WeatherInfo {
  windSpeedKnots: number;
  windDirection: number;
  waveHeightMeters?: number;
  temperature?: number;
}

export const fetchWeather = async (lat: number, lon: number): Promise<WeatherInfo> => {
  const response = await api.get<WeatherInfo>('/api/environment', { params: { lat, lon } });
  return response.data;
}

export type HistoryResult = {
  mmsi: number
  range: { start: string; end: string }
  points: {
    timestamp: string
    latitude: number
    longitude: number
    speed: number
    heading: number
    source: string
  }[]
  track: GeoJSON.Feature<GeoJSON.LineString>
}

export const fetchHistory = async (mmsi: number, start?: Date, end?: Date): Promise<HistoryResult> => {
  const params: Record<string, string> = {}
  if (start) params.start = start.toISOString()
  if (end) params.end = end.toISOString()
  const response = await api.get<HistoryResult>(`/api/history/${mmsi}`, { params })
  return response.data
}

export const generateReport = async (context: {
  mmsi: number
  vesselName?: string
  lat: number
  lon: number
  time?: string
  alerts?: string[]
  weather?: string
}): Promise<{ report: string }> => {
  const response = await api.post<{ report: string }>('/api/reports/generate', context)
  return response.data
}

export const fetchZones = async (): Promise<GeoJSON.FeatureCollection> => {
  const response = await api.get<GeoJSON.FeatureCollection>('/api/zones')
  return response.data
}

export default api
