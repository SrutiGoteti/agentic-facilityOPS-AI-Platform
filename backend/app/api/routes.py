from fastapi import APIRouter
from app.agents.energy_agent import EnergyAgent

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