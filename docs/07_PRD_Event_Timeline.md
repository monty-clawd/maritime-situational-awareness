# PRD: Event Timeline & Investigation (F-8)

**Status:** DRAFT
**Feature:** F-8 from PFCU
**Target:** Maritime Situational Awareness MVP

## 1. Overview
A dedicated view to reconstruct the timeline of an incident. It allows operators to "playback" the sequence of events (vessel movements + alerts) for a specific vessel to understand what happened.

## 2. User Stories
- **As an Incident Investigator**, I want to see a log of all position reports for a suspicious vessel over the last 24 hours.
- **As an Operator**, I want to click an alert and see the track history associated with it.

## 3. Functional Requirements
1.  **Timeline View:**
    - A list or graph showing position updates and alerts chronologically.
2.  **Playback Visualization:**
    - When "Replay" is clicked for a vessel, show its historical track on the map (already partially supported by F-2, but need to formalize the historical fetch).
3.  **Data Persistence:**
    - Ensure `positions` table in Postgres is actually being populated (TimeScaleDB hypertable).
    - Expose `GET /api/vessels/:mmsi/history` endpoint (with optional time range).

## 4. Technical Specifications
- **Backend:**
    - Create `history.ts` route.
    - Query the `positions` table for the last 24h.
- **Frontend:**
    - Create `TimelinePanel.tsx` component (replaces or augments `TrackHistory.tsx`).
    - Fetch history when a vessel is selected and "View Timeline" is clicked.
    - Visualize the path on the map (GeoJSON LineString).

## 5. Acceptance Criteria
- [ ] Selecting a vessel allows fetching its 24h history.
- [ ] The history path is drawn on the map.
- [ ] A list of past alerts for that vessel is shown.
