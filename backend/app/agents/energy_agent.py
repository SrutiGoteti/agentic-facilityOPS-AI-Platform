import pandas as pd
from app.core.database import SessionLocal
from app.models.db_models import EnergyUsage
import joblib


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
        """Generate rule-based efficiency recommendations from all available analytics."""
        if self.df is None:
            self.load_data()

        recommendations = []
        analytics = self.get_analytics()

        # Rule 1: weekend vs weekday
        weekday_avg = analytics["avg_weekday_vs_weekend"].get(False, 0)
        weekend_avg = analytics["avg_weekday_vs_weekend"].get(True, 0)
        if weekend_avg >= weekday_avg * 0.8:
            recommendations.append(
                f"Weekend consumption ({weekend_avg} avg) is close to weekday levels "
                f"({weekday_avg} avg) despite likely lower occupancy — check for equipment "
                f"left running unnecessarily on weekends."
            )

        # Rule 2: peak hour
        avg_by_hour = analytics["avg_by_hour"]
        peak_hour = max(avg_by_hour, key=avg_by_hour.get)
        recommendations.append(
            f"Consumption peaks around {peak_hour}:00 — consider load-shifting "
            f"non-essential equipment away from this hour."
        )

        # Rule 3: zero-occupancy waste
        low_occ_high_energy = self.df[(self.df["occupancy"] == 0) &
                                        (self.df["power_consumption"] > self.df["power_consumption"].mean())]
        if len(low_occ_high_energy) > 0:
            pct = round(len(low_occ_high_energy) / len(self.df) * 100, 1)
            recommendations.append(
                f"{pct}% of readings show above-average consumption during zero-occupancy "
                f"periods — possible equipment left on unnecessarily."
            )

        # Rule 4: temperature-driven load
        temp_corr = self.get_temperature_correlation()
        r = temp_corr["correlation_coefficient"]
        if r > 0.4:
            recommendations.append(
                f"Consumption correlates strongly with outdoor temperature (r={r}), "
                f"suggesting cooling (AC) load is a major driver — consider raising "
                f"thermostat setpoints slightly or improving insulation/shading on warmer days."
            )
        elif r < -0.4:
            recommendations.append(
                f"Consumption correlates strongly and inversely with outdoor temperature "
                f"(r={r}), suggesting heating load is a major driver — check for heat loss "
                f"or inefficient heating schedules on colder days."
            )

        # Rule 5: worst day of week
        day_data = self.get_day_of_week_breakdown()["avg_by_day_of_week"]
        valid_days = {k: v for k, v in day_data.items() if v is not None}
        if valid_days:
            worst_day = max(valid_days, key=valid_days.get)
            best_day = min(valid_days, key=valid_days.get)
            if valid_days[worst_day] > valid_days[best_day] * 1.15:
                recommendations.append(
                    f"{worst_day} shows the highest average consumption ({valid_days[worst_day]} kWh) "
                    f"compared to {best_day}, the lowest ({valid_days[best_day]} kWh) — worth checking "
                    f"if equipment schedules on {worst_day} match actual building needs."
                )

        # Rule 6: anomaly frequency
        anomaly_data = self.get_anomalies()
        total_anomalies = anomaly_data["total_anomalies"]
        pct_anomalies = round(total_anomalies / len(self.df) * 100, 2)
        spike_count = sum(1 for a in anomaly_data["anomalies"] if a["type"] == "spike")
        if total_anomalies > 0:
            recommendations.append(
                f"{total_anomalies} readings ({pct_anomalies}% of data) were flagged as statistical "
                f"anomalies, including {spike_count} unusual spikes in the top 20 — investigate these "
                f"specific timestamps for equipment malfunction or one-off events."
            )

        if not recommendations:
            recommendations.append("No major inefficiencies detected in current data.")

        return recommendations

    def get_temperature_correlation(self):
        """Measure how strongly consumption tracks outdoor temperature."""
        if self.df is None:
            self.load_data()

        correlation = self.df["power_consumption"].corr(self.df["outdoor_temp"])

        # Bin temperature into ranges to show avg consumption per range
        temp_bins = pd.cut(self.df["outdoor_temp"], bins=[-10, 0, 10, 20, 30, 45],
                            labels=["<0°C", "0-10°C", "10-20°C", "20-30°C", "30°C+"])
        avg_by_temp_range = self.df.groupby(temp_bins, observed=True)["power_consumption"].mean().round(2).to_dict()

        return {
            "correlation_coefficient": round(correlation, 3),
            "avg_consumption_by_temp_range": avg_by_temp_range,
            "scatter_data": self.df[["outdoor_temp", "power_consumption"]].sample(
                min(500, len(self.df)), random_state=42
            ).to_dict(orient="records")
        }

    def get_day_of_week_breakdown(self):
        """Average consumption per day of the week."""
        if self.df is None:
            self.load_data()

        day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        avg_by_day = self.df.groupby("day_of_week")["power_consumption"].mean().round(2)
        avg_by_day = avg_by_day.reindex(day_order).to_dict()

        return {"avg_by_day_of_week": avg_by_day}

    def get_anomalies(self, threshold: float = 2.0, limit_per_type: int = 15):
        """Flag readings that deviate significantly from the mean (z-score method)."""
        if self.df is None:
            self.load_data()

        mean = self.df["power_consumption"].mean()
        std = self.df["power_consumption"].std()
        self.df["z_score"] = (self.df["power_consumption"] - mean) / std

        anomalies = self.df[self.df["z_score"].abs() > threshold].copy()

        spikes = anomalies[anomalies["z_score"] > 0].sort_values("z_score", ascending=False).head(limit_per_type)
        drops = anomalies[anomalies["z_score"] < 0].sort_values("z_score", ascending=True).head(limit_per_type)
        combined = pd.concat([spikes, drops]).sort_values("timestamp")

        anomaly_list = [{
            "timestamp": str(row["timestamp"]),
            "power_consumption": round(row["power_consumption"], 2),
            "z_score": round(row["z_score"], 2),
            "type": "spike" if row["z_score"] > 0 else "drop"
        } for _, row in combined.iterrows()]

        return {
            "total_anomalies": len(anomalies),
            "threshold_used": threshold,
            "anomalies": anomaly_list
        }

    def get_monthly_trend(self):
        """Average consumption and outdoor temperature per month, for trend overlay."""
        if self.df is None:
            self.load_data()

        df = self.df.copy()
        df["month"] = df["timestamp"].dt.strftime("%b")
        df["month_num"] = df["timestamp"].dt.month

        monthly = df.groupby(["month_num", "month"]).agg(
            avg_consumption=("power_consumption", "mean"),
            avg_temp=("outdoor_temp", "mean")
        ).reset_index().sort_values("month_num")

        monthly["avg_consumption"] = monthly["avg_consumption"].round(2)
        monthly["avg_temp"] = monthly["avg_temp"].round(2)

        return monthly[["month", "avg_consumption", "avg_temp"]].to_dict(orient="records")

    def predict_consumption(self, hour: int, outdoor_temp: float, occupancy: float, is_weekend: bool):
        """Predict expected power consumption for a simulated set of conditions."""
        model = joblib.load("../ml_models/energy/consumption_model.pkl")
        X = pd.DataFrame([{
            "hour": hour,
            "outdoor_temp": outdoor_temp,
            "occupancy": occupancy,
            "is_weekend": int(is_weekend)
        }])
        prediction = model.predict(X)[0]
        return {"predicted_consumption": round(float(prediction), 2)}

    def get_anomaly_detail(self, timestamp: str):
        """Full context for a single flagged anomaly reading."""
        if self.df is None:
            self.load_data()

        target_time = pd.to_datetime(timestamp)
        target_row = self.df[self.df["timestamp"] == target_time]

        if target_row.empty:
            return {"error": "Reading not found"}

        target_row = target_row.iloc[0]
        mean = self.df["power_consumption"].mean()
        std = self.df["power_consumption"].std()
        z_score = (target_row["power_consumption"] - mean) / std

        # Get surrounding readings (2 hours before/after) for context
        window_start = target_time - pd.Timedelta(hours=2)
        window_end = target_time + pd.Timedelta(hours=2)
        context = self.df[(self.df["timestamp"] >= window_start) & (self.df["timestamp"] <= window_end)].copy()
        context = context.sort_values("timestamp")

        return {
            "timestamp": str(target_time),
            "power_consumption": round(target_row["power_consumption"], 2),
            "outdoor_temp": round(target_row["outdoor_temp"], 2),
            "occupancy": target_row["occupancy"],
            "hour": int(target_row["hour"]),
            "day_of_week": target_row["day_of_week"],
            "z_score": round(z_score, 2),
            "type": "spike" if z_score > 0 else "drop",
            "deviation_from_mean_pct": round(((target_row["power_consumption"] - mean) / mean) * 100, 1),
            "context_readings": [{
                "timestamp": str(row["timestamp"]),
                "power_consumption": round(row["power_consumption"], 2),
                "is_target": row["timestamp"] == target_time
            } for _, row in context.iterrows()]
        }

    def add_reading(self, timestamp, power_consumption, outdoor_temp, occupancy):
        """Insert a new real reading into energy_usage."""
        session = SessionLocal()
        new_record = EnergyUsage(
            facility_id=self.facility_id,
            timestamp=timestamp,
            power_consumption=power_consumption,
            outdoor_temp=outdoor_temp,
            occupancy=occupancy
        )
        session.add(new_record)
        session.commit()
        record_id = new_record.record_id
        session.close()
        self.df = None  # force reload on next analytics call
        return {"record_id": record_id, "message": "Reading added"}

    def delete_reading(self, record_id: int):
        """Delete a reading from energy_usage by record_id."""
        session = SessionLocal()
        record = session.query(EnergyUsage).filter(
            EnergyUsage.record_id == record_id,
            EnergyUsage.facility_id == self.facility_id
        ).first()
        if not record:
            session.close()
            return {"error": "Record not found"}
        session.delete(record)
        session.commit()
        session.close()
        self.df = None
        return {"message": "Reading deleted"}

    def get_recent_readings(self, limit: int = 20):
        """List the most recent readings, for the delete UI."""
        if self.df is None:
            self.load_data()
        session = SessionLocal()
        records = (
            session.query(EnergyUsage)
            .filter(EnergyUsage.facility_id == self.facility_id)
            .order_by(EnergyUsage.timestamp.desc())
            .limit(limit)
            .all()
        )
        session.close()
        return [{
            "record_id": r.record_id,
            "timestamp": str(r.timestamp),
            "power_consumption": r.power_consumption,
            "outdoor_temp": r.outdoor_temp,
            "occupancy": r.occupancy
        } for r in records]