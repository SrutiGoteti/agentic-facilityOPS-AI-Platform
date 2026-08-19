# Milestone 1 — Energy Intelligence & Monitoring

**Project:** Agentic FacilityOps AI Platform
**Milestone:** 1 (Weeks 1–2)
**Scope:** Integrate utility/IoT data, build the Energy Agent, develop energy consumption analytics, create an energy monitoring dashboard, and generate energy efficiency recommendations.

---

## Overview

This milestone delivers an end-to-end vertical slice of the platform for a single module (Energy) across the full stack: raw data → relational database → agent logic (analytics + recommendations) → API → dashboard UI. This structure is the pattern the rest of the team will replicate for the Maintenance, Occupancy, Security, and Cost modules in later milestones. Beyond the original brief, the dashboard was later extended into a fully interactive tool — live filtering, click-to-detail views, and direct add/delete editing of the underlying dataset.

---

## Phase 1: Data Collection

**Objective:** Source a trustworthy dataset for energy consumption, temperature, and occupancy.

- Evaluated multiple Kaggle datasets for building energy/occupancy data (including the ASHRAE Great Energy Predictor III dataset, which was ruled out for this milestone due to its scale — ~20.2 million rows / 2,380 meters across 1,448 buildings — far beyond what's needed or practical for a capstone-scale pipeline).
- Selected the **Energy Consumption, Temperature, Occupancy Dataset** (Kaggle, source: hammadkhan29) — 15-minute interval readings from May 22–Dec 31, 2018 covering:
  - `date` (timestamp)
  - `Power Consumption`
  - `Outdoor Temperature`
  - `Occupancy`
- Confirmed dataset completeness: 21,262 rows, consistent with the ~224-day span at 15-minute resolution.
- Noted the dataset does not disclose the identity or location of the source building — it is treated as a single anonymized facility for pipeline development purposes (`facility_id = 1`, "Facility-01 (source: Kaggle anonymized dataset)").
- Decided the raw dataset file is **shared separately among team members** (not tracked in Git) — each member downloads it independently from Kaggle into their local `data/raw/` folder.
- Saved locally as `data/raw/cleandata.xlsx`.

---

## Phase 2: Database Schema & Setup

**Objective:** Move from a flat file to a proper relational structure that the rest of the platform's modules can build on.

- Designed a 6-table relational schema for the full platform (`facilities`, `energy_usage`, `assets`, `maintenance_records`, `security_events`, `alerts`), of which Milestone 1 implements the two tables required for the Energy Agent:
  - **`facilities`** — dimension table (facility_id, name, type, zone/location, area, floors)
  - **`energy_usage`** — fact table (record_id, facility_id (FK), timestamp, power_consumption, outdoor_temp, occupancy)
- Chose **SQLite** as the database engine for this stage — single-file, zero server setup, appropriate for local development and a capstone-scale project.
- Set up the Python environment:
  ```bash
  python -m venv venv
  source venv/bin/activate      # or venv\Scripts\activate on Windows
  pip install pandas sqlalchemy openpyxl fastapi uvicorn
  pip freeze > requirements.txt
  ```
- Implemented SQLAlchemy models (`backend/app/models/db_models.py`) defining `Facility` and `EnergyUsage` as ORM classes.
- Implemented the database connection layer (`backend/app/core/database.py`) using SQLAlchemy's `create_engine` + `sessionmaker`, with an `init_db()` function to create all tables.
- Ran the initialization script (`backend/app/init_db_script.py`) to generate `backend/facilityops.db` with both tables created.
- Added `*.db` / `*.sqlite3` to `.gitignore` so the local database file itself is never pushed to the repo.

---

## Phase 3: Data Loading & Preprocessing

**Objective:** Load the raw dataset into the database, and address any data quality issues found along the way.

- Wrote a loading script (`backend/app/load_data_script.py`) that:
  - Inserts a single `facilities` row (`facility_id = 1`) representing the anonymized source building.
  - Reads `data/raw/cleandata.xlsx` via pandas and bulk-inserts all rows into `energy_usage`, stamping every row with `facility_id = 1`.
  - Includes idempotency checks (skips re-insertion if data already exists) so the script can be safely re-run.
- Verified the load: row count confirmed at 21,262 (matching the source file), with sane values on inspection (e.g. first row: `2018-05-22 00:00:00`, power ≈ 72, outdoor temp ≈ 15.7, occupancy = 1).
- Ran a full data quality check:
  - **No missing values** across any of the four columns.
  - **41 duplicate rows found** — investigated rather than dropped outright. Found that all 41 shared an identical timestamp (`2018-09-17 05:15:00`) due to an apparent source logging bug, but `Power Consumption`, `Outdoor Temperature`, and `Occupancy` values differed across them — confirming these were genuine, distinct readings, not true duplicates. **Decision: retained all 41 rows**, documented the anomaly rather than deleting real data.
- Generated a processed dataset (`backend/app/preprocess_script.py`) that reads the raw file and derives time-based features needed for analytics:
  - `hour` (0–23)
  - `day_of_week` (Monday–Sunday)
  - `is_weekend` (boolean)
  - Exported to `data/processed/energy_data_processed.csv`, leaving `data/raw/cleandata.xlsx` untouched as the original source of truth.

**Preprocessing summary (for reporting purposes):** Structured the raw CSV into a relational schema, resolved facility identity for an unlabeled source, validated column types on load, investigated and retained 41 rows with an anomalous shared timestamp (documented rather than dropped), and engineered time-based features (hour, day-of-week, weekend flag) for downstream analytics.

---

## Phase 4: Energy Agent — Analytics & Recommendations

**Objective:** Build the core intelligence layer that reads energy data and produces insights.

Implemented `backend/app/agents/energy_agent.py` as an `EnergyAgent` class. Core methods:

- **`load_data()`** — pulls all `energy_usage` rows for a given facility from the database into a pandas DataFrame, and derives `hour`, `day_of_week`, `is_weekend` features.
- **`get_analytics()`** — computes:
  - Average, peak, and lowest power consumption
  - Timestamp of peak consumption
  - Average consumption broken down by hour of day (0–23)
  - Average consumption: weekday vs. weekend
- **`get_recommendations()`** — rule-based logic that turns the analytics into human-readable efficiency suggestions (full rule set documented below in "Extended Analytics & Recommendations").

**Sample verified output (facility_id = 1):**
- Average consumption: 71.5 | Peak: 180.38 (at 2018-07-10 23:15:00) | Lowest: 4.59
- Clear diurnal pattern: lowest usage mid-day (~60), peak usage evening hours 19:00–22:00 (~85–87)
- Weekday avg 73.85 vs. weekend avg 65.07
- 16.1% of zero-occupancy readings showed above-average consumption, flagged for review

---

## Phase 5: API Layer

**Objective:** Expose the Energy Agent's outputs over HTTP so the frontend (and other modules) can consume them.

- Built a FastAPI application (`backend/app/main.py`) with CORS middleware enabled for the local frontend dev server (`http://localhost:5173`).
- Implemented endpoints (`backend/app/api/routes.py`):
  - `GET /api/energy/analytics?facility_id=1` → full analytics payload
  - `GET /api/energy/recommendations?facility_id=1` → recommendation strings
  - `GET /api/energy/temperature-correlation?facility_id=1` → correlation coefficient + binned averages
  - `GET /api/energy/day-of-week?facility_id=1` → average consumption per day of week
  - `GET /api/energy/anomalies?facility_id=1&threshold=2.0` → detected statistical anomalies, balanced across spikes and drops
  - `GET /api/energy/monthly-trend?facility_id=1` → monthly consumption + temperature averages (for the dashboard's trend overlay)
  - `GET /api/energy/anomaly-detail?timestamp=...&facility_id=1` → full context for one flagged anomaly, including a ±2 hour reading window
  - `POST /api/energy/simulate` → predicts consumption for a hypothetical hour/temperature/occupancy combination using a trained regression model (kept in the API for completeness; not currently exposed in the dashboard UI — see Phase 6 notes)
  - `POST /api/energy/readings` → adds a new real reading to `energy_usage`
  - `DELETE /api/energy/readings/{record_id}` → deletes a reading by ID
  - `GET /api/energy/readings/recent` → lists the most recent readings, for the add/delete UI
- Verified all endpoints interactively via FastAPI's auto-generated Swagger UI at `/docs`.
- Ran locally via:
  ```bash
  uvicorn app.main:app --reload
  ```

---

## Phase 6: Energy Monitoring Dashboard

**Objective:** Visualize the Energy Agent's analytics and recommendations in a usable, interactive frontend interface.

### Initial build
- Scaffolded the frontend with Vite + React (JavaScript, ESLint).
- Installed `axios` (API calls) and `recharts` (charting).
- Built an API service layer (`frontend/src/services/api.js`) wrapping calls to all backend endpoints.
- Applied a dedicated visual design system (`frontend/src/index.css`, `frontend/src/App.css`) styled around a control-room/instrumentation aesthetic — dark navy background, amber/cyan data accents, monospace numerals for readings.

### Layout redesign
- Restructured the dashboard from stacked full-width cards into a grid-based panel system (`.dash-grid`, `.panel` CSS classes), modeled on a reference multi-panel analytics dashboard layout.
- Replaced the original full-circle gauge with a custom SVG **semi-circle gauge** component, reused across both stat panels (avg-vs-peak load, weekend load ratio).
- Row 1: semi-circle gauge + two stat-cluster panels (Consumption Overview, Range) using a horizontal, divided-column layout instead of stacked cards.
- Replaced the original temperature-vs-consumption **scatter plot** with a **dual-line area overlay chart** — monthly average consumption and outdoor temperature plotted together on independent Y-axes with a shared legend, giving a clearer seasonal trend view than the raw scatter.

### Interactivity — click-to-detail
- Anomaly table rows are now clickable: clicking a flagged reading opens a modal showing full context — deviation from the mean, z-score, conditions at that reading (temperature, occupancy, day), and a ±2 hour window of surrounding readings for comparison.

### Interactivity — search & filter
- The Detected Anomalies panel includes a live text search (by timestamp) and a type filter (All / Spikes Only / Drops Only), applied client-side against the already-loaded anomaly list.

### Dynamic data — add & delete
- Added a dedicated "Add / Remove Real Data" panel allowing a user to insert a new `energy_usage` reading (timestamp, power, temperature, occupancy) directly into the database, and delete any of the most recent readings.
- Every add/delete triggers a full re-fetch of all analytics, recommendations, charts, and stats (`refreshAllData()`), so the entire dashboard recalculates live from the updated database — not from cached or simulated values.
- The earlier "Simulate a Reading" panel (a what-if predictor using a trained `RandomForestRegressor`) was built and tested, then removed from the UI in favor of this real add/delete workflow, which better demonstrates genuine dynamic data — the underlying model and `/energy/simulate` endpoint remain in the codebase.

---

## Extended Analytics & Recommendations

### Temperature Correlation — `get_temperature_correlation()`
- Computes the Pearson correlation coefficient between `outdoor_temp` and `power_consumption`.
- Bins temperature into ranges and reports average consumption per range.
- **Result:** r = 0.477 (moderate positive correlation). Average consumption rises steadily with temperature — 52.24 kWh (0–10°C) → 70.68 kWh (10–20°C) → 90.83 kWh (20–30°C) — consistent with cooling-driven (AC) load rather than heating.

### Day-of-Week Breakdown — `get_day_of_week_breakdown()`
- **Result:** Tuesday shows the highest average consumption (75.98 kWh), Sunday the lowest (62.41 kWh) — a ~22% gap.

### Anomaly / Spike Detection — `get_anomalies()`
- Computes a z-score for every reading; flags any reading beyond the threshold as a `spike` or `drop`.
- Rebalanced to return the top spikes **and** top drops separately (rather than one combined top-20 list dominated by the highest raw values), so both anomaly types are genuinely represented in the UI and its filters.
- **Result:** 1,196 readings (5.63% of all data) flagged at the default threshold.

### Monthly Trend — `get_monthly_trend()`
- Aggregates average consumption and average outdoor temperature per calendar month, powering the dual-line dashboard chart.

### Anomaly Detail — `get_anomaly_detail()`
- Given a specific timestamp, returns its exact deviation from the mean, z-score, conditions at that reading, and the surrounding ±2 hour window of readings for context — powers the click-to-detail modal.

### Live Data Editing — `add_reading()` / `delete_reading()` / `get_recent_readings()`
- Real CRUD operations against `energy_usage`, invalidating the agent's cached DataFrame on every change so subsequent analytics calls reflect the update immediately.

### Consumption Prediction Model — `train_energy_model.py` / `predict_consumption()`
- A `RandomForestRegressor` trained on `hour`, `outdoor_temp`, `occupancy`, and `is_weekend` to predict expected consumption.
- **Result:** MAE ≈ 11.62 kWh, R² ≈ 0.481 — a moderate result, explaining roughly half the variance in consumption from these four features alone; the remainder likely reflects anomalies and equipment-specific variation not captured by time/weather/occupancy inputs.

### Expanded Recommendation Engine
`get_recommendations()` produces 6 rules, drawing on all analytics above:
1. Weekend vs. weekday consumption gap (equipment-left-on check)
2. Peak usage hour (load-shifting suggestion)
3. Zero-occupancy periods with above-average consumption (equipment waste check)
4. Temperature correlation strength/direction (cooling vs. heating load driver)
5. Worst vs. best day of week, only flagged if the gap exceeds 15%
6. Anomaly frequency and count, prompting investigation of specific flagged timestamps

---

## Milestone 1 Deliverables — Status

| Deliverable | Status |
|---|---|
| Integrate utility and IoT data | ✅ Complete |
| Build Energy Agent | ✅ Complete |
| Develop energy consumption analytics | ✅ Complete (core + extended: temperature correlation, day-of-week, anomaly detection, monthly trend) |
| Create energy monitoring dashboard | ✅ Complete — redesigned layout, click-to-detail, search/filter, live add/delete editing |
| Generate energy efficiency recommendations | ✅ Complete (6 rules) |

---

## How to Run This Locally

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate        # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m app.init_db_script
python -m app.load_data_script
uvicorn app.main:app --reload
```

**Frontend (in a separate terminal):**
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173`.

**Note:** The raw dataset (`cleandata.xlsx`) is not tracked in this repository. Download it from the Kaggle source and place it in `data/raw/` before running the load script.

---

## Next Steps (Later Milestones)

The remaining schema tables (`security_events`, `alerts`, `cost_reports`) and their corresponding agents (Occupancy, Security, Cost-Optimization, Alerts) are planned for subsequent milestones, following the same pattern established here and extended in Milestone 2: agent class → analytics/logic → API route → interactive dashboard page.
