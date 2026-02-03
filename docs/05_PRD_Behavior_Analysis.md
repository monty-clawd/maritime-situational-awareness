# PRD: Behavior Analysis View (F-6)

**Status:** DRAFT
**Feature:** F-6 from PFCU
**Target:** Maritime Situational Awareness MVP

## 1. Overview
A specialized view to visualize vessel movement patterns and highlight anomalous behavior that isn't just signal spoofing (which is F-5), but operational anomalies like loitering, unexpected turns, or route deviations.

## 2. User Stories
- **As a Security Analyst**, I want to see if a vessel is loitering in a sensitive area (e.g., wind farm) so I can investigate potential surveillance.
- **As an Operator**, I want to see a heat map of normal traffic to spot outliers.

## 3. Functional Requirements
1.  **Loitering Detection:**
    - Detect vessels moving < 1.0 kn for > 30 minutes outside of port areas.
2.  **Visualization:**
    - **Loitering Highlight:** Draw a yellow bounding box or "halo" around loitering vessels.
    - **History Trail:** When a vessel is selected in "Analysis Mode", show a longer history trail (24h) compared to the standard 1h trail.
3.  **UI Controls:**
    - Toggle "Analysis Layer" on the map.

## 4. Technical Specifications
- **Backend:**
    - Create `analysis.ts` service.
    - Implement a simple "Loitering Detector" that scans the `positions` database or in-memory cache for stationary targets.
    - Add `isLoitering` flag to the Vessel type.
- **Frontend:**
    - Update `MapDisplay.tsx` to render the "Loitering Halo" (yellow circle/glow) for flagged vessels.
    - Add "Analysis" toggle to `LayerControls`.

## 5. Acceptance Criteria
- [ ] Vessels stationary for prolonged periods in open water are visually highlighted.
- [ ] Operator can toggle this analysis view on/off.
