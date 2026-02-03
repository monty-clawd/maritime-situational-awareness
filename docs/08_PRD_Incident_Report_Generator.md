# PRD: Incident Report Generator (F-9)

**Status:** DRAFT
**Feature:** F-9 from PFCU
**Target:** Maritime Situational Awareness MVP

## 1. Overview
A tool to generate structured incident reports using AI. Operators can select a vessel or alerts and request a report, which the system drafts using the Gemini API based on available context (tracks, weather, alerts).

## 2. User Stories
- **As an Incident Manager**, I want to quickly generate a draft report for a "Suspicious Behavior" alert so I don't have to type everything manually.
- **As an Operator**, I want the report to automatically include the vessel's details, location, and weather conditions at the time of the event.

## 3. Functional Requirements
1.  **Report Trigger:**
    - Button in `VesselPanel` or `TimelinePanel`: "Generate Report".
    - Optional: Select specific alerts to include.
2.  **AI Drafting:**
    - Backend endpoint `POST /api/reports/generate` receiving context (mmsi, timeframe).
    - Construct prompt for Gemini: "Write a maritime incident report for vessel [Name] (MMSI: [ID]). Context: [Alerts], [Positions], [Weather]. Format: Standard VTS Report."
    - Return generated markdown/text.
3.  **Review & Edit:**
    - Display the draft in a modal/panel.
    - Allow the operator to edit the text.
4.  **Export:**
    - "Download PDF" (or simple Print to PDF via browser for MVP) or "Save to Log".

## 4. Technical Specifications
- **Backend:**
    - `POST /api/reports/generate`:
        - Fetch vessel details, recent alerts, and weather.
        - Call `GeminiService.generateReport(context)`.
        - Return `{ draft: string }`.
- **Frontend:**
    - `ReportModal.tsx`: Text area for the draft, "Generate" button (loading state), "Download" button.
    - Integration with `VesselPanel` actions.

## 5. Acceptance Criteria
- [ ] "Generate Report" button is available for a selected vessel.
- [ ] Clicking it calls the backend, which queries Gemini.
- [ ] A sensible incident report is displayed (including Vessel Name, Time, Location, Summary).
- [ ] The user can edit the text.
