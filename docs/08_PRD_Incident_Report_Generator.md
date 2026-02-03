# PRD: Incident Report Generator (F-9)

**Status:** DRAFT
**Feature:** F-9 from PFCU
**Target:** Maritime Situational Awareness MVP

## 1. Overview
A tool to automatically generate a structured incident report PDF based on a selected vessel's history and alerts. It uses the Gemini API to summarize the event.

## 2. User Stories
- **As an Incident Manager**, I want to click one button to generate a PDF report for a suspicious vessel event, including map snapshots and a text summary.

## 3. Functional Requirements
1.  **Report Generation:**
    - Input: Vessel MMSI, Time Range.
    - Output: PDF Document.
2.  **AI Summarization:**
    - Use Google Gemini (via `generative-ai` SDK) to generate a natural language summary of the vessel's track and any anomalies/alerts.
3.  **Content:**
    - Vessel Details (Name, Type, Flag).
    - Map Snapshot (static image of the track).
    - Event Log (Table of alerts).
    - AI Summary.

## 4. Technical Specifications
- **Backend:**
    - Create `reports.ts` service.
    - Integration with `pdfkit` or similar for PDF generation.
    - Integration with `GoogleGenerativeAI` for summarization.
    - Endpoint: `POST /api/reports/generate`.
- **Frontend:**
    - Add "Generate Report" button to `TimelinePanel` or `VesselPanel`.
    - Handle PDF download blob.

## 5. Acceptance Criteria
- [ ] Clicking "Generate Report" triggers a backend process.
- [ ] Backend calls Gemini to summarize the track data.
- [ ] A PDF is downloaded containing the summary and vessel details.
