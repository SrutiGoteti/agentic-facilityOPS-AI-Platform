import pandas as pd
from app.core.database import SessionLocal
from app.models.db_models import EnergyUsage


class EnergyAgent:
    def __init__(self, facility_id: int = 1):
        self.facility_id = facility_id
        self.df = None

    def load_data(self):
        """Pull energy_usage rows for this facility from the database into a DataFrame."""
        session = SessionLocal()
        records = (
            session.query(EnergyUsage)
            .filter(EnergyUsage.facility_id == self.facility_id)
            .all()
        )
        session.close()

        data = [{
            "timestamp": r.timestamp,
            "power_consumption": r.power_consumption,
            "outdoor_temp": r.outdoor_temp,
            "occupancy": r.occupancy
        } for r in records]

        self.df = pd.DataFrame(data)
        self.df["hour"] = self.df["timestamp"].dt.hour
        self.df["day_of_week"] = self.df["timestamp"].dt.day_name()
        self.df["is_weekend"] = self.df["timestamp"].dt.dayofweek >= 5
        return self.df

    def get_analytics(self):
        """Compute key consumption analytics."""
        if self.df is None:
            self.load_data()

        analytics = {
            "average_consumption": round(self.df["power_consumption"].mean(), 2),
            "peak_consumption": round(self.df["power_consumption"].max(), 2),
            "peak_timestamp": str(self.df.loc[self.df["power_consumption"].idxmax(), "timestamp"]),
            "lowest_consumption": round(self.df["power_consumption"].min(), 2),
            "avg_by_hour": self.df.groupby("hour")["power_consumption"].mean().round(2).to_dict(),
            "avg_weekday_vs_weekend": self.df.groupby("is_weekend")["power_consumption"].mean().round(2).to_dict(),
        }
        return analytics

    def get_recommendations(self):
        """Generate simple rule-based efficiency recommendations."""
        if self.df is None:
            self.load_data()

        recommendations = []
        analytics = self.get_analytics()

        # Rule 1: check if weekend usage is close to or higher than weekday usage
        weekday_avg = analytics["avg_weekday_vs_weekend"].get(False, 0)
        weekend_avg = analytics["avg_weekday_vs_weekend"].get(True, 0)
        if weekend_avg >= weekday_avg * 0.8:
            recommendations.append(
                f"Weekend consumption ({weekend_avg} avg) is close to weekday levels "
                f"({weekday_avg} avg) despite likely lower occupancy — check for equipment "
                f"left running unnecessarily on weekends."
            )

        # Rule 2: flag the peak usage hour
        avg_by_hour = analytics["avg_by_hour"]
        peak_hour = max(avg_by_hour, key=avg_by_hour.get)
        recommendations.append(
            f"Consumption peaks around {peak_hour}:00 — consider load-shifting "
            f"non-essential equipment away from this hour."
        )

        # Rule 3: flag low-occupancy but high-consumption periods
        low_occ_high_energy = self.df[(self.df["occupancy"] == 0) & 
                                        (self.df["power_consumption"] > self.df["power_consumption"].mean())]
        if len(low_occ_high_energy) > 0:
            pct = round(len(low_occ_high_energy) / len(self.df) * 100, 1)
            recommendations.append(
                f"{pct}% of readings show above-average consumption during zero-occupancy "
                f"periods — possible equipment left on unnecessarily."
            )

        if not recommendations:
            recommendations.append("No major inefficiencies detected in current data.")

        return recommendations