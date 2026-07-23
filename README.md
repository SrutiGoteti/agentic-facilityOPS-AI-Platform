# Agentic-facilityOPS-AI-Platform
Infosys Internship - Team A

# 🏢 Agentic-FacilityOps-AI

![Status](https://img.shields.io/badge/Status-Active_Development-brightgreen)
![Internship](https://img.shields.io/badge/Infosys-Springboard_Internship-blue)
![Python](https://img.shields.io/badge/Python-FastAPI-3776AB?logo=python)
![React](https://img.shields.io/badge/React-Tailwind_CSS-61DAFB?logo=react)
![Database](https://img.shields.io/badge/Database-PostgreSQL-336791?logo=postgresql)

An AI-powered multi-agent platform designed to automate, monitor, and optimize facility operations intelligently. This project transitions traditional facility management into an autonomous, data-driven system using specialized AI agents.

## 🚀 Project Overview

The Agentic FacilityOps AI Platform utilizes a micro-agent architecture to handle complex operational tasks. Instead of relying solely on manual monitoring via dashboards, this platform deploys AI agents that actively analyze data, predict issues, and generate actionable recommendations for energy usage, occupancy, maintenance, and security.

### 🎯 Development Milestones
- [x] **Milestone 1: Energy Intelligence & Monitoring** *(Currently in Development)*
  - Integrating utility and IoT data.
  - Developing the Energy Agent and consumption analytics.
  - Generating energy efficiency recommendations.
- [ ] **Milestone 2: Occupancy Agent**
- [ ] **Milestone 3: Authorization Agent**
- [ ] **Milestone 4: Cost-Optimization Agent**
- [ ] **Milestone 5: Facility Agent**
- [ ] **Milestone 6 & 7: Dashboard, Alerts & Automation**

---

## 🛠️ Technology Stack

**Frontend**
* **Framework:** React.js (Vite)
* **Styling:** Tailwind CSS
* **Components:** Custom UI for data visualization (Charts, Tables)

**Backend & AI**
* **Framework:** FastAPI (Python)
* **AI Logic:** Custom domain-specific rule engines and ML models
* **Data Processing:** Pandas / NumPy

**Database & Infrastructure**
* **Primary Database:** PostgreSQL
* **Caching:** Redis
* **Containerization:** Docker & Docker Compose

---

## 🗄️ Database Schema

The platform is driven by a robust relational database capturing real-time facility metrics. Core tables include:
* `facilities`: Master data for buildings and campuses.
* `energy_usage`: Time-series data for electricity, HVAC, water, and lighting.
* `assets` & `maintenance_records`: Tracking equipment health and repair costs.
* `occupancy`: Real-time floor and room utilization counts.
* `security_events` & `alerts`: Logging unauthorized access and system warnings.
* `cost_reports`: Monthly aggregated financial metrics.

---

## 📁 System Architecture

```text
Agentic-FacilityOps-AI/
├── backend/                  # FastAPI Application
│   ├── app/
│   │   ├── api/              # API Routes (e.g., energy, occupancy)
│   │   ├── core/             # Database and Config setup
│   │   ├── models/           # Pydantic Schemas & DB Models
│   │   └── services/         # Reusable data services
│   ├── agents/               # Autonomous AI Agents (Energy, Security, etc.)
│   ├── data/                 # Raw and processed IoT CSV/Sensor data
│   └── ml_models/            # Trained predictive models
│
└── frontend/                 # React UI
    ├── src/
    │   ├── components/       # Reusable UI (Cards, Charts)
    │   ├── pages/            # Views (Dashboard, Energy, Maintenance)
    │   └── services/         # Axios API calls to Backend


