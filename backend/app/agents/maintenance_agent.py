import pandas as pd
import joblib
from app.core.database import SessionLocal
from app.models.db_models import Asset, MaintenanceRecord


class MaintenanceAgent:
    def __init__(self, facility_id: int = 1):
        self.facility_id = facility_id
        self.df = None
        self.assets_df = None
        self.model = joblib.load("../ml_models/maintenance/failure_model.pkl")
        self.type_encoder = joblib.load("../ml_models/maintenance/type_encoder.pkl")

    def load_data(self):
        """Pull assets and their maintenance records for this facility."""
        session = SessionLocal()

        assets = session.query(Asset).filter(Asset.facility_id == self.facility_id).all()
        asset_ids = [a.asset_id for a in assets]

        records = (
            session.query(MaintenanceRecord)
            .filter(MaintenanceRecord.asset_id.in_(asset_ids))
            .all()
        )
        session.close()

        self.assets_df = pd.DataFrame([{
            "asset_id": a.asset_id,
            "asset_type": a.asset_type,
            "status": a.status
        } for a in assets])

        self.df = pd.DataFrame([{
            "record_id": r.record_id,
            "asset_id": r.asset_id,
            "product_type": r.product_type,
            "air_temperature": r.air_temperature,
            "process_temperature": r.process_temperature,
            "rotational_speed": r.rotational_speed,
            "torque": r.torque,
            "tool_wear": r.tool_wear,
            "machine_failure": r.machine_failure,
            "failure_type": r.failure_type
        } for r in records])

        return self.df

    def predict_failure_probability(self):
        """Run the trained model on every record to get failure probability."""
        if self.df is None:
            self.load_data()

        df = self.df.copy()
        df["Type_encoded"] = self.type_encoder.transform(df["product_type"])

        # Rename to match the exact column names the model was trained on
        model_input = df.rename(columns={
            "air_temperature": "Air temperature [K]",
            "process_temperature": "Process temperature [K]",
            "rotational_speed": "Rotational speed [rpm]",
            "torque": "Torque [Nm]",
            "tool_wear": "Tool wear [min]"
        })

        feature_cols = [
            "Type_encoded", "Air temperature [K]", "Process temperature [K]",
            "Rotational speed [rpm]", "Torque [Nm]", "Tool wear [min]"
        ]

        probabilities = self.model.predict_proba(model_input[feature_cols])[:, 1]
        df["failure_probability"] = probabilities

        self.df = df
        return df

    def get_asset_health_scores(self):
        """Aggregate failure probability per asset into a 0-100 health score."""
        df = self.predict_failure_probability()

        asset_scores = df.groupby("asset_id").agg(
            avg_failure_probability=("failure_probability", "mean"),
            max_failure_probability=("failure_probability", "max"),
            total_readings=("record_id", "count"),
            total_failures=("machine_failure", "sum")
        ).reset_index()

        # Health score: 100 = perfectly healthy, 0 = certain failure
        asset_scores["health_score"] = (
            100 - (asset_scores["avg_failure_probability"] * 70 + asset_scores["max_failure_probability"] * 30)
        ).round(1)

        asset_scores = asset_scores.merge(self.assets_df, on="asset_id")
        asset_scores = asset_scores.sort_values("health_score")

        return asset_scores.to_dict(orient="records")

    def get_maintenance_alerts(self, risk_threshold: float = 0.05, per_bucket: int = 10):
        """Flag specific readings where the model predicts elevated failure risk, spread across risk levels."""
        df = self.predict_failure_probability()
        high_risk = df[df["failure_probability"] >= risk_threshold].copy()
        high_risk = high_risk.merge(self.assets_df[["asset_id", "asset_type"]], on="asset_id")

        # Buckets matched to this model's actual (polarized) probability distribution
        critical = high_risk[high_risk["failure_probability"] >= 0.9].sort_values("failure_probability", ascending=False).head(per_bucket)
        elevated = high_risk[(high_risk["failure_probability"] >= risk_threshold) & (high_risk["failure_probability"] < 0.9)].sort_values("failure_probability", ascending=False).head(per_bucket)
        combined = pd.concat([critical, elevated]).sort_values("failure_probability", ascending=False)

        alerts = [{
            "asset_id": int(row["asset_id"]),
            "asset_type": row["asset_type"],
            "failure_probability": round(row["failure_probability"], 3),
            "tool_wear": row["tool_wear"],
            "torque": row["torque"],
            "rotational_speed": row["rotational_speed"]
        } for _, row in combined.iterrows()]

        return {
            "total_high_risk_readings": len(high_risk),
            "threshold_used": risk_threshold,
            "alerts": alerts
        }

    def get_recommendations(self):
        """Generate maintenance recommendations from health scores, alerts, and failure patterns."""
        health_scores = self.get_asset_health_scores()
        alerts = self.get_maintenance_alerts()
        df = self.predict_failure_probability()

        recommendations = []

        # Rule 1: low health score assets — inspection needed
        for asset in health_scores:
            if asset["health_score"] < 60:
                recommendations.append(
                    f"{asset['asset_type']} (Asset {asset['asset_id']}) has a low health score "
                    f"({asset['health_score']}/100) — schedule an inspection soon."
                )

        # Rule 2: most urgent single reading
        if alerts["total_high_risk_readings"] > 0:
            top = alerts["alerts"][0]
            recommendations.append(
                f"{alerts['total_high_risk_readings']} readings show high failure risk (>{int(alerts['threshold_used']*100)}%). "
                f"Most urgent: {top['asset_type']} (Asset {top['asset_id']}) at "
                f"{round(top['failure_probability']*100, 1)}% predicted failure probability."
            )

        # Rule 3: dominant failure type per low-scoring asset — what to actually inspect
        for asset in health_scores:
            if asset["health_score"] < 70:
                asset_failures = df[(df["asset_id"] == asset["asset_id"]) & (df["failure_type"].notna())]
                if len(asset_failures) > 0:
                    top_failure_type = asset_failures["failure_type"].value_counts().idxmax()
                    top_failure_count = asset_failures["failure_type"].value_counts().max()
                    pct_of_failures = round(top_failure_count / len(asset_failures) * 100, 1)
                    recommendations.append(
                        f"{asset['asset_type']} (Asset {asset['asset_id']})'s failures are predominantly "
                        f"{top_failure_type} ({pct_of_failures}% of its logged failures) — inspection should "
                        f"focus on the components tied to this failure mode rather than a general checkup."
                    )

        # Rule 4: fleet-wide dominant failure type — systemic pattern across all assets
        all_failures = df[df["failure_type"].notna()]
        if len(all_failures) > 0:
            fleet_top_type = all_failures["failure_type"].value_counts().idxmax()
            fleet_top_count = all_failures["failure_type"].value_counts().max()
            fleet_pct = round(fleet_top_count / len(all_failures) * 100, 1)
            if fleet_pct > 40:
                affected_assets = all_failures[all_failures["failure_type"] == fleet_top_type]["asset_id"].nunique()
                recommendations.append(
                    f"{fleet_top_type} accounts for {fleet_pct}% of all logged failures fleet-wide, "
                    f"affecting {affected_assets} asset(s) — this may indicate a systemic issue "
                    f"(e.g. a shared operating condition or maintenance gap) rather than isolated equipment faults."
                )

        # Rule 5: assets with no failures at all — explicitly reassure, not just silence
        healthy_assets = [a for a in health_scores if a["total_failures"] == 0]
        if healthy_assets:
            names = ", ".join(f"{a['asset_type']} (Asset {a['asset_id']})" for a in healthy_assets)
            recommendations.append(f"No logged failures for: {names} — no action needed currently.")

        if not recommendations:
            recommendations.append("All assets currently show healthy status — no immediate action needed.")

        return recommendations

    def predict_single_reading(self, product_type: str, air_temperature: float, process_temperature: float,
                                 rotational_speed: float, torque: float, tool_wear: float):
        """Predict failure probability for a single simulated sensor reading."""
        type_encoded = self.type_encoder.transform([product_type])[0]
        X = pd.DataFrame([{
            "Type_encoded": type_encoded,
            "Air temperature [K]": air_temperature,
            "Process temperature [K]": process_temperature,
            "Rotational speed [rpm]": rotational_speed,
            "Torque [Nm]": torque,
            "Tool wear [min]": tool_wear
        }])
        probability = self.model.predict_proba(X)[:, 1][0]
        return {"failure_probability": round(float(probability), 3)}

    def get_asset_detail(self, asset_id: int):
        """Full diagnostic detail for a single asset."""
        df = self.predict_failure_probability()
        asset_df = df[df["asset_id"] == asset_id]
        asset_info = self.assets_df[self.assets_df["asset_id"] == asset_id].iloc[0]

        failure_type_counts = asset_df[asset_df["failure_type"].notna()]["failure_type"].value_counts().to_dict()

        high_risk = asset_df[asset_df["failure_probability"] >= 0.5].sort_values(
            "failure_probability", ascending=False
        ).head(10)

        return {
            "asset_id": int(asset_id),
            "asset_type": asset_info["asset_type"],
            "status": asset_info["status"],
            "total_readings": len(asset_df),
            "total_failures": int(asset_df["machine_failure"].sum()),
            "avg_failure_probability": round(asset_df["failure_probability"].mean(), 3),
            "max_failure_probability": round(asset_df["failure_probability"].max(), 3),
            "health_score": round((1 - asset_df["failure_probability"].mean()) * 70 +
                                    (1 - asset_df["failure_probability"].max()) * 30 + 0, 1),
            "avg_torque": round(asset_df["torque"].mean(), 2),
            "avg_tool_wear": round(asset_df["tool_wear"].mean(), 2),
            "avg_rotational_speed": round(asset_df["rotational_speed"].mean(), 2),
            "failure_type_breakdown": failure_type_counts,
            "top_risky_readings": [{
                "failure_probability": round(row["failure_probability"], 3),
                "torque": row["torque"],
                "tool_wear": row["tool_wear"],
                "rotational_speed": row["rotational_speed"]
            } for _, row in high_risk.iterrows()]
        }

    def add_record(self, asset_id, product_id, product_type, air_temperature, process_temperature,
                    rotational_speed, torque, tool_wear, machine_failure, failure_type):
        """Insert a new maintenance record."""
        session = SessionLocal()
        new_record = MaintenanceRecord(
            asset_id=asset_id,
            product_id=product_id,
            product_type=product_type,
            air_temperature=air_temperature,
            process_temperature=process_temperature,
            rotational_speed=rotational_speed,
            torque=torque,
            tool_wear=tool_wear,
            machine_failure=machine_failure,
            failure_type=failure_type
        )
        session.add(new_record)
        session.commit()
        record_id = new_record.record_id
        session.close()
        self.df = None
        return {"record_id": record_id, "message": "Record added"}

    def delete_record(self, record_id: int):
        """Delete a maintenance record by record_id."""
        session = SessionLocal()
        record = session.query(MaintenanceRecord).filter(MaintenanceRecord.record_id == record_id).first()
        if not record:
            session.close()
            return {"error": "Record not found"}
        session.delete(record)
        session.commit()
        session.close()
        self.df = None
        return {"message": "Record deleted"}

    def get_recent_records(self, limit: int = 20):
        """List the most recent maintenance records, for the delete UI."""
        session = SessionLocal()
        asset_ids = [a.asset_id for a in
                     session.query(Asset).filter(Asset.facility_id == self.facility_id).all()]
        records = (
            session.query(MaintenanceRecord)
            .filter(MaintenanceRecord.asset_id.in_(asset_ids))
            .order_by(MaintenanceRecord.record_id.desc())
            .limit(limit)
            .all()
        )
        session.close()
        return [{
            "record_id": r.record_id,
            "asset_id": r.asset_id,
            "product_type": r.product_type,
            "torque": r.torque,
            "tool_wear": r.tool_wear,
            "rotational_speed": r.rotational_speed,
            "machine_failure": r.machine_failure
        } for r in records]

    def get_asset_list(self):
        """List assets for this facility, for the add-record dropdown."""
        session = SessionLocal()
        assets = session.query(Asset).filter(Asset.facility_id == self.facility_id).all()
        session.close()
        return [{"asset_id": a.asset_id, "asset_type": a.asset_type} for a in assets]