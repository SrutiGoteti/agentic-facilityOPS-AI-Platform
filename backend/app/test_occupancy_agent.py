from app.agents.occupancy_agent import OccupancyAgent

agent = OccupancyAgent(facility_id=1)

print("=== ANALYTICS ===")
print(agent.get_analytics())

print("\n=== HEATMAP ===")
for r in agent.get_room_heatmap():
    print(r)

print("\n=== OVERCROWDING EVENTS (top 5) ===")
events = agent.get_overcrowding_events()
print("Total:", events["total_events"])
for e in events["events"][:5]:
    print(e)

print("\n=== RECOMMENDATIONS ===")
for rec in agent.get_recommendations():
    print("-", rec)