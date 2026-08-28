import pandas as pd
from app.core.database import SessionLocal
from app.models.db_models import SecurityEvent


class SecurityAgent:
    def __init__(self, facility_id: int = 1):
        self.facility_id = facility_id
        self.df = None

    def load_data(self):
        session = SessionLocal()
        events = session.query(SecurityEvent).filter(SecurityEvent.facility_id == self.facility_id).all()
        session.close()

        self.df = pd.DataFrame([{
            "event_id": e.event_id,
            "timestamp": e.timestamp,
            "location": e.location,
            "event_type": e.event_type,
            "severity": e.severity,
            "resolved": e.resolved
        } for e in events])

        self.df["hour"] = pd.to_datetime(self.df["timestamp"]).dt.hour
        self.df["day_of_week"] = pd.to_datetime(self.df["timestamp"]).dt.day_name()
        self.df["is_weekend"] = pd.to_datetime(self.df["timestamp"]).dt.dayofweek >= 5
        self.df["is_after_hours"] = self.df["is_weekend"] | (self.df["hour"] < 8) | (self.df["hour"] > 18)

        return self.df

    def get_analytics(self):
        if self.df is None:
            self.load_data()

        return {
            "total_events": len(self.df),
            "severity_breakdown": self.df["severity"].value_counts().to_dict(),
            "after_hours_count": int(self.df["is_after_hours"].sum()),
            "unresolved_count": int((~self.df["resolved"]).sum()),
        }

    def get_events_by_type(self):
        if self.df is None:
            self.load_data()
        return [{"event_type": t, "count": int(c)} for t, c in self.df["event_type"].value_counts().items()]

    def get_timeline(self):
        """Event count by hour of day."""
        if self.df is None:
            self.load_data()
        counts = self.df.groupby("hour").size().reindex(range(24), fill_value=0)
        return {"by_hour": counts.to_dict()}

    def get_after_hours_events(self, limit: int = 50):
        if self.df is None:
            self.load_data()

        events = self.df[self.df["is_after_hours"]].sort_values("timestamp", ascending=False).head(limit)
        return {
            "total_after_hours": int(self.df["is_after_hours"].sum()),
            "events": [{
                "event_id": int(row["event_id"]),
                "timestamp": str(row["timestamp"]),
                "location": row["location"],
                "event_type": row["event_type"],
                "severity": row["severity"],
                "resolved": bool(row["resolved"])
            } for _, row in events.iterrows()]
        }

    def get_recommendations(self):
        if self.df is None:
            self.load_data()

        recommendations = []
        analytics = self.get_analytics()

        # Rule 1: recurring after-hours activity at a specific location
        after_hours = self.df[self.df["is_after_hours"]]
        if len(after_hours) > 0:
            top_location = after_hours["location"].value_counts().idxmax()
            top_count = after_hours["location"].value_counts().max()
            pct = round(top_count / len(after_hours) * 100, 1)
            if pct > 25:
                recommendations.append(
                    f"{top_location} accounts for {pct}% of all after-hours security events "
                    f"({top_count} incidents) — consider additional monitoring or access restrictions "
                    f"for this location outside business hours."
                )

        # Rule 2: high-severity event ratio
        high_pct = round((self.df["severity"] == "high").sum() / len(self.df) * 100, 1)
        if high_pct > 20:
            recommendations.append(
                f"{high_pct}% of all logged security events are high-severity — this is elevated "
                f"and warrants a review of access control procedures."
            )

        # Rule 3: unresolved events
        if analytics["unresolved_count"] > 0:
            pct_unresolved = round(analytics["unresolved_count"] / analytics["total_events"] * 100, 1)
            recommendations.append(
                f"{analytics['unresolved_count']} events ({pct_unresolved}%) remain unresolved — "
                f"prioritize closing out open security incidents."
            )

        # Rule 4: most common event type overall
        top_type = self.df["event_type"].value_counts().idxmax()
        top_type_count = self.df["event_type"].value_counts().max()
        recommendations.append(
            f"'{top_type}' is the most frequently logged event type ({top_type_count} occurrences) — "
            f"consider whether a process or equipment change could reduce recurrence."
        )

        if not recommendations:
            recommendations.append("No significant security patterns detected currently.")

        return recommendations

    def add_event(self, timestamp, location, event_type, severity, resolved=False):
        session = SessionLocal()
        new_event = SecurityEvent(
            facility_id=self.facility_id, timestamp=timestamp, location=location,
            event_type=event_type, severity=severity, resolved=resolved
        )
        session.add(new_event)
        session.commit()
        event_id = new_event.event_id
        session.close()
        self.df = None
        return {"event_id": event_id, "message": "Event added"}

    def delete_event(self, event_id: int):
        session = SessionLocal()
        event = session.query(SecurityEvent).filter(SecurityEvent.event_id == event_id).first()
        if not event:
            session.close()
            return {"error": "Event not found"}
        session.delete(event)
        session.commit()
        session.close()
        self.df = None
        return {"message": "Event deleted"}

    def get_recent_events(self, limit: int = 20):
        session = SessionLocal()
        events = (
            session.query(SecurityEvent)
            .filter(SecurityEvent.facility_id == self.facility_id)
            .order_by(SecurityEvent.event_id.desc())
            .limit(limit)
            .all()
        )
        session.close()
        return [{
            "event_id": e.event_id, "timestamp": str(e.timestamp), "location": e.location,
            "event_type": e.event_type, "severity": e.severity, "resolved": e.resolved
        } for e in events]

    def get_events_by_location(self):
        if self.df is None:
            self.load_data()
        return [{"location": l, "count": int(c)} for l, c in self.df["location"].value_counts().items()]

    def get_resolution_by_severity(self):
        if self.df is None:
            self.load_data()
        grouped = self.df.groupby("severity")["resolved"].agg(["sum", "count"])
        return [{
            "severity": sev,
            "resolved_pct": round(row["sum"] / row["count"] * 100, 1)
        } for sev, row in grouped.iterrows()]