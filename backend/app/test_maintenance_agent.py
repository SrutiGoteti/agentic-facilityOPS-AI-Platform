from app.agents.maintenance_agent import MaintenanceAgent
agent = MaintenanceAgent(facility_id=1)
df = agent.predict_failure_probability()
print(df["failure_probability"].describe())
print(df[df["failure_probability"] > 0.01]["failure_probability"].value_counts().head(20))