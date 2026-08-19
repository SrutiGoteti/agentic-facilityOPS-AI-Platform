# Milestone 2 — Predictive Maintenance System

**Project:** Agentic FacilityOps AI Platform
**Milestone:** 2 (Weeks 3–4)
**Scope:** Build the Maintenance Agent, integrate asset monitoring data, develop equipment health scoring, predict maintenance schedules, and generate maintenance alerts.

---

## Overview

This milestone follows the same vertical-slice pattern established in Milestone 1 (raw data → relational schema → agent logic → API → interactive dashboard), applied to equipment health and failure prediction. Unlike Milestone 1's rule-based recommendation engine, this milestone's core intelligence is genuinely **ML-driven**: a trained classifier predicts failure probability per reading, which is then aggregated into health scores, alerts, and recommendations. The dashboard was also built with the interactive patterns established in Milestone 1 — click-to-detail views, search/filter, and live add/delete data editing — from the outset.

---

## Phase 1: Data Collection

**Objective:** Source real equipment sensor/failure data, since no single public dataset covers a full facility-management schema (facilities, assets, maintenance, security).

- Selected the **AI4I 2020 Predictive Maintenance Dataset** (Kaggle, source: stephanmatzka) — 10,000 rows of industrial machine sensor readings with labeled failures:
  - `UDI`, `Product ID`, `Type` (L/M/H)
  - `Air temperature [K]`, `Process temperature [K]`, `Rotational speed [rpm]`, `Torque [Nm]`, `Tool wear [min]`
  - `Machine failure` (binary) plus 5 specific failure-type flags: `TWF`, `HDF`, `PWF`, `OSF`, `RNF`
- Verified the dataset's known class imbalance: 339 failures out of 10,000 readings (3.39%) — flagged upfront as something that would need explicit handling during model training (naive accuracy would be misleading on this data).
- Since no public dataset covers facility asset inventories, security events, or cost reports, confirmed the plan (from Milestone 1 planning) to **synthesize** the `assets` table rather than source it — a standard approach for this kind of capstone, using one or two real anchor datasets (energy, maintenance) with surrounding relational tables generated to link everything by a common `facility_id`.

---

## Phase 2: Database Schema Extension

**Objective:** Extend the existing `facilityops.db` (from Milestone 1) with the two tables this milestone requires.

- Added to `backend/app/models/db_models.py`:
  - **`Asset`** — asset_id (PK), facility_id (FK), asset_type, install_date, status
  - **`MaintenanceRecord`** — record_id (PK), asset_id (FK), product_id, product_type, air_temperature, process_temperature, rotational_speed, torque, tool_wear, machine_failure, failure_type
- `failure_type` was deliberately implemented as a single human-readable string (e.g. "Tool Wear Failure") rather than carrying over AI4I's 5 separate boolean flag columns — simpler to query and display on a dashboard.
- Reran `init_db_script.py` — SQLAlchemy's `create_all()` only creates missing tables, so the existing `facilities`/`energy_usage` data from Milestone 1 was left untouched.

---

## Phase 3: Data Loading

**Objective:** Populate `assets` with synthetic equipment and map AI4I's readings onto them.

- Wrote `backend/app/load_maintenance_data.py`:
  - Created **5 synthetic assets** for `facility_id = 1`: HVAC Unit, Chiller, Lighting Panel, Water Pump, Backup Generator.
  - Distributed AI4I's 10,000 rows round-robin across the 5 assets (2,000 readings each), simulating independent sensor histories per piece of equipment.
  - Derived `failure_type` from AI4I's 5 boolean columns into one readable label per row (e.g. `TWF=1` → "Tool Wear Failure").
- Verified the load: 5 assets, 10,000 maintenance records confirmed inserted.

---

## Phase 4: Machine Learning — Failure Prediction Model

**Objective:** Train a real classifier to predict equipment failure probability, chosen deliberately over a rule-based/threshold approach to give the project a genuine ML component matching what "predictive maintenance" technically means.

- `backend/app/train_maintenance_model.py`:
  - Features: `Type` (encoded), `Air temperature`, `Process temperature`, `Rotational speed`, `Torque`, `Tool wear`.
  - Model: `RandomForestClassifier` (200 estimators), with `class_weight="balanced"` to address the 3.39% failure rate — without this, a naive model could reach ~96% "accuracy" by always predicting "no failure," while catching zero real failures.
  - Stratified train/test split (80/20) to preserve the failure ratio in both sets.
