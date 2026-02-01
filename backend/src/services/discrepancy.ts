export type Position = {
  mmsi: string;
  latitude: number;
  longitude: number;
};

export type DiscrepancySeverity = "HIGH" | "MEDIUM";

export type DiscrepancyAlert = {
  mmsi: string;
  severity: DiscrepancySeverity;
  deltaMeters: number;
  aisPosition: Position;
  radarPosition: Position;
  timestamp: string;
};

const EARTH_RADIUS_METERS = 6371000;

const toRadians = (value: number): number => (value * Math.PI) / 180;

const haversineDistanceMeters = (a: Position, b: Position): number => {
  const lat1 = toRadians(a.latitude);
  const lon1 = toRadians(a.longitude);
  const lat2 = toRadians(b.latitude);
  const lon2 = toRadians(b.longitude);

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

export const detectDiscrepancy = (
  aisPosition: Position,
  radarPosition: Position
): DiscrepancyAlert | null => {
  if (aisPosition.mmsi !== radarPosition.mmsi) {
    return null;
  }

  const deltaMeters = haversineDistanceMeters(aisPosition, radarPosition);

  if (deltaMeters <= 500) {
    return null;
  }

  const severity: DiscrepancySeverity =
    deltaMeters > 1000 ? "HIGH" : "MEDIUM";

  return {
    mmsi: aisPosition.mmsi,
    severity,
    deltaMeters,
    aisPosition,
    radarPosition,
    timestamp: new Date().toISOString(),
  };
};
