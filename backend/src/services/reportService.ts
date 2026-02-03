import { GoogleGenerativeAI } from '@google/generative-ai'
import { env } from '../config/env.js'
import { logger } from './logger.js'

let genAI: GoogleGenerativeAI | null = null
if (env.GEMINI_API_KEY) {
  genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY)
} else {
  logger.warn('GEMINI_API_KEY not found. AI features will be disabled/mocked.')
}

export interface ReportContext {
  vesselName?: string
  mmsi: number
  location: { lat: number; lon: number }
  time: string
  alerts: string[]
  weather?: string
}

export const generateIncidentReport = async (context: ReportContext): Promise<string> => {
  if (!genAI) {
    logger.info('Generating mock report due to missing API key')
    return `# Mock Incident Report for ${context.mmsi}
    
**Vessel:** ${context.vesselName || 'Unknown'} (${context.mmsi})
**Time:** ${context.time}
**Location:** ${context.location.lat}, ${context.location.lon}

**Summary:**
This is a mock report because the Gemini API key is not configured.

**Alerts:**
${context.alerts.length > 0 ? context.alerts.map(a => `- ${a}`).join('\n') : 'None'}

**Weather:**
${context.weather || 'No weather data provided'}
    `
  }

  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' }) // defaulting to flash for speed/cost, fallback to pro if needed
    
    const prompt = `
      You are a Maritime Incident Reporting Assistant. Write a formal, professional incident report based on the following data:
      
      VESSEL DETAILS:
      - Name: ${context.vesselName || 'Unknown'}
      - MMSI: ${context.mmsi}
      
      INCIDENT CONTEXT:
      - Time: ${context.time}
      - Location: ${context.location.lat}, ${context.location.lon}
      - Weather Conditions: ${context.weather || 'Not specified'}
      
      ACTIVE ALERTS (Reasons for report):
      ${context.alerts.length > 0 ? context.alerts.map(a => `- ${a}`).join('\n') : 'No specific alerts trigger.'}
      
      INSTRUCTIONS:
      - Format the output in Markdown.
      - Use headers: ## Incident Overview, ## Vessel Details, ## Situational Analysis, ## Recommendations.
      - In "Situational Analysis", discuss the location and weather implications if data is present.
      - In "Recommendations", suggest standard maritime procedures based on the alerts (e.g., if "Speeding", suggest "Contact vessel for intention").
      - Keep it factual and concise.
    `

    const result = await model.generateContent(prompt)
    const response = await result.response
    return response.text()
  } catch (error) {
    logger.error({ error }, 'Failed to generate report with Gemini')
    // Fallback to mock on error to not break UI
    return `Error generating report: ${error instanceof Error ? error.message : 'Unknown error'}`
  }
}
