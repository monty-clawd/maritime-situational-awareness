import type { Vessel } from '../types/maritime.js'
import { logger } from './logger.js'

const LOITERING_SPEED_THRESHOLD = 1.0 // knots
const LOITERING_TIME_THRESHOLD_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Analyzes vessel behavior for anomalies like loitering.
 * 
 * @param newVessel The incoming vessel data updated from AIS
 * @param previousVessel The previous state of the vessel (if any)
 * @returns The updated vessel object with analysis flags
 */
export const analyzeBehavior = (newVessel: Vessel, previousVessel?: Vessel): Vessel => {
  const result = { ...newVessel }
  
  // If no position data, we can't analyze speed behavior
  if (!result.lastPosition || result.lastPosition.speed === undefined) {
    // Preserve previous state if speed is missing
    if (previousVessel) {
      result.isLoitering = previousVessel.isLoitering
      result.firstStationaryTime = previousVessel.firstStationaryTime
    }
    return result
  }

  const speed = result.lastPosition.speed
  const timestamp = new Date(result.lastPosition.timestamp).getTime()

  // LOITERING DETECTION
  if (speed < LOITERING_SPEED_THRESHOLD) {
    // Vessel is slow/stationary
    if (previousVessel?.firstStationaryTime) {
      // Continuing being stationary
      result.firstStationaryTime = previousVessel.firstStationaryTime
      const startTime = new Date(result.firstStationaryTime).getTime()
      
      if (timestamp - startTime > LOITERING_TIME_THRESHOLD_MS) {
        if (!previousVessel.isLoitering) {
            logger.info({ mmsi: result.mmsi, name: result.name }, 'Vessel flagged for loitering')
        }
        result.isLoitering = true
      } else {
        result.isLoitering = false
      }
    } else {
      // Just started being stationary
      result.firstStationaryTime = result.lastPosition.timestamp
      result.isLoitering = false
    }
  } else {
    // Vessel is moving fast enough
    if (previousVessel?.isLoitering) {
         logger.info({ mmsi: result.mmsi, name: result.name }, 'Vessel stopped loitering')
    }
    result.isLoitering = false
    result.firstStationaryTime = undefined
  }

  return result
}
