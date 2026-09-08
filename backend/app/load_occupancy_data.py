import numpy as np
import pandas as pd
from app.core.database import SessionLocal
from app.models.db_models import Room, RoomOccupancy, EnergyUsage

# Each room targets a different occupancy band, deliberately, to demonstrate
# the full range the dashboard needs to detect: Low / Moderate / High / Very High
ROOMS = [
    {"room_name": "Library",       "room_type": "library",   "capacity": 40,  "target_band": (10, 25)},   # Low
    {"room_name": "Staff Room",    "room_type": "office",    "capacity": 15,  "target_band": (25, 45)},   # Moderate
    {"room_name": "Classroom B",   "room_type": "classroom", "capacity": 30,  "target_band": (45, 65)},   # High
    {"room_name": "Classroom A",   "room_type": "classroom", "capacity": 30,  "target_band": (60, 80)},   # High/Very High
    {"room_name": "Assembly Hall", "room_type": "hall",      "capacity": 55,  "target_band": (75, 105)},  # Very High, exceeds capacity at peak
]

def load_rooms(session):
    existing = session.query(Room).count()
    if existing > 0:
        print("Rooms already exist, skipping.")
        return session.query(Room).all()

    rooms = [Room(facility_id=1, room_name=r["room_name"], room_type=r["room_type"], capacity=r["capacity"]) for r in ROOMS]
    session.add_all(rooms)
    session.commit()
    print(f"Inserted {len(rooms)} rooms.")
    return rooms

def load_room_occupancy(session, rooms):
    existing = session.query(RoomOccupancy).count()
    if existing > 0:
        print("Room occupancy already exists, skipping.")
        return

    energy_records = session.query(EnergyUsage.timestamp).filter(EnergyUsage.facility_id == 1).all()
    df = pd.DataFrame(energy_records, columns=["timestamp"])
    df["timestamp"] = pd.to_datetime(df["timestamp"])

    # Reduce to hourly granularity — occupancy sensors commonly report hourly in
    # practice, and this keeps the table size manageable on constrained hosting
    df = df[df["timestamp"].dt.minute == 0].reset_index(drop=True)

    df["hour"] = df["timestamp"].dt.hour
    df["is_weekend"] = df["timestamp"].dt.dayofweek >= 5

    # Real timing pattern: active during business hours on weekdays, quiet otherwise —
    # this keeps the WHEN grounded in realistic building-usage patterns, only the
    # magnitude per room is fully designed rather than derived from the real occupancy column.
    business_hours = (~df["is_weekend"]) & (df["hour"] >= 8) & (df["hour"] <= 17)
    activity_level = np.where(business_hours, 1.0, np.where(df["is_weekend"], 0.05, 0.15))

    np.random.seed(42)
    all_records = []

    for room, room_cfg in zip(rooms, ROOMS):
        low, high = room_cfg["target_band"]
        target_pct = np.random.uniform(low, high, size=len(df)) * activity_level
        headcount = np.clip((target_pct / 100 * room_cfg["capacity"]).round(), 0, None).astype(int)

        for ts, hc in zip(df["timestamp"], headcount):
            all_records.append(RoomOccupancy(room_id=room.room_id, timestamp=ts, headcount=int(hc)))

    session.bulk_save_objects(all_records)
    session.commit()
    print(f"Inserted {len(all_records)} room occupancy records across {len(rooms)} rooms.")

if __name__ == "__main__":
    session = SessionLocal()
    rooms = load_rooms(session)
    load_room_occupancy(session, rooms)
    session.close()