# PRD 02: Interactive Vessel Management & Data Enrichment

**Status:** Draft
**Target Release:** v0.2.0
**Previous PRD:** [01_PRD_MVP_Core_Tracking_and_Integrity.md](./MVP_FEATURES.md)

## 1. Executive Summary
This phase transitions the system from a passive "dot display" to an interactive tool for vessel management. The goal is to replace frontend mocks with real data integration, enabling operators to identify vessels with enriched metadata (names, types) and manage a focused "Active Targets" watchlist with bi-directional map navigation.

## 2. Problem Statement
- **Unknown Identities:** Selecting vessels currently shows "Unknown" because static AIS data (Ship Name, Type, Dimensions) isn't fully processed or linked.
- **Mocked Workflows:** The "Active Targets" list is static/mocked and does not reflect the actual vessels on the map.
- **Disconnected UX:** Users cannot navigate from the list to the map, making it hard to locate specific vessels of interest.
- **No Persistence:** There is no way to "tag" or "follow" a specific vessel across sessions.

## 3. Goals & Success Metrics
| Goal | Metric |
|------|--------|
| **Enriched Identity** | >90% of displayed vessels show a valid Ship Name/Type within 10 minutes of receiving data. |
| **Interactive List** | "Active Targets" list populates dynamically based on user selection. |
| **Seamless Navigation** | Clicking a list item centers and zooms the map to that vessel < 200ms. |

## 4. Functional Requirements

### FR-1: Enriched Vessel Metadata
The system must process and store AIS Static Data (Messages 5 & 24) to provide human-readable vessel details.

- **F-1.1:** Backend must cache vessel static data (Name, Call Sign, IMO, Ship Type, Dimensions) linked by MMSI.
- **F-1.2:** Frontend Vessel Panel must fetch and display this enriched data instead of "Unknown" placeholders.
- **F-1.3:** Handle "pending" state gracefully (e.g., show "Identifying..." or MMSI if Name is not yet received).

### FR-2: Active Target Watchlist
Operators must be able to curate a list of vessels they are actively monitoring.

- **F-2.1:** Add a "Track / Add to Targets" action button in the Vessel Information Panel.
- **F-2.2:** Add a "Remove from Targets" action for vessels already in the list.
- **F-2.3:** The "Active Targets" sidebar must display **only** the vessels currently in the watchlist, updating in real-time.
- **F-2.4:** Persist the watchlist to the database (PostgreSQL) so it survives page reloads.

### FR-3: Bi-Directional Navigation
The Map and the Target List must act as a single synchronized interface.

- **F-3.1:** **List → Map:** Clicking a vessel in the Active Targets list must:
    - Pan the map to center on the vessel.
    - Open the Vessel Information Panel for that vessel.
- **F-3.2:** **Map → List:** Clicking a vessel marker on the map must:
    - Highlight the corresponding entry in the Active Targets list (if present).
    - Open the Vessel Information Panel.
- **F-3.3:** Visual feedback (highlight/border) on selected targets in both views.

## 5. Technical Requirements

### 5.1 Backend (Node.js/Express)
- **New API Endpoints:**
    - `POST /api/watchlist` (Body: `{ mmsi: string, notes?: string }`) - Add to watchlist.
    - `DELETE /api/watchlist/:mmsi` - Remove from watchlist.
    - `GET /api/watchlist` - Get current user's watched vessels (enriched).
- **AIS Processing:**
    - Update `aisstream` service to listen for `ShipStaticData` messages.
    - Upsert static data into a `vessels` table/store.

### 5.2 Database (PostgreSQL)
- **Schema Updates:**
    - Ensure `vessels` table has columns for `name`, `type`, `call_sign`, `imo`, `length`, `width`.
    - Create `watchlist` table:
        ```sql
        CREATE TABLE watchlist (
            user_id UUID, -- For now, can be a default/single user ID
            mmsi VARCHAR(9),
            added_at TIMESTAMP DEFAULT NOW(),
            PRIMARY KEY (user_id, mmsi)
        );
        ```

### 5.3 Frontend (React)
- **State Management:**
    - Lift `selectedVessel` state to a context/store accessible by both `MapDisplay` and `ActiveTargetsList`.
- **Components:**
    - Refactor `ActiveTargetsList` to consume the real API instead of `mockTargets`.
    - Update `VesselPanel` to include the "Track/Untrack" button logic.

## 6. Assumptions & Out of Scope
- **Assumption:** AIS Stream provider sends Message 5/24 frequently enough to populate names during a testing session.
- **Out of Scope:** Multi-user accounts (use a single default user ID for MVP).
- **Out of Scope:** Historical track visualization (that is PRD 03).
- **Out of Scope:** Complex filtering or sorting of the target list.

## 7. User Stories

1. **"Who is that?"**
   > As an operator, I click a dot on the map and see "Hapag-Lloyd Express" (Cargo) instead of "Unknown", so I can identify the traffic.

2. **"Keep an eye on this one."**
   > As an operator, I spot a vessel behaving oddly. I click "Track Target", and it appears in my sidebar list so I don't lose track of it while panning around.

3. **"Where did he go?"**
   > As an operator, I see "Stena Germanica" in my target list. I click it, and the map instantly zooms to its current location.
