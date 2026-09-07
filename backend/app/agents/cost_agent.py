import pandas as pd
from app.core.database import SessionLocal
from app.models.db_models import CostEntry
from app.agents.energy_agent import EnergyAgent
from app.agents.maintenance_agent import MaintenanceAgent
from app.agents.occupancy_agent import OccupancyAgent
from app.agents.security_agent import SecurityAgent


class CostOptimizationAgent:
    def __init__(self, facility_id: int = 1):
        self.facility_id = facility_id
        self.df = None

    def load_data(self):
        session = SessionLocal()
        entries = session.query(CostEntry).filter(CostEntry.facility_id == self.facility_id).all()
        session.close()

        self.df = pd.DataFrame([{
            "entry_id": e.entry_id,
            "category": e.category,
            "amount": e.amount,
            "period": e.period,
            "description": e.description
        } for e in entries])

        return self.df

    def get_analytics(self):
        if self.df is None:
            self.load_data()

        total_cost = self.df["amount"].sum()
        periods = sorted(self.df["period"].unique())

        # Cost reduction: compare first half vs second half of the period range
        midpoint = len(periods) // 2
        first_half_periods = periods[:midpoint]
        second_half_periods = periods[midpoint:]
        first_half_total = self.df[self.df["period"].isin(first_half_periods)]["amount"].sum()
        second_half_total = self.df[self.df["period"].isin(second_half_periods)]["amount"].sum()
        cost_change_pct = round(((second_half_total - first_half_total) / first_half_total) * 100, 1) if first_half_total > 0 else 0

        return {
            "total_cost": round(total_cost, 2),
            "cost_change_pct": cost_change_pct,
            "total_periods": len(periods),
            "avg_monthly_cost": round(total_cost / len(periods), 2) if periods else 0,
        }

    def get_cost_distribution(self):
        if self.df is None:
            self.load_data()
        totals = self.df.groupby("category")["amount"].sum()
        overall = totals.sum()
        return [{
            "category": cat.capitalize(),
            "amount": round(amt, 2),
            "pct": round(amt / overall * 100, 1)
        } for cat, amt in totals.items()]

    def get_cost_trend(self):
        if self.df is None:
            self.load_data()
        trend = self.df.groupby("period")["amount"].sum().sort_index()
        return [{"period": p, "amount": round(a, 2)} for p, a in trend.items()]

    def get_category_trend(self, category: str):
        """Monthly trend for a single category, for the click-to-detail modal."""
        if self.df is None:
            self.load_data()
        cat_df = self.df[self.df["category"] == category.lower()].sort_values("period")
        return [{"period": row["period"], "amount": round(row["amount"], 2)} for _, row in cat_df.iterrows()]

    def get_facility_health_score(self):
        """Composite health score pulling from all four other agents."""
        energy = EnergyAgent(facility_id=self.facility_id)
        maintenance = MaintenanceAgent(facility_id=self.facility_id)
        occupancy = OccupancyAgent(facility_id=self.facility_id)
        security = SecurityAgent(facility_id=self.facility_id)

        # Energy score: penalize high anomaly rate
        e_analytics = energy.get_analytics()
        energy.load_data()
        e_anomalies = energy.get_anomalies()
        energy_score = max(0, 100 - (e_anomalies["total_anomalies"] / len(energy.df) * 100 * 3))

        # Maintenance score: average of all asset health scores
        m_scores = maintenance.get_asset_health_scores()
        maintenance_score = sum(a["health_score"] for a in m_scores) / len(m_scores) if m_scores else 100

        # Occupancy score: penalize overcrowding events relative to total readings
        occupancy.load_data()
        o_analytics = occupancy.get_analytics()
        total_occ_readings = len(occupancy.df)
        occupancy_score = max(0, 100 - (o_analytics["total_overcrowding_events"] / total_occ_readings * 100 * 5))

        # Security score: penalize high-severity ratio and unresolved events
        security.load_data()
        s_analytics = security.get_analytics()
        high_pct = (s_analytics["severity_breakdown"].get("high", 0) / s_analytics["total_events"] * 100) if s_analytics["total_events"] else 0
        unresolved_pct = (s_analytics["unresolved_count"] / s_analytics["total_events"] * 100) if s_analytics["total_events"] else 0
        security_score = max(0, 100 - high_pct * 0.8 - unresolved_pct * 0.4)

        composite = round((energy_score + maintenance_score + occupancy_score + security_score) / 4, 1)

        return {
            "composite_score": composite,
            "breakdown": {
                "energy": round(energy_score, 1),
                "maintenance": round(maintenance_score, 1),
                "occupancy": round(occupancy_score, 1),
                "security": round(security_score, 1),
            }
        }

    def get_recommendations(self):
        if self.df is None:
            self.load_data()

        recommendations = []
        distribution = self.get_cost_distribution()
        trend = self.get_cost_trend()

        # Rule 1: dominant cost category
        top_category = max(distribution, key=lambda c: c["pct"])
        if top_category["pct"] > 35:
            recommendations.append(
                f"{top_category['category']} accounts for {top_category['pct']}% of total operational cost "
                f"(₹{top_category['amount']:,.0f}) — this is the largest cost driver and the best candidate "
                f"for optimization efforts."
            )

        # Rule 2: rising cost trend
        if len(trend) >= 2:
            recent_change = round(((trend[-1]["amount"] - trend[-2]["amount"]) / trend[-2]["amount"]) * 100, 1) if trend[-2]["amount"] > 0 else 0
            if recent_change > 20:
                recommendations.append(
                    f"Total cost rose {recent_change}% from {trend[-2]['period']} to {trend[-1]['period']} — "
                    f"investigate the cause before it becomes a recurring pattern."
                )

        # Rule 3: facility health composite
        health = self.get_facility_health_score()
        weakest = min(health["breakdown"], key=health["breakdown"].get)
        if health["breakdown"][weakest] < 70:
            recommendations.append(
                f"{weakest.capitalize()} has the lowest health score among all modules "
                f"({health['breakdown'][weakest]}/100) — prioritize attention here for the greatest "
                f"overall facility improvement."
            )

        if not recommendations:
            recommendations.append("Cost patterns and facility health are currently within acceptable ranges.")

        return recommendations

    def add_entry(self, category: str, amount: float, period: str, description: str = ""):
        session = SessionLocal()
        new_entry = CostEntry(facility_id=self.facility_id, category=category, amount=amount, period=period, description=description)
        session.add(new_entry)
        session.commit()
        entry_id = new_entry.entry_id
        session.close()
        self.df = None
        return {"entry_id": entry_id, "message": "Cost entry added"}

    def delete_entry(self, entry_id: int):
        session = SessionLocal()
        entry = session.query(CostEntry).filter(CostEntry.entry_id == entry_id).first()
        if not entry:
            session.close()
            return {"error": "Entry not found"}
        session.delete(entry)
        session.commit()
        session.close()
        self.df = None
        return {"message": "Entry deleted"}

    def get_recent_entries(self, limit: int = 20):
        session = SessionLocal()
        entries = (
            session.query(CostEntry)
            .filter(CostEntry.facility_id == self.facility_id)
            .order_by(CostEntry.entry_id.desc())
            .limit(limit)
            .all()
        )
        session.close()
        return [{
            "entry_id": e.entry_id, "category": e.category, "amount": e.amount,
            "period": e.period, "description": e.description
        } for e in entries]

    def get_category_detail(self, category: str):
        """Full detail for one cost category, for the click-to-detail modal."""
        if self.df is None:
            self.load_data()

        cat_df = self.df[self.df["category"] == category.lower()].sort_values("period")
        if len(cat_df) == 0:
            return {"error": "No data for this category"}

        total = cat_df["amount"].sum()
        avg_monthly = cat_df["amount"].mean()
        highest = cat_df.loc[cat_df["amount"].idxmax()]
        lowest = cat_df.loc[cat_df["amount"].idxmin()]
        overall_total = self.df["amount"].sum()

        return {
            "category": category.capitalize(),
            "total": round(total, 2),
            "avg_monthly": round(avg_monthly, 2),
            "pct_of_total": round(total / overall_total * 100, 1),
            "highest_month": {"period": highest["period"], "amount": round(highest["amount"], 2)},
            "lowest_month": {"period": lowest["period"], "amount": round(lowest["amount"], 2)},
            "entry_count": len(cat_df),
            "trend": [{"period": row["period"], "amount": round(row["amount"], 2)} for _, row in cat_df.iterrows()]
        }