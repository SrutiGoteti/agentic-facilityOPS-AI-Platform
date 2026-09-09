from fastapi import APIRouter
from fastapi import HTTPException
from fastapi import Depends
from pydantic import BaseModel
from datetime import datetime

from app.agents.energy_agent import EnergyAgent
from app.agents.maintenance_agent import MaintenanceAgent
from app.agents.occupancy_agent import OccupancyAgent
from app.agents.security_agent import SecurityAgent
from app.agents.cost_agent import CostOptimizationAgent
from app.core.database import SessionLocal
from app.core.auth_utils import hash_password, verify_password, create_access_token, get_current_user
from app.models.db_models import User

router = APIRouter()

# ---------- Shared agent instances (per facility_id) ----------
# Reusing one instance per agent type instead of creating a fresh one on every
# request avoids reloading the entire table into a new DataFrame on every single
# API call. This matters most for Occupancy (100k+ rows) but is applied to all
# five agents for consistency and lower memory use overall on constrained hosting.

_energy_agents = {}
_maintenance_agents = {}
_occupancy_agents = {}
_security_agents = {}
_cost_agents = {}

def get_energy_agent(facility_id: int = 1):
    if facility_id not in _energy_agents:
        _energy_agents[facility_id] = EnergyAgent(facility_id=facility_id)
    return _energy_agents[facility_id]

def get_maintenance_agent(facility_id: int = 1):
    if facility_id not in _maintenance_agents:
        _maintenance_agents[facility_id] = MaintenanceAgent(facility_id=facility_id)
    return _maintenance_agents[facility_id]

def get_occupancy_agent(facility_id: int = 1):
    if facility_id not in _occupancy_agents:
        _occupancy_agents[facility_id] = OccupancyAgent(facility_id=facility_id)
    return _occupancy_agents[facility_id]

def get_security_agent(facility_id: int = 1):
    if facility_id not in _security_agents:
        _security_agents[facility_id] = SecurityAgent(facility_id=facility_id)
    return _security_agents[facility_id]

def get_cost_agent(facility_id: int = 1):
    if facility_id not in _cost_agents:
        _cost_agents[facility_id] = CostOptimizationAgent(facility_id=facility_id)
    return _cost_agents[facility_id]


# ---------- Energy ----------

@router.get("/energy/analytics")
def get_energy_analytics(facility_id: int = 1):
    agent = get_energy_agent(facility_id)
    agent.load_data()
    return agent.get_analytics()

@router.get("/energy/recommendations")
def get_energy_recommendations(facility_id: int = 1):
    agent = get_energy_agent(facility_id)
    agent.load_data()
    return {"recommendations": agent.get_recommendations()}

@router.get("/energy/temperature-correlation")
def get_temperature_correlation(facility_id: int = 1):
    agent = get_energy_agent(facility_id)
    agent.load_data()
    return agent.get_temperature_correlation()

@router.get("/energy/day-of-week")
def get_day_of_week_breakdown(facility_id: int = 1):
    agent = get_energy_agent(facility_id)
    agent.load_data()
    return agent.get_day_of_week_breakdown()

@router.get("/energy/anomalies")
def get_anomalies(facility_id: int = 1, threshold: float = 2.0):
    agent = get_energy_agent(facility_id)
    agent.load_data()
    return agent.get_anomalies(threshold=threshold)

@router.get("/energy/monthly-trend")
def get_monthly_trend(facility_id: int = 1):
    agent = get_energy_agent(facility_id)
    agent.load_data()
    return {"monthly_trend": agent.get_monthly_trend()}

class EnergySimInput(BaseModel):
    hour: int
    outdoor_temp: float
    occupancy: float
    is_weekend: bool

@router.post("/energy/simulate")
def simulate_energy(input: EnergySimInput, facility_id: int = 1):
    agent = get_energy_agent(facility_id)
    return agent.predict_consumption(input.hour, input.outdoor_temp, input.occupancy, input.is_weekend)

@router.get("/energy/anomaly-detail")
def get_anomaly_detail(timestamp: str, facility_id: int = 1):
    agent = get_energy_agent(facility_id)
    agent.load_data()
    return agent.get_anomaly_detail(timestamp)

class EnergyReadingInput(BaseModel):
    timestamp: str
    power_consumption: float
    outdoor_temp: float
    occupancy: float

@router.post("/energy/readings")
def add_energy_reading(input: EnergyReadingInput, facility_id: int = 1):
    agent = get_energy_agent(facility_id)
    return agent.add_reading(
        datetime.fromisoformat(input.timestamp),
        input.power_consumption, input.outdoor_temp, input.occupancy
    )

@router.delete("/energy/readings/{record_id}")
def delete_energy_reading(record_id: int, facility_id: int = 1):
    agent = get_energy_agent(facility_id)
    return agent.delete_reading(record_id)

@router.get("/energy/readings/recent")
def get_recent_energy_readings(facility_id: int = 1, limit: int = 20):
    agent = get_energy_agent(facility_id)
    return {"readings": agent.get_recent_readings(limit)}


# ---------- Maintenance ----------

