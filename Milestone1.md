# Milestone 1 — Energy Intelligence & Monitoring

**Project:** Agentic FacilityOps AI Platform
**Milestone:** 1 (Weeks 1–2)
**Scope:** Integrate utility/IoT data, build the Energy Agent, develop energy consumption analytics, create an energy monitoring dashboard, and generate energy efficiency recommendations.

---

## Overview

This milestone delivers an end-to-end vertical slice of the platform for a single module (Energy) across the full stack: raw data → relational database → agent logic (analytics + recommendations) → API → dashboard UI. This structure is the pattern the rest of the team will replicate for the Maintenance, Occupancy, Security, and Cost modules in later milestones.

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

Implemented `backend/app/agents/energy_agent.py` as an `EnergyAgent` class with three methods:

- **`load_data()`** — pulls all `energy_usage` rows for a given facility from the database into a pandas DataFrame, and derives `hour`, `day_of_week`, `is_weekend` features.
- **`get_analytics()`** — computes:
  - Average, peak, and lowest power consumption
  - Timestamp of peak consumption
  - Average consumption broken down by hour of day (0–23)
  - Average consumption: weekday vs. weekend
- **`get_recommendations()`** — rule-based logic that turns the analytics into human-readable efficiency suggestions, e.g.:
  - Flagging when weekend consumption is close to weekday levels despite presumed lower occupancy
  - Identifying the peak usage hour and suggesting load-shifting
  - Flagging the percentage of zero-occupancy periods with above-average consumption (potential equipment left running)

**Sample verified output (facility_id = 1):**
- Average consumption: 71.5 | Peak: 180.38 (at 2018-07-10 23:15:00) | Lowest: 4.59
- Clear diurnal pattern: lowest usage mid-day (~60), peak usage evening hours 19:00–22:00 (~85–87)
- Weekday avg 73.85 vs. weekend avg 65.07
- 16.1% of zero-occupancy readings showed above-average consumption, flagged for review

---

## Phase 5: API Layer

**Objective:** Expose the Energy Agent's outputs over HTTP so the frontend (and other modules) can consume them.

- Built a FastAPI application (`backend/app/main.py`) with CORS middleware enabled for the local frontend dev server (`http://localhost:5173`).
- Implemented two endpoints (`backend/app/api/routes.py`):
  - `GET /api/energy/analytics?facility_id=1` → returns the full analytics payload as JSON
  - `GET /api/energy/recommendations?facility_id=1` → returns the list of recommendation strings
- Verified both endpoints interactively via FastAPI's auto-generated Swagger UI at `/docs`.
- Ran locally via:
  ```bash
  uvicorn app.main:app --reload
  ```

---

## Phase 6: Energy Monitoring Dashboard

**Objective:** Visualize the Energy Agent's analytics and recommendations in a usable frontend interface.

- Scaffolded the frontend with Vite + React (JavaScript, ESLint).
- Installed `axios` (API calls) and `recharts` (charting).
- Built an API service layer (`frontend/src/services/api.js`) wrapping calls to both backend endpoints.
- Built the Energy dashboard page (`frontend/src/pages/energy/index.jsx`) displaying:
  - Summary stat cards (average / peak / lowest consumption)
  - A radial gauge visualizing average load relative to peak
  - An hourly consumption trend chart (gradient area chart, all 24 hours labeled)
  - A list of the agent's generated efficiency recommendations
- Applied a dedicated visual design system (`frontend/src/index.css`, `frontend/src/App.css`) styled around a control-room/instrumentation aesthetic appropriate to a facility energy-monitoring tool — dark navy background, amber/cyan data accents, monospace numerals for readings.
- Verified the dashboard renders correctly against the live backend at `http://localhost:5173`, backend running at `http://127.0.0.1:8000`.

---

## Milestone 1 Deliverables — Status

| Deliverable | Status |
|---|---|
| Integrate utility and IoT data | ✅ Complete |
| Build Energy Agent | ✅ Complete |
| Develop energy consumption analytics | ✅ Complete |
| Create energy monitoring dashboard | ✅ Complete |
| Generate energy efficiency recommendations | ✅ Complete |

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
