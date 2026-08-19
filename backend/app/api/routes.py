from fastapi import APIRouter
from app.agents.energy_agent import EnergyAgent
from app.agents.maintenance_agent import MaintenanceAgent

router = APIRouter()

@router.get("/energy/analytics")
def get_energy_analytics(facility_id: int = 1):
    agent = EnergyAgent(facility_id=facility_id)
    agent.load_data()
    return agent.get_analytics()

@router.get("/energy/recommendations")
def get_energy_recommendations(facility_id: int = 1):
    agent = EnergyAgent(facility_id=facility_id)
    agent.load_data()
    return {"recommendations": agent.get_recommendations()}

@router.get("/energy/temperature-correlation")
def get_temperature_correlation(facility_id: int = 1):
    agent = EnergyAgent(facility_id=facility_id)
    agent.load_data()
    return agent.get_temperature_correlation()

@router.get("/energy/day-of-week")
def get_day_of_week_breakdown(facility_id: int = 1):
    agent = EnergyAgent(facility_id=facility_id)
    agent.load_data()
    return agent.get_day_of_week_breakdown()

@router.get("/energy/anomalies")
def get_anomalies(facility_id: int = 1, threshold: float = 2.0):
    agent = EnergyAgent(facility_id=facility_id)
    agent.load_data()
    return agent.get_anomalies(threshold=threshold)

@router.get("/maintenance/health-scores")
def get_maintenance_health_scores(facility_id: int = 1):
    agent = MaintenanceAgent(facility_id=facility_id)
    return agent.get_asset_health_scores()

@router.get("/maintenance/alerts")
def get_maintenance_alerts_route(facility_id: int = 1, threshold: float = 0.05):
    agent = MaintenanceAgent(facility_id=facility_id)
    return agent.get_maintenance_alerts(risk_threshold=threshold)

@router.get("/maintenance/recommendations")
def get_maintenance_recommendations(facility_id: int = 1):
    agent = MaintenanceAgent(facility_id=facility_id)
    return {"recommendations": agent.get_recommendations()}

@router.get("/energy/monthly-trend")
def get_monthly_trend(facility_id: int = 1):
    agent = EnergyAgent(facility_id=facility_id)
    agent.load_data()
    return {"monthly_trend": agent.get_monthly_trend()}

from pydantic import BaseModel

class EnergySimInput(BaseModel):
    hour: int
    outdoor_temp: float
    occupancy: float
    is_weekend: bool

@router.post("/energy/simulate")
def simulate_energy(input: EnergySimInput, facility_id: int = 1):
    agent = EnergyAgent(facility_id=facility_id)
    return agent.predict_consumption(input.hour, input.outdoor_temp, input.occupancy, input.is_weekend)

class MaintenanceSimInput(BaseModel):
    product_type: str
    air_temperature: float
    process_temperature: float
    rotational_speed: float
    torque: float
    tool_wear: float

@router.post("/maintenance/simulate")
def simulate_maintenance(input: MaintenanceSimInput, facility_id: int = 1):
    agent = MaintenanceAgent(facility_id=facility_id)
    return agent.predict_single_reading(
        input.product_type, input.air_temperature, input.process_temperature,
        input.rotational_speed, input.torque, input.tool_wear
    )

@router.get("/maintenance/asset/{asset_id}")
def get_asset_detail(asset_id: int, facility_id: int = 1):
    agent = MaintenanceAgent(facility_id=facility_id)
    return agent.get_asset_detail(asset_id)

@router.get("/energy/anomaly-detail")
def get_anomaly_detail(timestamp: str, facility_id: int = 1):
    agent = EnergyAgent(facility_id=facility_id)
    agent.load_data()
    return agent.get_anomaly_detail(timestamp)

from datetime import datetime

class EnergyReadingInput(BaseModel):
    timestamp: str
    power_consumption: float
    outdoor_temp: float
    occupancy: float

@router.post("/energy/readings")
def add_energy_reading(input: EnergyReadingInput, facility_id: int = 1):
    agent = EnergyAgent(facility_id=facility_id)
    return agent.add_reading(
        datetime.fromisoformat(input.timestamp),
        input.power_consumption, input.outdoor_temp, input.occupancy
    )

@router.delete("/energy/readings/{record_id}")
def delete_energy_reading(record_id: int, facility_id: int = 1):
    agent = EnergyAgent(facility_id=facility_id)
    return agent.delete_reading(record_id)

@router.get("/energy/readings/recent")
def get_recent_energy_readings(facility_id: int = 1, limit: int = 20):
    agent = EnergyAgent(facility_id=facility_id)
    return {"readings": agent.get_recent_readings(limit)}

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
    agent = MaintenanceAgent(facility_id=facility_id)
    return agent.add_record(
        input.asset_id, input.product_id, input.product_type, input.air_temperature,
        input.process_temperature, input.rotational_speed, input.torque, input.tool_wear,
        input.machine_failure, input.failure_type
    )

@router.delete("/maintenance/records/{record_id}")
def delete_maintenance_record(record_id: int, facility_id: int = 1):
    agent = MaintenanceAgent(facility_id=facility_id)
    return agent.delete_record(record_id)

@router.get("/maintenance/records/recent")
def get_recent_maintenance_records(facility_id: int = 1, limit: int = 20):
    agent = MaintenanceAgent(facility_id=facility_id)
    return {"records": agent.get_recent_records(limit)}

@router.get("/maintenance/assets")
def get_asset_list(facility_id: int = 1):
    agent = MaintenanceAgent(facility_id=facility_id)
    return {"assets": agent.get_asset_list()}