@router.get("/maintenance/health-scores")
def get_maintenance_health_scores(facility_id: int = 1):
    agent = get_maintenance_agent(facility_id)
    return agent.get_asset_health_scores()

@router.get("/maintenance/alerts")
def get_maintenance_alerts_route(facility_id: int = 1, threshold: float = 0.05):
    agent = get_maintenance_agent(facility_id)
    return agent.get_maintenance_alerts(risk_threshold=threshold)

@router.get("/maintenance/recommendations")
def get_maintenance_recommendations(facility_id: int = 1):
    agent = get_maintenance_agent(facility_id)
    return {"recommendations": agent.get_recommendations()}

class MaintenanceSimInput(BaseModel):
    product_type: str
    air_temperature: float
    process_temperature: float
    rotational_speed: float
    torque: float
    tool_wear: float

@router.post("/maintenance/simulate")
def simulate_maintenance(input: MaintenanceSimInput, facility_id: int = 1):
    agent = get_maintenance_agent(facility_id)
    return agent.predict_single_reading(
        input.product_type, input.air_temperature, input.process_temperature,
        input.rotational_speed, input.torque, input.tool_wear
    )

@router.get("/maintenance/asset/{asset_id}")
def get_asset_detail(asset_id: int, facility_id: int = 1):
    agent = get_maintenance_agent(facility_id)
    return agent.get_asset_detail(asset_id)

class MaintenanceRecordInput(BaseModel):
    asset_id: int
    product_id: str
    product_type: str
    air_temperature: float
    process_temperature: float
    rotational_speed: float
    torque: float
    tool_wear: float
    machine_failure: bool
    failure_type: str | None = None

@router.post("/maintenance/records")
def add_maintenance_record(input: MaintenanceRecordInput, facility_id: int = 1):
    agent = get_maintenance_agent(facility_id)
    return agent.add_record(
        input.asset_id, input.product_id, input.product_type, input.air_temperature,
        input.process_temperature, input.rotational_speed, input.torque, input.tool_wear,
        input.machine_failure, input.failure_type
    )

@router.delete("/maintenance/records/{record_id}")
def delete_maintenance_record(record_id: int, facility_id: int = 1):
    agent = get_maintenance_agent(facility_id)
    return agent.delete_record(record_id)

@router.get("/maintenance/records/recent")
def get_recent_maintenance_records(facility_id: int = 1, limit: int = 20):
    agent = get_maintenance_agent(facility_id)
    return {"records": agent.get_recent_records(limit)}

@router.get("/maintenance/assets")
def get_asset_list(facility_id: int = 1):
    agent = get_maintenance_agent(facility_id)
    return {"assets": agent.get_asset_list()}


# ---------- Occupancy ----------

@router.get("/occupancy/analytics")
def get_occupancy_analytics(facility_id: int = 1):
    agent = get_occupancy_agent(facility_id)
    return agent.get_analytics()

@router.get("/occupancy/heatmap")
def get_occupancy_heatmap(facility_id: int = 1):
    agent = get_occupancy_agent(facility_id)
    return {"rooms": agent.get_room_heatmap()}

@router.get("/occupancy/room-comparison")
def get_room_comparison(facility_id: int = 1):
    agent = get_occupancy_agent(facility_id)
    return {"rooms": agent.get_room_comparison()}

@router.get("/occupancy/overcrowding")
def get_overcrowding_events(facility_id: int = 1):
    agent = get_occupancy_agent(facility_id)
    return agent.get_overcrowding_events()

@router.get("/occupancy/day-of-week")
def get_occupancy_day_of_week(facility_id: int = 1):
    agent = get_occupancy_agent(facility_id)
    return agent.get_day_of_week_pattern()

@router.get("/occupancy/recommendations")
def get_occupancy_recommendations(facility_id: int = 1):
    agent = get_occupancy_agent(facility_id)
    return {"recommendations": agent.get_recommendations()}

class OccupancyRecordInput(BaseModel):
    room_id: int
    timestamp: str
    headcount: int

@router.post("/occupancy/records")
def add_occupancy_record(input: OccupancyRecordInput, facility_id: int = 1):
    agent = get_occupancy_agent(facility_id)
    return agent.add_record(input.room_id, datetime.fromisoformat(input.timestamp), input.headcount)

@router.delete("/occupancy/records/{record_id}")
def delete_occupancy_record(record_id: int, facility_id: int = 1):
    agent = get_occupancy_agent(facility_id)
    return agent.delete_record(record_id)

@router.get("/occupancy/records/recent")
def get_recent_occupancy_records(facility_id: int = 1, limit: int = 20):
    agent = get_occupancy_agent(facility_id)
    return {"records": agent.get_recent_records(limit)}

@router.get("/occupancy/rooms")
def get_room_list(facility_id: int = 1):
    agent = get_occupancy_agent(facility_id)
    return {"rooms": agent.get_room_list()}


# ---------- Security ----------

@router.get("/security/analytics")
def get_security_analytics(facility_id: int = 1):
    agent = get_security_agent(facility_id)
    return agent.get_analytics()

