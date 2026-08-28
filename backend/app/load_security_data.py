import numpy as np
import pandas as pd
from datetime import timedelta
from app.core.database import SessionLocal
from app.models.db_models import SecurityEvent, EnergyUsage

LOCATIONS = ["Main Entrance", "Server Room", "Rear Exit", "Parking Lot", "Loading Dock"]

EVENT_TYPES = [
    ("Forced Entry", "high"),
    ("Unauthorized Access", "high"),
    ("Alarm Triggered", "high"),
    ("After-Hours Motion", "medium"),
    ("Camera Offline", "medium"),
    ("Door Left Open", "low"),
    ("Failed Badge Scan", "low"),
]

def load_security_events(session, num_events=350):
    existing = session.query(SecurityEvent).count()
    if existing > 0:
        print("Security events already exist, skipping.")
        return

    energy_timestamps = [r[0] for r in session.query(EnergyUsage.timestamp).filter(EnergyUsage.facility_id == 1).all()]

    np.random.seed(7)
    chosen_timestamps = np.random.choice(len(energy_timestamps), size=num_events, replace=False)

    events = []
    for idx in chosen_timestamps:
        ts = energy_timestamps[idx]
        hour = ts.hour
        is_weekend = ts.weekday() >= 5
        is_after_hours = is_weekend or hour < 8 or hour > 18

        # After-hours events skew toward higher-severity types (forced entry, unauthorized access);
        # business-hours events skew toward lower-severity/administrative types
        if is_after_hours:
            weights = [0.22, 0.20, 0.15, 0.20, 0.08, 0.08, 0.07]
        else:
            weights = [0.03, 0.05, 0.07, 0.05, 0.15, 0.30, 0.35]

        event_type, severity = EVENT_TYPES[np.random.choice(len(EVENT_TYPES), p=weights)]

        # Server Room gets a disproportionate share of high-severity after-hours events —
        # a deliberate pattern for the "systemic location" recommendation rule to detect
        if is_after_hours and np.random.random() < 0.35:
            location = "Server Room"
        else:
            location = np.random.choice(LOCATIONS)

        events.append(SecurityEvent(
            facility_id=1,
            timestamp=ts,
            location=location,
            event_type=event_type,
            severity=severity,
            resolved=bool(np.random.random() < 0.6)
        ))

    session.bulk_save_objects(events)
    session.commit()
    print(f"Inserted {len(events)} security events.")

if __name__ == "__main__":
    session = SessionLocal()
    load_security_events(session)
    session.close()