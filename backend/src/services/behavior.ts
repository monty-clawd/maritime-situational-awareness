import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env.js'
import { getVessels } from './aisstream.js'
import type { Vessel } from '../types/maritime.js'

// --- Mock Data for MVP ---
const SHIPPING_LANES = [
  {
    id: 'lane-1',
    name: 'Strait of Juan de Fuca (Eastbound)',
    // Rough box for demo
    bounds: { minLon: -124.5, minLat: 48.2, maxLon: -123.0, maxLat: 48.4 },
    direction: 90, // East
    tolerance: 60,
    maxSpeed: 25,
    minSpeed: 5
  }
]

const NO_LOITERING_ZONES = [
  {
    id: 'zone-sensitive-1',
    name: 'San Juan Islands Protection Zone',
    bounds: { minLon: -123.2, minLat: 48.4, maxLon: -122.8, maxLat: 48.7 },
    maxDurationMinutes: 10
  }
]

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

export class BehaviorService {
  private genAI: GoogleGenerativeAI | null = null
  private model: any = null

  constructor() {
    if (env.GEMINI_API_KEY) {
      this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' })
    }
  }

  private isInBox(lon: number, lat: number, box: typeof SHIPPING_LANES[0]['bounds']) {
    return lon >= box.minLon && lon <= box.maxLon && lat >= box.minLat && lat <= box.maxLat
  }

  public detectDeviations(vessel: Vessel): Deviation[] {
    const deviations: Deviation[] = []
    const pos = vessel.lastPosition
    
    if (!pos) return deviations

    // 1. Check Shipping Lanes
    for (const lane of SHIPPING_LANES) {
      if (this.isInBox(pos.longitude, pos.latitude, lane.bounds)) {
        // Course Check
        if (pos.heading !== undefined) {
            const diff = Math.abs(pos.heading - lane.direction)
            const normalizedDiff = diff > 180 ? 360 - diff : diff
            if (normalizedDiff > lane.tolerance) {
                deviations.push({
                    type: 'COURSE_MISMATCH',
                    severity: 'MEDIUM',
                    description: `Vessel moving ${pos.heading.toFixed(0)}° in ${lane.name} (expected ~${lane.direction}°)`,
                    details: { expected: lane.direction, actual: pos.heading }
                })
            }
        }
        
        // Speed Check
        if (pos.speed !== undefined) {
             if (pos.speed > lane.maxSpeed) {
                deviations.push({
                    type: 'SPEED_ANOMALY',
                    severity: 'MEDIUM',
                    description: `Speed ${pos.speed}kn exceeds max ${lane.maxSpeed}kn in ${lane.name}`,
                    details: { max: lane.maxSpeed, actual: pos.speed }
                })
             }
        }
      }
    }

    // 2. Check Loitering (Simplified: Speed < 0.5kn in Zone)
    for (const zone of NO_LOITERING_ZONES) {
        if (this.isInBox(pos.longitude, pos.latitude, zone.bounds)) {
            if (pos.speed !== undefined && pos.speed < 0.5) {
                 deviations.push({
                    type: 'LOITERING',
                    severity: 'HIGH',
                    description: `Vessel loitering in ${zone.name}`,
                    details: { zone: zone.name, speed: pos.speed }
                })
            }
        }
    }

    return deviations
  }

  public async analyzeVessel(mmsi: number): Promise<AnalysisResult> {
    const liveVessels = getVessels()
    const vessel = liveVessels.find(v => v.mmsi === mmsi)
    
    if (!vessel || !vessel.lastPosition) {
        throw new Error('Vessel not found')
    }

    const deviations = this.detectDeviations(vessel as Vessel)

    let explanation = "AI analysis unavailable (Missing API Key)."
    if (this.model && deviations.length > 0) {
        try {
            const prompt = `
            You are a maritime security analyst. Analyze this vessel behavior.
            
            Vessel MMSI: ${vessel.mmsi}
            Type: ${vessel.type ?? 'Unknown'}
            Speed: ${vessel.lastPosition.speed} kn
            Course: ${vessel.lastPosition.heading}°
            Location: ${vessel.lastPosition.latitude}, ${vessel.lastPosition.longitude}
            
            Detected Anomalies:
            ${JSON.stringify(deviations, null, 2)}
            
            Provide a concise, professional assessment for a VTS operator. 
            Explain potential reasons (e.g., engine trouble, illegal fishing, waiting for pilot). 
            Keep it strictly under 3 sentences. Do not use markdown.
            `
            
            const result = await this.model.generateContent(prompt)
            explanation = result.response.text()
        } catch (error) {
            console.error("Gemini API Error:", error)
            explanation = "AI analysis failed due to service error."
        }
    } else if (deviations.length === 0) {
        explanation = "Vessel is operating within normal parameters. No deviations detected."
    }

    return {
        vesselId: mmsi,
        timestamp: new Date().toISOString(),
        deviations,
        explanation
    }
  }

  public getMockLanes() {
      return SHIPPING_LANES
  }
}

export const behaviorService = new BehaviorService()