- **Results:**
  - Failure class recall: **0.74** (caught 50 of 68 real failures in the test set) — the most important metric here, since missing a real failure is costlier than a false alarm.
  - Failure class precision: **0.77**
  - Confusion matrix: 1917 true negatives, 15 false positives, 18 false negatives, 50 true positives.
  - **Feature importance:** Torque (33.9%) and Rotational Speed (27.5%) dominate, Tool Wear contributes 21.5%; temperatures and product type matter far less — this ordering directly informs the Maintenance Agent's explanations later.
- Model and label encoder saved to `ml_models/maintenance/failure_model.pkl` and `type_encoder.pkl`.
- **Honest limitation, documented rather than hidden:** re-running failure probabilities across the full dataset later revealed the model's predictions are strongly **polarized** — most readings sit near 0% probability, with a distinct cluster of 271 readings sitting exactly at 100%, and very little in between. This reflects AI4I's failure conditions being fairly sharp, threshold-like physical events (e.g. torque × speed exceeding a known limit) rather than gradual risk — the model learns confident, binary-like boundaries rather than a smooth risk gradient. Alert and recommendation logic (Phase 5) was tuned around this real distribution rather than assuming a smooth spread.

---

## Phase 5: The Maintenance Agent

**Objective:** Build the core intelligence layer — health scoring, alerts, and recommendations — around the trained model.

Implemented `backend/app/agents/maintenance_agent.py` as a `MaintenanceAgent` class.

