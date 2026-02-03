# PRD: Data Fusion Status Dashboard (F-3)

**Status:** DRAFT
**Feature:** F-3 from PFCU
**Target:** Maritime Situational Awareness MVP

## 1. Overview
A visual dashboard component to display the health and status of data sources (AIS, Radar, etc.) and the fusion engine. It provides transparency to the operator about *where* the data is coming from and if it is reliable.

## 2. User Stories
- **As an Operator**, I want to see if the AIS stream is online or offline, so I know if I'm missing targets.
- **As an Operator**, I want to see if the database connection is healthy.
- **As an Operator**, I want to see the "Message Rate" (msg/sec) to judge system load.

## 3. Functional Requirements
1.  **Status Indicators:** Display visual badges (Green/Red/Amber) for:
    - AIS Stream (Live API)
    - Database (PostgreSQL)
    - Redis (Cache)
2.  **Metrics:** Display real-time counters:
    - AIS Messages per minute.
    - Total Tracked Vessels.
3.  **UI Component:** Add a dedicated "System Status" widget to the Dashboard sidebar or header overlay.
4.  **API:** Extend `GET /api/status` to return these granular metrics (already partially done, need to formalize and visualize).

## 4. Technical Specifications
- **Frontend:** New React component `SystemStatusWidget.tsx`.
- **Backend:** Enhance `status.ts` router to provide `messagesPerMinute` (using a sliding window in memory or Redis).
- **Style:** Consistent with "Maritime Dark" theme (Slate/Emerald/Cyan).

## 5. Acceptance Criteria
- [ ] Dashboard shows "AIS: Online" in Green when connected.
- [ ] Dashboard shows "AIS: Offline" in Red when disconnected.
- [ ] A "Message Rate" counter updates in real-time (e.g., "120 msg/min").
- [ ] Database connectivity status is shown.
