import pandas as pd
from datetime import datetime
from app.core.database import SessionLocal
from app.models.db_models import Room, RoomOccupancy


class OccupancyAgent:
    def __init__(self, facility_id: int = 1):
        self.facility_id = facility_id
        self.df = None
        self.rooms_df = None

    def load_data(self):
        """Pull rooms and their occupancy records for this facility."""
        session = SessionLocal()

        rooms = session.query(Room).filter(Room.facility_id == self.facility_id).all()
        room_ids = [r.room_id for r in rooms]

        records = (
            session.query(RoomOccupancy)
            .filter(RoomOccupancy.room_id.in_(room_ids))
            .all()
        )
        session.close()

        self.rooms_df = pd.DataFrame([{
            "room_id": r.room_id,
            "room_name": r.room_name,
            "room_type": r.room_type,
            "capacity": r.capacity
        } for r in rooms])

        self.df = pd.DataFrame([{
            "record_id": r.record_id,
            "room_id": r.room_id,
            "timestamp": r.timestamp,
            "headcount": r.headcount
        } for r in records])

        self.df = self.df.merge(self.rooms_df, on="room_id")
        self.df["utilization_pct"] = (self.df["headcount"] / self.df["capacity"] * 100).round(1)
        self.df["hour"] = pd.to_datetime(self.df["timestamp"]).dt.hour
        self.df["day_of_week"] = pd.to_datetime(self.df["timestamp"]).dt.day_name()
        self.df["is_overcrowded"] = self.df["headcount"] > self.df["capacity"]

        return self.df

    def get_analytics(self):
        """Facility-wide occupancy summary."""
        if self.df is None:
            self.load_data()

        return {
            "avg_utilization_pct": round(self.df["utilization_pct"].mean(), 1),
            "peak_utilization_pct": round(self.df["utilization_pct"].max(), 1),
            "total_overcrowding_events": int(self.df["is_overcrowded"].sum()),
            "total_rooms": len(self.rooms_df),
            "avg_by_hour": self.df.groupby("hour")["utilization_pct"].mean().round(1).to_dict(),
        }

    def get_room_heatmap(self):
        """Average utilization per room, for the heatmap grid."""
        if self.df is None:
            self.load_data()

        room_stats = self.df.groupby(["room_id", "room_name", "capacity"]).agg(
            avg_utilization=("utilization_pct", "mean"),
            peak_utilization=("utilization_pct", "max"),
            overcrowding_count=("is_overcrowded", "sum")
        ).reset_index()

        room_stats["avg_utilization"] = room_stats["avg_utilization"].round(1)
        room_stats["peak_utilization"] = room_stats["peak_utilization"].round(1)

        return room_stats.sort_values("avg_utilization", ascending=False).to_dict(orient="records")

    def get_room_comparison(self):
        """Average utilization per room, for the bar chart (same aggregation, chart-ready)."""
        heatmap_data = self.get_room_heatmap()
        return [{"room_name": r["room_name"], "avg_utilization": r["avg_utilization"]} for r in heatmap_data]

    def get_overcrowding_events(self, limit: int = 30):
        """List individual overcrowding readings, most severe first."""
        if self.df is None:
            self.load_data()

        events = self.df[self.df["is_overcrowded"]].copy()
        events["pct_over"] = ((events["headcount"] - events["capacity"]) / events["capacity"] * 100).round(1)
        events = events.sort_values("pct_over", ascending=False).head(limit)

        return {
            "total_events": int(self.df["is_overcrowded"].sum()),
            "events": [{
                "room_name": row["room_name"],
                "timestamp": str(row["timestamp"]),
                "headcount": int(row["headcount"]),
                "capacity": int(row["capacity"]),
                "pct_over": row["pct_over"]
            } for _, row in events.iterrows()]
        }

    def get_day_of_week_pattern(self):
        """Average utilization by day of week, facility-wide."""
        if self.df is None:
            self.load_data()

        day_order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        avg_by_day = self.df.groupby("day_of_week")["utilization_pct"].mean().round(1)
        avg_by_day = avg_by_day.reindex(day_order).to_dict()

        return {"avg_by_day_of_week": avg_by_day}

    def get_recommendations(self):
        """Rule-based occupancy recommendations."""
        analytics = self.get_analytics()
        heatmap = self.get_room_heatmap()
        recommendations = []

        # Rule 1: rooms frequently over capacity
        for room in heatmap:
            if room["overcrowding_count"] > 0:
                recommendations.append(
                    f"{room['room_name']} exceeded capacity {room['overcrowding_count']} times "
                    f"(peak {room['peak_utilization']}% of capacity) — consider capacity limits or "
                    f"scheduling adjustments during peak periods."
                )

        # Rule 2: chronically underused rooms
        for room in heatmap:
            if room["avg_utilization"] < 20:
                recommendations.append(
                    f"{room['room_name']} averages only {room['avg_utilization']}% utilization — "
                    f"consider repurposing or consolidating activities into fewer rooms to save on "
                    f"energy and maintenance overhead."
                )

        # Rule 3: peak hour facility-wide
        avg_by_hour = analytics["avg_by_hour"]
        peak_hour = max(avg_by_hour, key=avg_by_hour.get)
        recommendations.append(
            f"Facility-wide occupancy peaks around {peak_hour}:00 — ensure adequate staffing "
            f"and ventilation capacity during this window."
        )

        if not recommendations:
            recommendations.append("No overcrowding or underutilization patterns detected currently.")

        return recommendations

    def add_record(self, room_id: int, timestamp, headcount: int):
        """Insert a new room occupancy reading."""
        session = SessionLocal()
        new_record = RoomOccupancy(room_id=room_id, timestamp=timestamp, headcount=headcount)
        session.add(new_record)
        session.commit()
        record_id = new_record.record_id
        session.close()
        self.df = None
        return {"record_id": record_id, "message": "Reading added"}

    def delete_record(self, record_id: int):
        """Delete an occupancy reading by record_id."""
        session = SessionLocal()
        record = session.query(RoomOccupancy).filter(RoomOccupancy.record_id == record_id).first()
        if not record:
            session.close()
            return {"error": "Record not found"}
        session.delete(record)
        session.commit()
        session.close()
        self.df = None
        return {"message": "Reading deleted"}

    def get_recent_records(self, limit: int = 20):
        """Most recent occupancy readings, for the add/delete UI."""
        session = SessionLocal()
        room_ids = [r.room_id for r in session.query(Room).filter(Room.facility_id == self.facility_id).all()]
        records = (
            session.query(RoomOccupancy)
            .filter(RoomOccupancy.room_id.in_(room_ids))
            .order_by(RoomOccupancy.record_id.desc())
            .limit(limit)
            .all()
        )
        rooms_by_id = {r.room_id: r.room_name for r in session.query(Room).filter(Room.facility_id == self.facility_id).all()}
        session.close()
        return [{
            "record_id": r.record_id,
            "room_id": r.room_id,
            "room_name": rooms_by_id.get(r.room_id, "Unknown"),
            "timestamp": str(r.timestamp),
            "headcount": r.headcount
        } for r in records]

    def get_room_list(self):
        """List rooms for the add-record dropdown."""
        session = SessionLocal()
        rooms = session.query(Room).filter(Room.facility_id == self.facility_id).all()
        session.close()
        return [{"room_id": r.room_id, "room_name": r.room_name, "capacity": r.capacity} for r in rooms]