import { describe, it, expect } from 'vitest'
import { behaviorService } from './behavior.js'
import type { Vessel } from '../types/maritime.js'

describe('BehaviorService', () => {
  it('should detect speed anomalies in shipping lanes', () => {
    // Mock Vessel: Speeding in Lane 1
    const speedingVessel: Vessel = {
      mmsi: 123456789,
      lastPosition: {
        // In the mock lane bounds (-124.5 to -123.0, 48.2 to 48.4)
        latitude: 48.3,
        longitude: -124.0,
        speed: 30, // Limit is 25
        heading: 90, // Correct direction
        source: 'AIS',
        timestamp: new Date().toISOString()
      }
    }

    const deviations = behaviorService.detectDeviations(speedingVessel)
    expect(deviations).toHaveLength(1)
    expect(deviations[0].type).toBe('SPEED_ANOMALY')
  })

  it('should detect wrong way drivers', () => {
    const wrongWayVessel: Vessel = {
      mmsi: 987654321,
      lastPosition: {
        latitude: 48.3,
        longitude: -124.0,
        speed: 10,
        heading: 270, // West (Opposite to 90 East)
        source: 'AIS',
        timestamp: new Date().toISOString()
      }
    }

    const deviations = behaviorService.detectDeviations(wrongWayVessel)
    expect(deviations).toHaveLength(1)
    expect(deviations[0].type).toBe('COURSE_MISMATCH')
  })

  it('should detect loitering in sensitive zones', () => {
    const loiteringVessel: Vessel = {
      mmsi: 111222333,
      lastPosition: {
        // In sensitive zone (-123.2 to -122.8, 48.4 to 48.7)
        latitude: 48.5,
        longitude: -123.0,
        speed: 0.1,
        heading: 0,
        source: 'AIS',
        timestamp: new Date().toISOString()
      }
    }

    const deviations = behaviorService.detectDeviations(loiteringVessel)
    expect(deviations).toHaveLength(1)
    expect(deviations[0].type).toBe('LOITERING')
  })

  it('should return no deviations for normal traffic', () => {
    const normalVessel: Vessel = {
      mmsi: 555555555,
      lastPosition: {
        latitude: 48.3,
        longitude: -124.0,
        speed: 15,
        heading: 90,
        source: 'AIS',
        timestamp: new Date().toISOString()
      }
    }

    const deviations = behaviorService.detectDeviations(normalVessel)
    expect(deviations).toHaveLength(0)
  })
})