- **`load_data()`** — pulls all assets and their maintenance records for the facility into DataFrames.
- **`predict_failure_probability()`** — runs the trained model on every record via `predict_proba()`, renaming columns to match the exact names the model was trained on (a real bug hit and fixed during development — the agent's snake_case DB columns didn't match the model's original AI4I column names, e.g. `torque` vs. `"Torque [Nm]"`).
- **`get_asset_health_scores()`** — aggregates failure probability per asset into a 0–100 health score. The formula blends **average** risk (70% weight) and **worst-case (max) reading** risk (30% weight) — an average-only score was tried first but proved misleadingly reassuring, since a single alarming reading gets diluted across thousands of normal ones; the blended formula was adopted so one dangerous reading meaningfully lowers an asset's score.
- **`get_maintenance_alerts()`** — flags individual high-risk readings. Given the model's polarized probability distribution (Phase 4), the alert threshold was tuned down from an initial 0.5 to **0.05**, and results are split into two buckets ("critical" ≥0.9, "elevated" between the threshold and 0.9) so the alert table shows genuine variety instead of being dominated entirely by 100%-probability ties.
- **`get_recommendations()`** — 5 rules:
  1. Low health score assets flagged for inspection.
  2. Most urgent single high-risk reading, called out by asset and probability.
  3. **Dominant failure type per low-scoring asset** — names the specific failure mode driving that asset's risk (e.g. "predominantly Tool Wear Failure"), so inspection can be targeted rather than generic.
  4. **Fleet-wide dominant failure type** — flags when one failure type accounts for a large share (>40%) of all logged failures across multiple assets, suggesting a systemic cause rather than isolated equipment issues.
  5. Explicitly names assets with zero logged failures, so the panel reads as a complete status report rather than only surfacing problems.
- **`get_asset_detail()`** — full diagnostic breakdown for one asset: health score, average sensor readings, failure-type breakdown, and its top risky individual readings — powers the dashboard's click-to-detail modal.
- **`predict_single_reading()`** — runs the trained model on a single hypothetical sensor reading (what-if simulation), independent of the stored dataset.
- **`add_record()` / `delete_record()` / `get_recent_records()`** — real CRUD against `maintenance_records`, invalidating the cached DataFrame on every change.
- **`get_asset_list()`** — lists assets for the add-record dropdown UI.

---

## Phase 6: API Layer

Implemented in `backend/app/api/routes.py`:

- `GET /api/maintenance/health-scores?facility_id=1`
- `GET /api/maintenance/alerts?facility_id=1&threshold=0.05`
- `GET /api/maintenance/recommendations?facility_id=1`
- `GET /api/maintenance/asset/{asset_id}?facility_id=1` — full asset detail
- `POST /api/maintenance/simulate` — single-reading what-if prediction
- `POST /api/maintenance/records` — add a new maintenance record
- `DELETE /api/maintenance/records/{record_id}` — delete a record
- `GET /api/maintenance/records/recent?facility_id=1` — recent records for the add/delete UI
- `GET /api/maintenance/assets?facility_id=1` — asset list for dropdowns

All verified via `/docs`.

---

## Phase 7: Maintenance Dashboard

Built using the same panel/grid visual system and interaction patterns established (and later retrofitted) in Milestone 1's Energy dashboard, applied here from the start.

- **Row 1:** semi-circle "Fleet Health" gauge (average health score across all assets), plus two stat-cluster panels — Fleet Overview (total assets, high-risk readings) and Attention Needed (lowest score, total failures logged).
- **Add / Remove Real Data panel:** select an asset from a dropdown, enter sensor values (type, temperatures, rotational speed, torque, tool wear, failure flag), and add a real record directly to `maintenance_records`. Recent records are listed with a delete option. Every add/delete triggers a full dashboard refresh, so health scores, the bar chart, alerts, and recommendations all recalculate live from the database.
- **Row 2:** small "Healthy Assets" gauge (% of assets scoring ≥80) beside a horizontal bar chart of all assets' health scores, color-coded by severity (cyan/amber/red).
- **Equipment Status panel — click-to-detail:** assets grouped into **Critical / Moderate / Good** columns by health score. Clicking any equipment card opens a modal with that asset's full diagnostic detail (health score, average sensor readings, failure-type breakdown, top risky individual readings).
- **High-Risk Readings panel — search & filter:** live text search by equipment name plus a dropdown filter by asset type, applied client-side against the loaded alert list.
- **Recommendations panel:** the 5-rule recommendation output described in Phase 5.
- The earlier "Simulate a Sensor Reading" panel (what-if prediction via `predict_single_reading()`) was built, tested, and then removed from the UI in favor of the real add/delete data workflow — consistent with the same decision made on the Energy dashboard. The underlying model and `/maintenance/simulate` endpoint remain in the codebase.

---

## Known Data Characteristic — Demo Distribution

With the original 5 synthetic assets (2,000 AI4I readings each), health scores clustered tightly (roughly 66–67), leaving the "Critical" and "Good" status groups empty in the UI — an artifact of evenly distributing one dataset across 5 assets rather than a bug. A one-off local seeding script (`adjust_asset_demo.py`, not part of the production pipeline) was used to demonstrate the full Critical/Moderate/Good range for presentation purposes, by adding a batch of high-risk synthetic records to one asset and removing high-risk records from another. This script and its resulting data are intended to be reset (via re-running `init_db_script.py` + the load scripts fresh) before final submission, so the delivered dataset reflects only genuinely sourced data.

---

## Milestone 2 Deliverables — Status

| Deliverable | Status |
|---|---|
| Build Maintenance Agent | ✅ Complete |
| Integrate asset monitoring data | ✅ Complete (synthetic `assets` + real AI4I 2020 `maintenance_records`) |
| Develop equipment health scoring | ✅ Complete — ML-based (Random Forest classifier), blended avg/max-risk formula |
| Predict maintenance schedules | ✅ Complete — per-reading failure probability via trained model |
| Generate maintenance alerts | ✅ Complete — risk-bucketed alerts, tuned to the model's real probability distribution |
| Interactive dashboard | ✅ Complete — redesigned layout, click-to-detail, search/filter, live add/delete editing |

---

## How to Run This Locally

**Backend** (assumes Milestone 1's `facilityops.db` already exists; otherwise run its init/load scripts first):
```bash
cd backend
python -m venv venv
source venv/bin/activate        # or venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m app.init_db_script            # safe to rerun — only creates missing tables
python -m app.load_maintenance_data     # loads synthetic assets + AI4I data
python -m app.train_maintenance_model   # trains and saves the classifier
uvicorn app.main:app --reload
```

**Frontend (in a separate terminal):**
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173/maintenance`.

**Note:** The AI4I 2020 dataset is not tracked in this repository. Download it from Kaggle and place it in `data/raw/ai4i2020.csv` before running the load script.

---

## Next Steps (Later Milestones)

The remaining schema tables (`security_events`, `alerts`, `cost_reports`) and their corresponding agents (Occupancy, Security, Cost-Optimization, Alerts) are planned for subsequent milestones, continuing the established pattern: agent class → analytics/ML logic → API route → interactive dashboard page.
