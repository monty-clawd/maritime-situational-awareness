# PRD: AIS/GNSS Integrity Monitor (F-5)

**Status:** DRAFT
**Feature:** F-5 from PFCU
**Target:** Maritime Situational Awareness MVP

## 1. Overview
A security-focused module to detect and visualize potential GNSS spoofing, jamming, or AIS data manipulation. It highlights areas or vessels where position data is suspect.

## 2. User Stories
- **As a Security Analyst**, I want to see a visual warning if a vessel's reported position jumps unrealistically (impossible speed).
- **As an Operator**, I want to know if multiple vessels in an area are losing signal simultaneously (Jamming indicator).
- **As an Operator**, I want to see a confidence score for each track.

## 3. Functional Requirements
1.  **Anomaly Detection Engine:**
    - **Speed Check:** Flag vessels moving > 60 knots (unless type=HSC).
    - **Teleport Check:** Flag vessels jumping > 10nm in < 1 minute.
    - **Signal Loss:** Cluster simultaneous signal loss events in a geographic radius (Jamming).
2.  **Visualization:**
    - Render "Interference Zones" on the map (red semi-transparent circles).
    - Add "Integrity" badge to Vessel Panel (High/Medium/Low).
3.  **Alerting:**
    - Generate `INTEGRITY_ALERT` when confidence drops below threshold.

## 4. Technical Specifications
- **Backend:**
    - Extend `discrepancy.ts` service to implement the Speed/Teleport logic.
    - Create `integrity.ts` service for clustering signal loss.
- **Frontend:**
    - Add `IntegrityLayer` to MapLibre (GeoJSON polygon).
    - Update `VesselPanel` to show detailed integrity metrics.

## 5. Acceptance Criteria
- [ ] Vessels with > 100kn reported speed are flagged as "Spoofing Suspected".
- [ ] A map layer shows "Low Confidence Areas" based on aggregate signal quality.
- [ ] Integrity alerts appear in the Alert Feed.
