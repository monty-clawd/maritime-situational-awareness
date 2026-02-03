# PRD: Weather & Environment Overlay (F-7)

**Status:** DRAFT
**Feature:** F-7 from PFCU
**Target:** Maritime Situational Awareness MVP

## 1. Overview
Integrating real-time weather and environmental data (wind, waves, visibility) into the tactical display to provide context for vessel movements and safety alerts.

## 2. User Stories
- **As an Operator**, I want to see wind speed and direction overlaid on the chart so I can assess navigation risks.
- **As an Operator**, I want to know the significant wave height in my sector.

## 3. Functional Requirements
1.  **Data Ingestion:**
    - Fetch live weather data from open APIs (e.g., Open-Meteo or similar free tier).
    - Metrics: Wind Speed (knots), Wind Direction, Wave Height (m).
2.  **Visualization:**
    - **Wind Barbs:** Display wind direction and speed at grid points on the map.
    - **Environment Panel:** Show local weather details for the currently selected vessel (cursor or selection).
3.  **Layer Control:**
    - Toggle "Weather" layer visibility.

## 4. Technical Specifications
- **Backend:**
    - Create `weather.ts` service.
    - Fetch data every 15-60 mins (caching is critical).
    - Expose `GET /api/environment` endpoint returning a grid or point data.
- **Frontend:**
    - Add `WeatherLayer` to MapLibre (using custom markers or a canvas overlay for wind barbs).
    - Update `VesselPanel` to show "Conditions at location".

## 5. Acceptance Criteria
- [ ] Map displays wind indicators (speed/direction) when Weather layer is active.
- [ ] Selecting a vessel shows the weather conditions at its coordinate.
