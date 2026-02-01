# HOWTOAI.md — Using AI for Maritime MVP Development

**A guide for developers using AI coding agents (Codex, Claude Code, etc.) on this project.**

## Quick Start

### For Codex
```bash
# Simple task
codex exec "Add a dark mode toggle to the React app"

# Complex feature (use RPI pattern — Research → Plan → Implement)
codex exec --full-auto "Implement Kalman filter fusion for AIS and radar tracks. Research FilterPy usage first."

# In background with monitoring
codex exec "Build the PostgreSQL schema with TimescaleDB hypertables for vessel positions" --full-auto &
# Monitor with: `codex log` or `codex status`
```

### For Claude Code / Cursor
```
@codebase Read AGENTS.md to understand this project structure.
Can you implement the vessel info panel component that shows MMSI, IMO, position, and data source indicators?
```

## Context Engineering

For larger features, use the **RPI pattern** (Research → Plan → Implement):

1. **Research Phase:** Agent reads relevant code, docs, external resources
   ```bash
   codex exec "Research how FilterPy implements Kalman filters for multi-sensor fusion. Look at sensor_fusion.py and fusion_engine/kalman_fusion.py."
   ```

2. **Plan Phase:** Agent documents detailed implementation plan
   ```bash
   codex exec "Plan the implementation of position discrepancy detection: 1) read both AIS and radar positions from database, 2) calculate distance between them, 3) if > 500m, create alert. Include function signatures and data structures."
   ```

3. **Implement Phase:** Agent builds with the research and plan as context
   ```bash
   codex exec "Implement position discrepancy detection based on the plan. Use existing database queries. Write unit tests."
   ```

## AI-Ready Patterns in This Codebase

### AGENTS.md
Located at project root. Contains:
- Build/dev commands
- Code style conventions
- Architecture & folder structure
- Key files & patterns
- Important notes for agents

**Always ask the agent to read this first** for complex tasks.

### Hierarchical Context Files
- **Root-level:** `AGENTS.md` (monorepo guidance)
- **Service-level:** `.goosehints` in `frontend/`, `backend/`, `fusion-engine/` (coming soon)
- **Component-level:** Inline comments for complex logic

### Type Safety
- All TypeScript files use strict mode
- React components have full type annotations
- Python code includes type hints
- Agent should NOT use `any` types without justification

## Common Tasks & Prompts

### Frontend Feature
```
Read AGENTS.md and the PRD. Implement a layer toggle component that allows users to show/hide:
- AIS tracks
- Radar tracks  
- Fused positions
- Alerts

Use Tailwind CSS for styling, match the dark mode design.
```

### Backend API Endpoint
```
Read AGENTS.md and backend/src/ structure. Create a new endpoint GET /api/vessels/:mmsi/history that returns the last 24h of position history for a vessel, grouped by hour.
Use TimescaleDB time_bucket for efficient grouping.
```

### Database Schema
```
Read AGENTS.md and database/schema.sql. Add a new table for 'vessel_watchlist' that stores vessels a user wants to monitor closely. Fields: user_id, vessel_mmsi, created_at, notes. Create a migration file.
```

### Python Service
```
Read AGENTS.md and fusion_engine/requirements.txt. Implement an anomaly detector that flags vessels when:
1. AIS position differs from radar by > 500m
2. AIS signal timing is off (gaps > 30s)
3. Speed changes by > 5 knots in 10 seconds
Return structured alerts with confidence scores.
```

## Testing

### Unit Tests (Node.js)
```bash
npm test  # Runs Jest in watch mode
```

Ask agent to:
```
Write unit tests for the kalman_fusion.py module. Mock AIS and radar inputs, verify fusion output is within expected range, test edge cases (missing sensor, invalid data).
```

### Integration Tests
```bash
docker-compose up  # Bring up full stack locally
npm run test:integration
```

### Manual Testing
- Browser: `localhost:5173` (frontend)
- Backend API: `localhost:3000`
- WebSocket: Test via browser DevTools or Postman

## Debugging Tips

### When AI-Generated Code Fails
1. Check the error message — is it clear?
2. Ask the agent to add more logging
3. Use RPI pattern if the task is complex
4. Break the task into smaller steps

### Common Issues
- **Import errors:** Agent might use wrong paths. Check `tsconfig.json` baseUrl
- **Type errors:** Ask agent to check type definitions in `frontend/src/types/`
- **Git merge conflicts:** Agent might touch files that changed. Ask to rebase

## Workflow for Complex Features

**Example: Implementing the integrity alert system**

1. **Scope conversation:**
   ```
   We need to detect AIS/GNSS spoofing by comparing AIS positions with radar tracks. 
   Read the PRD (Feature F-5). What are the technical requirements?
   ```

2. **Research phase:**
   ```
   Research Kalman filter theory for multi-sensor fusion. Check FilterPy docs and examples. 
   Look at fusion_engine/ structure. Document findings.
   ```

3. **Design phase:**
   ```
   Design the data pipeline: AISStream → backend → Python fusion engine → alert generation.
   Include database schema changes, API contracts, WebSocket message formats.
   ```

4. **Implementation phase:**
   ```
   Implement the fusion engine, database schema, backend endpoints, and React alert feed component.
   Include error handling, logging, unit tests.
   ```

5. **Integration phase:**
   ```
   Verify all components work together. Test with real AISStream data. Ensure WebSocket updates reach frontend in real-time.
   ```

## Approved Tools & Models

- **Codex:** Primary choice for scaffolding, full projects
- **Claude Code:** Good for specific files, refactoring
- **Cursor:** Alternative, works well with Tailwind
- **Default model:** gpt-5.2-codex (as of Jan 2026)

## Rules

1. **Always read AGENTS.md first** before complex work
2. **Use `--full-auto` flag** only for well-scoped tasks
3. **Don't skip tests** — AI should write them too
4. **Commit frequently** with clear messages
5. **Don't over-engineer** — keep code simple
6. **Ask before major refactors** of shared code

## Resources

- **PRD:** `/home/clawd/documents/prd-prototype/01_PRD_MVP_Core_Tracking_and_Integrity.md`
- **Architecture:** See AGENTS.md architecture section
- **Database:** `database/schema.sql` + migrations/
- **API Spec:** Will be documented in `backend/README.md`
- **Type Definitions:** `frontend/src/types/` + `backend/src/types/`

---

**Questions?** Check AGENTS.md or review existing code patterns before asking.