@router.get("/security/events-by-type")
def get_events_by_type(facility_id: int = 1):
    agent = get_security_agent(facility_id)
    return {"types": agent.get_events_by_type()}

@router.get("/security/timeline")
def get_security_timeline(facility_id: int = 1):
    agent = get_security_agent(facility_id)
    return agent.get_timeline()

@router.get("/security/after-hours")
def get_after_hours_events(facility_id: int = 1):
    agent = get_security_agent(facility_id)
    return agent.get_after_hours_events()

@router.get("/security/recommendations")
def get_security_recommendations(facility_id: int = 1):
    agent = get_security_agent(facility_id)
    return {"recommendations": agent.get_recommendations()}

class SecurityEventInput(BaseModel):
    timestamp: str
    location: str
    event_type: str
    severity: str
    resolved: bool = False

@router.post("/security/events")
def add_security_event(input: SecurityEventInput, facility_id: int = 1):
    agent = get_security_agent(facility_id)
    return agent.add_event(datetime.fromisoformat(input.timestamp), input.location, input.event_type, input.severity, input.resolved)

@router.delete("/security/events/{event_id}")
def delete_security_event(event_id: int, facility_id: int = 1):
    agent = get_security_agent(facility_id)
    return agent.delete_event(event_id)

@router.get("/security/events/recent")
def get_recent_security_events(facility_id: int = 1, limit: int = 20):
    agent = get_security_agent(facility_id)
    return {"events": agent.get_recent_events(limit)}

@router.get("/security/events-by-location")
def get_events_by_location(facility_id: int = 1):
    agent = get_security_agent(facility_id)
    return {"locations": agent.get_events_by_location()}

@router.get("/security/resolution-rate")
def get_resolution_rate(facility_id: int = 1):
    agent = get_security_agent(facility_id)
    return {"rates": agent.get_resolution_by_severity()}


# ---------- Cost Optimization ----------

@router.get("/cost/analytics")
def get_cost_analytics(facility_id: int = 1):
    agent = get_cost_agent(facility_id)
    return agent.get_analytics()

@router.get("/cost/distribution")
def get_cost_distribution(facility_id: int = 1):
    agent = get_cost_agent(facility_id)
    return {"categories": agent.get_cost_distribution()}

@router.get("/cost/trend")
def get_cost_trend(facility_id: int = 1):
    agent = get_cost_agent(facility_id)
    return {"trend": agent.get_cost_trend()}

@router.get("/cost/category-trend/{category}")
def get_category_trend(category: str, facility_id: int = 1):
    agent = get_cost_agent(facility_id)
    return {"trend": agent.get_category_trend(category)}

@router.get("/cost/health-score")
def get_facility_health_score(facility_id: int = 1):
    agent = get_cost_agent(facility_id)
    return agent.get_facility_health_score()

@router.get("/cost/recommendations")
def get_cost_recommendations(facility_id: int = 1):
    agent = get_cost_agent(facility_id)
    return {"recommendations": agent.get_recommendations()}

class CostEntryInput(BaseModel):
    category: str
    amount: float
    period: str
    description: str = ""

@router.post("/cost/entries")
def add_cost_entry(input: CostEntryInput, facility_id: int = 1):
    agent = get_cost_agent(facility_id)
    return agent.add_entry(input.category, input.amount, input.period, input.description)

@router.delete("/cost/entries/{entry_id}")
def delete_cost_entry(entry_id: int, facility_id: int = 1):
    agent = get_cost_agent(facility_id)
    return agent.delete_entry(entry_id)

@router.get("/cost/entries/recent")
def get_recent_cost_entries(facility_id: int = 1, limit: int = 20):
    agent = get_cost_agent(facility_id)
    return {"entries": agent.get_recent_entries(limit)}

@router.get("/cost/category-detail/{category}")
def get_category_detail(category: str, facility_id: int = 1):
    agent = get_cost_agent(facility_id)
    return agent.get_category_detail(category)


# ---------- Authentication ----------

class RegisterInput(BaseModel):
    username: str
    email: str
    password: str

class LoginInput(BaseModel):
    username: str
    password: str

@router.post("/auth/register")
def register(input: RegisterInput):
    session = SessionLocal()
    existing = session.query(User).filter(
        (User.username == input.username) | (User.email == input.email)
    ).first()
    if existing:
        session.close()
        raise HTTPException(status_code=400, detail="Username or email already exists")

    new_user = User(
        username=input.username,
        email=input.email,
        hashed_password=hash_password(input.password)
    )
    session.add(new_user)
    session.commit()
    user_id = new_user.user_id
    session.close()

    token = create_access_token(user_id, input.username)
    return {"token": token, "username": input.username}

@router.post("/auth/login")
def login(input: LoginInput):
    session = SessionLocal()
    user = session.query(User).filter(User.username == input.username).first()
    session.close()

    if not user or not verify_password(input.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    token = create_access_token(user.user_id, user.username)
    return {"token": token, "username": user.username}

@router.get("/auth/me")
def get_me(current_user: dict = Depends(get_current_user)):
    return current_user