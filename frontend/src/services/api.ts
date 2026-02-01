import axios from 'axios'
import type { Alert, Vessel } from '@/types/maritime'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 10000,
})

export const fetchVessels = async (): Promise<Vessel[]> => {
  const response = await api.get<Vessel[]>('/api/vessels')
  return response.data
}

export const fetchAlerts = async (): Promise<Alert[]> => {
  const response = await api.get<Alert[]>('/api/alerts')
  return response.data
}

export default api
