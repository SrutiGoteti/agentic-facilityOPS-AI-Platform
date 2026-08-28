# Milestone 3 — Occupancy & Security Intelligence

**Project:** Agentic FacilityOps AI Platform
**Milestone:** 3 (Weeks 5–6)
**Scope:** Build the Occupancy Agent, track room-level utilization, detect overcrowding, build the Security Agent, log and analyze security events, and generate recommendations for both.

---

## Overview

This milestone follows the same vertical-slice pattern established in Milestones 1 and 2 (raw/designed data → relational schema → agent logic → API → interactive dashboard), applied to two modules: Occupancy and Security. Both agents are rule-based, following the reasoning-and-recommendation style established in Milestone 1's Energy Agent, rather than the ML-classifier approach used in Milestone 2's Maintenance Agent. Both dashboards were built with the interactive patterns established earlier in the project — search/filter and live add/delete data editing — from the outset.

---

## Phase 1: Data Design — Occupancy

**Objective:** Enable room-level overcrowding detection, which the existing dataset could not support on its own.

- The Milestone 1 energy dataset provides only a single building-wide occupancy headcount per timestamp — no room-level breakdown and no defined room capacities.
- Since no public dataset covers a facility's individual room inventory, room-level data was designed for this milestone: five rooms (Classroom A, Classroom B, Staff Room, Assembly Hall, Library), each assigned a realistic capacity.
- Occupancy readings per room were generated across the full timeline of the existing dataset, following realistic business-hour activity patterns — higher on weekdays during business hours, minimal on nights and weekends.
- This design choice was necessary to give the room utilization heatmap and overcrowding detection real, varied data to work with, since the source dataset alone had no room-level signal to draw from.

---

## Phase 2: Data Design — Security

**Objective:** Enable security event analysis, for which no public dataset exists at the facility level.

- Security event data was designed for five locations (Main Entrance, Server Room, Rear Exit, Parking Lot, Loading Dock) and seven event types, ranging from low-severity (Failed Badge Scan, Door Left Open) to high-severity (Forced Entry, Unauthorized Access, Alarm Triggered).
- Event timestamps are drawn from the existing dataset's real timeline.
- Severity is linked to time of day: after-hours events are weighted toward higher-severity types, while business-hours events are weighted toward lower-severity administrative types — reflecting the realistic assumption that an after-hours incident is generally more serious than a daytime one.

---

## Phase 3: Database Schema Extension

**Objective:** Extend the existing `facilityops.db` with the tables this milestone requires.

- Added to `backend/app/models/db_models.py`:
  - **`Room`** — room_id (PK), facility_id (FK), room_name, room_type, capacity
  - **`RoomOccupancy`** — record_id (PK), room_id (FK), timestamp, headcount
  - **`SecurityEvent`** — event_id (PK), facility_id (FK), timestamp, location, event_type, severity, resolved
- Reran `init_db_script.py` — only the new tables were created; existing data from Milestones 1 and 2 was left untouched.

---

## Phase 4: Data Loading

- `backend/app/load_occupancy_data.py` — creates the 5 rooms and generates occupancy readings across the full dataset timeline for each.
- `backend/app/load_security_data.py` — generates a set of security events across the 5 locations and 7 event types, with severity weighted by time of day.

---

## Phase 5: The Occupancy Agent

Implemented `backend/app/agents/occupancy_agent.py` as an `OccupancyAgent` class.

- **`load_data()`** — pulls all rooms and their occupancy records, computes utilization percentage (headcount ÷ capacity), hour, day of week, and an overcrowding flag per reading.
- **`get_analytics()`** — facility-wide summary: average and peak utilization, total overcrowding events, total rooms, and average utilization by hour.
- **`get_room_heatmap()`** — average and peak utilization per room, plus overcrowding count. Rooms are classified into **Low / Moderate / High / Very High** occupancy bands based on **peak** utilization rather than average — averaging across a full year of nights and weekends would dilute genuine peak-hour crowding into a misleadingly low number, so peak-based classification was used to correctly surface rooms that reach high occupancy even briefly.
- **`get_room_comparison()`** — average utilization per room, chart-ready.
- **`get_overcrowding_events()`** — every individual reading where headcount exceeded capacity, sorted by severity.
- **`get_day_of_week_pattern()`** — average utilization by day of week, facility-wide.
- **`get_recommendations()`** — 3 rules: rooms that repeatedly exceed capacity, chronically underused rooms, and the facility-wide peak hour.
- **`add_record()` / `delete_record()` / `get_recent_records()` / `get_room_list()`** — live CRUD against `room_occupancy`, invalidating the cached DataFrame on every change.

**Sample verified output (facility_id = 1):** average utilization 20.1%, peak utilization 105.5%, 852 overcrowding events, concentrated in Assembly Hall during its business-hours activity window.

---

## Phase 6: The Security Agent

Implemented `backend/app/agents/security_agent.py` as a `SecurityAgent` class.

