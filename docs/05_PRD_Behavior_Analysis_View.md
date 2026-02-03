# PRD: Behavior Analysis View (F-6)

**Status:** DRAFT
**Feature:** F-6 from PFCU
**Target:** Maritime Situational Awareness MVP

## 1. Overview
A specialized analytical view that overlays historical traffic patterns (normal behavior) onto the real-time map and highlights vessels that deviate from these patterns. It integrates LLM-based analysis (Gemini) to provide natural language explanations for *why* a specific behavior is considered anomalous, aiding in rapid decision-making.

## 2. User Stories
- **As a VTS Operator**, I want to see a "heatmap" of normal shipping lanes so I can visually distinguish between routine traffic and unusual outliers.
- **As a Security Analyst**, I want the system to automatically flag vessels that are moving against the flow of traffic or loitering in non-anchorage areas.
- **As a User**, I want to click a "Analyze Behavior" button on a suspicious vessel to get an AI-generated explanation of why its current movement is flagged.

## 3. Functional Requirements
1.  **Traffic Pattern Heatmap:** A static or periodic map layer visualization showing high-density traffic areas (based on historical data or predefined "lanes").
2.  **Behavioral Deviation Detection:**
    - **Route Deviation:** Vessel outside of normal lanes/areas.
    - **Speed/Course Anomaly:** Vessel moving significantly faster/slower than the lane average, or moving in opposing direction.
    - **Loitering:** Vessel stationary in non-anchorage zones for > X minutes.
3.  **AI Explanation:** Integration with Google Gemini to generate a short textual assessment (e.g., "Vessel is drifting outside the shipping lane near a sensitive area; speed is consistent with engine failure or loitering").
4.  **Sensitivity Controls:** (Optional for MVP) Simple toggle or slider to adjust strictness of anomaly flags.

## 4. Technical Specifications
- **Frontend:**
    - New Map Layer: `TrafficHeatmapLayer` (using `heatmap` style in MapLibre or pre-generated tile overlay).
    - Update `VesselPanel` with an "Analyze" button or a "Behavior" tab.
    - Visualization for "Deviation Vector" (e.g., arrow showing expected course vs actual).
- **Backend:**
    - Service: `behavior-service.ts`.
    - Logic (MVP Heuristics):
        - Define a few "Bounding Boxes" for Shipping Lanes with expected properties (min/max speed, bearing range).
        - Check vessels against these rules.
    - LLM Integration:
        - Endpoint: `/api/analyze-vessel/{id}`
        - Prompt engineering: Send vessel state + local context (nearest POI, weather) to Gemini -> Get explanation.

## 5. Acceptance Criteria
- [ ] Map displays a heatmap overlay representing "normal traffic" density (can be mock data for MVP).
- [ ] Vessels moving against the defined lane direction are visually highlighted (e.g., orange border/icon).
- [ ] Clicking "Analyze" on a vessel triggers a call to Gemini and displays the returned text explanation in the UI.
- [ ] System flags vessels stationary in "No Loitering" zones (mock zone).
