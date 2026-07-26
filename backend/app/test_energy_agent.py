from app.agents.energy_agent import EnergyAgent

agent = EnergyAgent(facility_id=1)
agent.load_data()

print("=== ANALYTICS ===")
analytics = agent.get_analytics()
for key, value in analytics.items():
    print(f"{key}: {value}")

print("\n=== RECOMMENDATIONS ===")
for rec in agent.get_recommendations():
    print("-", rec)