- **`load_data()`** — pulls all security events for the facility, computes hour, day of week, weekend flag, and an after-hours flag (before 8am, after 6pm, or weekend).
- **`get_analytics()`** — total events, severity breakdown (high/medium/low), after-hours count, unresolved count.
- **`get_events_by_type()`** — event count grouped by type.
- **`get_events_by_location()`** — event count grouped by location.
- **`get_timeline()`** — event count by hour of day.
- **`get_after_hours_events()`** — every after-hours event, most recent first.
- **`get_recommendations()`** — 4 rules:
  1. A location accounting for a disproportionate share (>25%) of after-hours events.
  2. An elevated (>20%) ratio of high-severity events overall.
  3. The count and percentage of unresolved events.
  4. The single most frequently logged event type.
- **`add_event()` / `delete_event()` / `get_recent_events()`** — live CRUD against `security_events`, invalidating the cached DataFrame on every change.

**Sample verified output (facility_id = 1):** 350 total events, 220 after-hours, severity split 144 high / 94 medium / 112 low, 127 unresolved. Server Room accounts for 48.6% of all after-hours events — the largest share of any single location — and 41.1% of all logged events are high-severity.

---

## Phase 7: API Layer

Implemented in `backend/app/api/routes.py`:

**Occupancy:**
- `GET /api/occupancy/analytics`, `/heatmap`, `/room-comparison`, `/overcrowding`, `/day-of-week`, `/recommendations`
- `POST /api/occupancy/records`, `DELETE /records/{record_id}`, `GET /records/recent`, `GET /rooms`

**Security:**
- `GET /api/security/analytics`, `/events-by-type`, `/events-by-location`, `/timeline`, `/after-hours`, `/recommendations`
- `POST /api/security/events`, `DELETE /events/{event_id}`, `GET /events/recent`

All verified via `/docs`.

---

## Phase 8: Occupancy Dashboard

Built using the same panel/grid visual system established in Milestones 1 and 2.

- **Row 1:** semi-circle "Avg Utilization" gauge, plus Facility Overview (total rooms, peak utilization) and Attention Needed (overcrowding event count) stat panels.
- **Add / Remove Real Data panel:** select a room, enter a timestamp and headcount, add a real reading directly to `room_occupancy`. Recent readings are listed with a delete option. Every change triggers a full dashboard refresh.
- **Room Utilization Heatmap:** a colored grid of all 5 rooms, each labeled Low / Moderate / High / Very High occupancy based on peak utilization, with average utilization, peak utilization, and overcrowding count shown per room.
- **Average Utilization by Room** (bar chart) and **Utilization by Day of Week** (bar chart), shown side by side.
- **Overcrowding Events panel — search:** every flagged reading, searchable by room name, showing headcount vs. capacity and percentage over.
- **Occupancy Recommendations panel:** the 3-rule recommendation output.

---

## Phase 9: Security Dashboard

- **Row 1:** Overview (total events, after-hours count), Severity Breakdown (high/medium/low), and Attention Needed (unresolved count) stat panels.
- **Add / Remove Real Data panel:** log a new event with timestamp, location, event type, and severity. Recent events are listed with a delete option. Every change triggers a full dashboard refresh.
- **Events by Type, Events by Hour of Day, and Events by Location** — three charts shown side by side, giving three complementary views of the same event log.
- **After-Hours Events panel — search & filter:** live text search by location plus a severity dropdown filter.
- **Security Recommendations panel:** the 4-rule recommendation output.

---

## Milestone 3 Deliverables — Status

| Deliverable | Status |
|---|---|
| Build Occupancy Agent | ✅ Complete |
| Room-level utilization tracking | ✅ Complete (5 rooms, designed occupancy data grounded in real dataset timing) |
| Overcrowding detection | ✅ Complete — peak-based heatmap classification, searchable events table |
| Build Security Agent | ✅ Complete |
| Security event logging and analysis | ✅ Complete — type, location, and time-based breakdowns |
| Recommendations (both agents) | ✅ Complete — 3 rules (Occupancy), 4 rules (Security) |
| Interactive dashboards | ✅ Complete — search/filter and live add/delete editing on both |

---

## How to Run This Locally

**Backend** (assumes Milestones 1 and 2's tables already exist; otherwise run their init/load scripts first):
```bash
cd backend
python -m venv venv
source venv/bin/activate        # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m app.init_db_script          # safe to rerun — only creates missing tables
python -m app.load_occupancy_data     # creates rooms + occupancy readings
python -m app.load_security_data      # creates security events
uvicorn app.main:app --reload
```

**Frontend (in a separate terminal):**
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173/occupancy` and `http://localhost:5173/security`.

---

## Next Steps (Later Milestones)

The remaining schema table (`cost_reports`) and its corresponding Cost-Optimization Agent are planned for a subsequent milestone, continuing the established pattern: agent class → analytics logic → API route → interactive dashboard page. A natural future extension for this milestone specifically would be adding a prediction model for occupancy trends and an anomaly-detection model for security events, following the same ML approach used in Milestone 2's Maintenance Agent.
