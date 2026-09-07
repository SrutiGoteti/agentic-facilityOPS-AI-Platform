# Milestone 4 — Cost Optimization & Enterprise Deployment

**Project:** Agentic FacilityOps AI Platform
**Milestone:** 4 (Weeks 7–8)
**Scope:** Build the Cost Optimization Agent, develop an executive dashboard, implement cross-agent orchestration, generate facility intelligence reports, and add user authentication.

---

## Overview

This final milestone delivers the Cost Optimization Agent and platform-wide user authentication, completing the Agentic FacilityOps AI Platform. Unlike the previous four agents, the Cost Optimization Agent does not operate on an isolated dataset — it performs **cross-agent orchestration**, deriving cost figures from real data already produced by the Energy, Maintenance, and Security modules, and computing a composite Facility Health Score by directly querying all four other agents. Authentication was added as a platform-wide layer, gating access to every dashboard behind a login.

---

## Phase 1: Cost Data Design

**Objective:** Produce genuine, traceable cost figures without inventing a disconnected dataset.

Cost entries are derived directly from real data already produced elsewhere in the platform:

- **Energy cost** = real kWh consumption (Milestone 1's `energy_usage`) × an assumed commercial tariff rate (₹8.5/kWh), aggregated monthly.
- **Maintenance cost** = real logged failure count (Milestone 2's `maintenance_records`) × an assumed average repair cost (₹4,500/failure), distributed across the dataset's month range.
- **Security cost** = real logged event count (Milestone 3's `security_events`) × an assumed per-event response cost (₹800/event), aggregated monthly.
- **Administrative cost** = a fixed assumed monthly overhead (₹15,000).

All assumed rates are documented constants in `load_cost_data.py`, not hidden — every cost figure traces back to a real count or reading multiplied by a stated rate.

---

## Phase 2: Database Schema

Two new tables were added to `backend/app/models/db_models.py`:

- **`CostEntry`** — entry_id (PK), facility_id (FK), category, amount, period (YYYY-MM), description.
- **`User`** — user_id (PK), username, email, hashed_password, created_at.

`backend/app/load_cost_data.py` populates `cost_entries` by querying `EnergyUsage`, `MaintenanceRecord`, and `SecurityEvent` directly and applying the rates above.

---

## Phase 3: The Cost Optimization Agent

Implemented `backend/app/agents/cost_agent.py` as a `CostOptimizationAgent` class.

- **`load_data()`** — pulls all cost entries for the facility.
- **`get_analytics()`** — total cost, cost change % (first half vs. second half of the period range), and average monthly cost.
- **`get_cost_distribution()`** — total and percentage share per category, powering the pie chart.
- **`get_cost_trend()` / `get_category_trend()`** — monthly time series, overall and per category.
- **`get_category_detail()`** — full summary for one category (total, average monthly, highest/lowest month, entry count, trend) — powers the dashboard's click-to-detail modal.
- **`get_facility_health_score()`** — **cross-agent orchestration**: directly instantiates and queries the Energy, Maintenance, Occupancy, and Security agents, extracts a relevant health signal from each, and averages them into one composite score. Energy is penalized by anomaly rate, Maintenance uses the average of all asset health scores, Occupancy is penalized by overcrowding rate, Security is penalized by high-severity and unresolved event ratios. No new logic was invented for this — the Cost Agent reads and synthesizes what the other four agents already compute.
- **`get_recommendations()`** — 3 rules: the dominant cost category, a significant month-over-month cost increase, and the weakest-scoring module from the health breakdown.
- **`add_entry()` / `delete_entry()` / `get_recent_entries()`** — live CRUD against `cost_entries`.

**Sample verified output (facility_id = 1):** Total cost ₹51,56,109.84 across 8 months, cost change +14.3%, composite Facility Health Score 74.6/100 (Energy 83.1, Maintenance 66.6, Occupancy 96.0, Security 52.6). Cost distribution: Energy 62.7%, Maintenance 29.6%, Security 5.4%, Administrative 2.3%.

---

## Phase 4: API Layer

**Cost:** `GET /api/cost/analytics`, `/distribution`, `/trend`, `/category-trend/{category}`, `/category-detail/{category}`, `/health-score`, `/recommendations`, plus `POST/DELETE/GET` routes for live entry editing.

**Authentication:** `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`. Passwords are hashed with bcrypt before storage; login/register return a JWT signed with a 24-hour expiry.

All verified via `/docs`.

---

## Phase 5: Authentication

- **`backend/app/core/auth_utils.py`** — `hash_password()` / `verify_password()` (bcrypt), `create_access_token()` / `decode_access_token()` (PyJWT), and `get_current_user()`, a FastAPI dependency that validates the `Authorization: Bearer <token>` header on protected routes.
- **`frontend/src/context/AuthContext.jsx`** — React Context managing login/register/logout, storing the JWT and username in `localStorage`.
- **`frontend/src/components/ProtectedRoute.jsx`** — redirects to `/login` if no authenticated user is present.
- **Login and Register pages** — both include a password visibility toggle (show/hide via an eye icon).
- **`App.jsx`** — wraps the whole app in `AuthProvider`; every dashboard route is wrapped in `ProtectedRoute`; the nav bar shows the signed-in username and a logout control.

---

## Phase 6: Cost Optimization Dashboard

- **KPI row:** Total Operational Cost, Cost Change %, Facility Health Score, Potential Savings (estimated).
- **Add / Remove Cost Entry panel:** add or delete a cost entry for any category/amount/period, with the whole dashboard recalculating live.
- **Cost Distribution:** a donut chart of the four cost categories.
- **Facility Health Breakdown:** a radar chart plotting the four agent-level sub-scores that feed the composite Facility Health Score.
- **Monthly Cost Trend:** a full-width area chart of total cost by month.
- **Cost Breakdown table — click for details:** clicking a category opens a modal with its total, average monthly cost, highest/lowest month, entry count, and its own trend chart.
- **Cost-Saving Recommendations panel.**

---

## System Architecture & Database Schema

Full system architecture, entity-relationship, and authentication-flow diagrams are included in `Milestone4_FacilityOps.docx`, covering: the frontend → API → agent → database flow with cross-agent orchestration; the complete schema across all four milestones; and the authentication sequence from form submission through protected API access.

---

## Milestone 4 Deliverables — Status

| Deliverable | Status |
|---|---|
| Build Cost Optimization Agent | ✅ Complete |
| Develop executive dashboard | ✅ Complete (KPI row, distribution, trend, click-to-detail, recommendations) |
| Implement cross-agent orchestration | ✅ Complete (Facility Health Score querying all four other agents) |
| Generate facility intelligence reports | ✅ Complete (cost-saving recommendation engine) |
| User authentication | ✅ Complete (register, login, JWT-protected routes, logout) |

---

## How to Run This Locally

**Backend** (assumes Milestones 1–3's tables already exist):
```bash
cd backend
pip install -r requirements.txt
python -m app.init_db_script
python -m app.load_cost_data
uvicorn app.main:app --reload
```

**Frontend (in a separate terminal):**
```bash
cd frontend
npm install
npm run dev
```

Then open `http://localhost:5173` — you'll be redirected to `/login`. Register a new account to access all five dashboards.

---

## Project Completion

This concludes the four-milestone build of the Agentic FacilityOps AI Platform: five agents (Energy, Maintenance, Occupancy, Security, Cost Optimization), each following the same established pattern — agent logic, API layer, interactive dashboard — unified under a single authenticated platform, with cross-agent orchestration tying the individual modules into one Facility Health Score.
