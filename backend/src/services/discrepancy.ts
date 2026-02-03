import { Position as MaritimePosition, Vessel } from '../types/maritime.js';

// Re-export or use local types if needed, but preferably use shared types
// For backward compatibility with existing code if it uses these local types:
export type Position = {
  mmsi: string;
  latitude: number;
  longitude: number;
  speed?: number; // Added speed
  timestamp?: string; // Added timestamp
};

export type DiscrepancySeverity = "HIGH" | "MEDIUM" | "LOW"; // Added LOW

export type DiscrepancyAlert = {
  mmsi: string;
  severity: DiscrepancySeverity;
  type: "POSITION_MISMATCH" | "SPEED_ANOMALY" | "TELEPORT_ANOMALY";
  details: string;
  timestamp: string;
};

const EARTH_RADIUS_METERS = 6371000;
const KNOTS_TO_MS = 0.514444;
const METERS_TO_NM = 0.000539957;

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineDistanceMeters = (lat1Val: number, lon1Val: number, lat2Val: number, lon2Val: number): number => {
  const lat1 = toRadians(lat1Val);
  const lon1 = toRadians(lon1Val);
  const lat2 = toRadians(lat2Val);
  const lon2 = toRadians(lon2Val);

  const deltaLat = lat2 - lat1;
  const deltaLon = lon2 - lon1;

  const sinLat = Math.sin(deltaLat / 2);
  const sinLon = Math.sin(deltaLon / 2);

  const h =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;

  const centralAngle = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));

  return EARTH_RADIUS_METERS * centralAngle;
};

// Original Radar vs AIS check
export const detectDiscrepancy = (
  aisPosition: Position,
  radarPosition: Position
): DiscrepancyAlert | null => {
  if (aisPosition.mmsi !== radarPosition.mmsi) {
    return null;
  }

  const deltaMeters = haversineDistanceMeters(
    aisPosition.latitude, aisPosition.longitude,
    radarPosition.latitude, radarPosition.longitude
  );

  if (deltaMeters <= 500) {
    return null;
  }

  const severity: DiscrepancySeverity =
    deltaMeters > 1000 ? "HIGH" : "MEDIUM";

  return {
    mmsi: aisPosition.mmsi,
    severity,
    type: "POSITION_MISMATCH",
    details: `AIS vs Radar offset: ${Math.round(deltaMeters)}m`,
    timestamp: new Date().toISOString(),
  };
};

// NEW: Speed and Teleport Checks
export const checkIntegrity = (
  newPosition: Position,
  oldPosition: Position | null | undefined,
  vesselType: string = 'Unknown'
): DiscrepancyAlert | null => {
  // 1. Speed Check (Instantaneous report)
  // Flag if reported speed > 60 knots and NOT High Speed Craft (HSC)
  // AIS Ship Type 40-49 is HSC.
  // We'll assume vesselType comes in as string or code.
  // For now, simpler logic: if speed > 60 and type != 'High Speed Craft'
  
  // Note: Position type in local file has speed as optional, but MaritimePosition has it.
  if (newPosition.speed !== undefined) {
      const isHSC = vesselType.toLowerCase().includes('high speed') || vesselType.includes('HSC'); // Basic check
      if (newPosition.speed > 60 && !isHSC) {
          return {
              mmsi: newPosition.mmsi,
              severity: "MEDIUM",
              type: "SPEED_ANOMALY",
              details: `Reported speed ${newPosition.speed} knots exceeds threshold`,
              timestamp: new Date().toISOString()
          };
      }
  }

  // 2. Teleport Check (History based)
  if (oldPosition && oldPosition.timestamp && newPosition.timestamp) {
      const timeDiffMs = new Date(newPosition.timestamp).getTime() - new Date(oldPosition.timestamp).getTime();
      const timeDiffMinutes = timeDiffMs / 1000 / 60;

      // Only check if time diff is positive and small (e.g., consecutive updates)
      if (timeDiffMinutes > 0 && timeDiffMinutes < 1) { // < 1 minute
          const distMeters = haversineDistanceMeters(
              oldPosition.latitude, oldPosition.longitude,
              newPosition.latitude, newPosition.longitude
          );
          const distNm = distMeters * METERS_TO_NM;

          if (distNm > 10) { // Jumped > 10nm in < 1 minute
             return {
                 mmsi: newPosition.mmsi,
                 severity: "HIGH",
                 type: "TELEPORT_ANOMALY",
                 details: `Jumped ${distNm.toFixed(1)}nm in ${timeDiffMinutes.toFixed(2)}min`,
                 timestamp: new Date().toISOString()
             };
          }
      }
  }

  return null;
};
