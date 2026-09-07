from app.agents.cost_agent import CostOptimizationAgent

agent = CostOptimizationAgent(facility_id=1)
print("=== ANALYTICS ===")
print(agent.get_analytics())
print("\n=== DISTRIBUTION ===")
print(agent.get_cost_distribution())
print("\n=== HEALTH SCORE ===")
print(agent.get_facility_health_score())
print("\n=== RECOMMENDATIONS ===")
for r in agent.get_recommendations():
    print("-", r)