# PRD: AIS/GNSS Integrity Monitor (F-5)

**Status:** DRAFT
**Feature:** F-5 from PFCU
**Target:** Maritime Situational Awareness MVP

## 1. Overview
A specialized monitoring module to detect, visualize, and alert on potential AIS spoofing, jamming, or GNSS signal anomalies. This goes beyond simple position discrepancy (F-6) by analyzing signal characteristics and maintaining a history of interference events to identify "denial of service" zones.

## 2. User Stories
- **As a Security Officer**, I want to see a heat map of where signal anomalies are occurring so I can identify persistent jamming sources.
- **As a VTS Operator**, I want to be alerted immediately if a vessel in my sector shows signs of GPS spoofing (e.g., impossible jumps in position).
- **As an Analyst**, I want to review the signal integrity history of a specific vessel.

## 3. Functional Requirements
1.  **Integrity Overlay:** A map layer showing "Interference Zones" (red/orange polygons) where anomalies have been recently detected.
2.  **Vessel Integrity Score:** A calculated score (0-100%) displayed in the Vessel Info Panel, derived from:
    - Position consistency (AIS vs Radar - already in F-6).
    - Rate of Turn (ROT) vs Course Over Ground (COG) plausibility.
    - Signal Strength (if available) or Message Frequency anomalies.
3.  **Interference Alerting:** Specific alert type "SIGNAL_INTEGRITY" when a vessel enters a known interference zone or drops below a trust threshold.
4.  **History:** Time-series chart of integrity scores for selected vessels.

## 4. Technical Specifications
- **Frontend:**
    - New Map Layer: `IntegrityOverlay` (GeoJSON polygons).
    - Update `VesselPanel` to show "Trust Score" badge.
    - New Chart component: `IntegrityHistoryChart` (using Recharts or similar).
- **Backend:**
    - New Service: `integrity-monitor.ts`.
    - Logic:
        - *Spoofing Check:* Calc "impossible speed" between consecutive points (>50kn without plausible acceleration).
        - *Jamming Check:* Detect sudden loss of signal for multiple vessels in same area (Gap detection).
    - Storage: `InterferenceEvents` table in DB (or in-memory for MVP).

## 5. Acceptance Criteria
- [ ] Map displays a visual polygon over areas with >3 reported anomalies in last hour.
- [ ] Vessel Panel shows a "Trust Score" (e.g., "98% Reliable" or "40% SUSPECT").
- [ ] System generates an alert if a vessel "teleports" > 1km in < 1 minute.
- [ ] User can toggle the "Integrity Layer" on/off.
