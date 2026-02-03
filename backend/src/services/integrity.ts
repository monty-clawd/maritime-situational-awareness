import { Position } from '../types/maritime.js';

type SignalLossEvent = {
    id: string;
    latitude: number;
    longitude: number;
    timestamp: number; // Unix epoch
};

export type InterferenceZone = {
    latitude: number;
    longitude: number;
    radiusMeters: number;
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
    eventCount: number;
};

const signalLossEvents: SignalLossEvent[] = [];
const EVENT_TTL_MS = 10 * 60 * 1000; // Keep events for 10 minutes
const CLUSTER_RADIUS_METERS = 5000; // 5km radius for clustering
const JAMMING_THRESHOLD = 3; // Minimum 3 vessels losing signal to declare jamming

const haversineDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
};

export const reportSignalLoss = (latitude: number, longitude: number) => {
    // Cleanup old events first
    const now = Date.now();
    let i = signalLossEvents.length;
    while (i--) {
        if (now - signalLossEvents[i].timestamp > EVENT_TTL_MS) {
            signalLossEvents.splice(i, 1);
        }
    }

    signalLossEvents.push({
        id: Math.random().toString(36).substring(7),
        latitude,
        longitude,
        timestamp: now
    });
};

export const getInterferenceZones = (): InterferenceZone[] => {
    const now = Date.now();
    // 1. Cleanup old
    const activeEvents = signalLossEvents.filter(e => now - e.timestamp <= EVENT_TTL_MS);
    
    // 2. Simple clustering
    // For each point, count neighbors. If > threshold, form a cluster.
    // Very naive implementation: merge overlapping clusters.
    
    const clusters: { latSum: number; lonSum: number; count: number; points: SignalLossEvent[] }[] = [];
    const processed = new Set<string>();

    for (const event of activeEvents) {
        if (processed.has(event.id)) continue;

        // Start a new cluster
        const currentCluster = {
            latSum: event.latitude,
            lonSum: event.longitude,
            count: 1,
            points: [event]
        };
        processed.add(event.id);

        // Find neighbors
        for (const other of activeEvents) {
            if (!processed.has(other.id)) {
                const dist = haversineDistance(event.latitude, event.longitude, other.latitude, other.longitude);
                if (dist <= CLUSTER_RADIUS_METERS) {
                    currentCluster.latSum += other.latitude;
                    currentCluster.lonSum += other.longitude;
                    currentCluster.count++;
                    currentCluster.points.push(other);
                    processed.add(other.id);
                }
            }
        }

        if (currentCluster.count >= JAMMING_THRESHOLD) {
            clusters.push(currentCluster);
        }
    }

    // Convert to zones
    return clusters.map(c => {
        return {
            latitude: c.latSum / c.count,
            longitude: c.lonSum / c.count,
            radiusMeters: CLUSTER_RADIUS_METERS,
            severity: c.count > 10 ? 'HIGH' : 'MEDIUM',
            eventCount: c.count
        };
    });
};
