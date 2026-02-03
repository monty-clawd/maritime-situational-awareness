# PRD: Sensitive Area Management (F-10)

**Status:** DRAFT
**Feature:** F-10 from PFCU
**Target:** Maritime Situational Awareness MVP

## 1. Overview
Allow operators to define and visualize sensitive geographic zones (e.g., ports, wind farms, pipelines) and receive alerts when vessels enter them.

## 2. User Stories
- **As an Operator**, I want to see the boundaries of the "Nordsee Ost" wind farm on the map.
- **As a Security Officer**, I want to be alerted if a fishing vessel enters a restricted military zone.

## 3. Functional Requirements
1.  **Zone Definition:**
    - Pre-load key sensitive areas (German EEZ wind farms, military zones) via GeoJSON.
    - (Future: Allow user drawing).
2.  **Visualization:**
    - Render zones as semi-transparent polygons on the map.
    - Color-code by type (Restricted = Red, Warning = Yellow).
3.  **Monitoring:**
    - Detect when a vessel's position falls within a defined zone polygon.
    - Flag vessel in the UI ("Inside Restricted Zone").

## 4. Technical Specifications
- **Backend:**
    - Create `zones.ts` service.
    - Store zone definitions (Polygon GeoJSON).
    - Perform point-in-polygon checks (using `turf.js` or simple ray-casting) in the `aisstream` processing loop.
    - Add `zoneId` to `Vessel` type if inside one.
- **Frontend:**
    - Add `ZonesLayer` to MapLibre.
    - Toggle in `LayerControls`.
    - Show zone name in `VesselPanel` if applicable.

## 5. Acceptance Criteria
- [ ] Map displays restricted zones (polygons).
- [ ] Vessels entering a zone trigger a UI indication or alert.
