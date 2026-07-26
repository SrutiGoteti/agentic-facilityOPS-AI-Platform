import pandas as pd
from datetime import datetime
from app.core.database import SessionLocal
from app.models.db_models import Facility, EnergyUsage

def load_facility(session):
    # Check if facility already exists, so re-running this script doesn't duplicate it
    existing = session.query(Facility).filter_by(facility_id=1).first()
    if existing:
        print("Facility already exists, skipping.")
        return existing

    facility = Facility(
        facility_id=1,
        facility_name="Facility-01 (source: Kaggle anonymized dataset)",
        facility_type="Unspecified / Generic building",
        zone_location="Unknown",
        area_sqft=None,
        num_floors=None
    )
    session.add(facility)
    session.commit()
    print("Facility inserted.")
    return facility


def load_energy_usage(session):
    df = pd.read_excel("../data/raw/cleandata.xlsx")

    # Check if data already loaded, so re-running doesn't duplicate rows
    existing_count = session.query(EnergyUsage).count()
    if existing_count > 0:
        print(f"energy_usage already has {existing_count} rows, skipping.")
        return

    records = []
    for _, row in df.iterrows():
        record = EnergyUsage(
            facility_id=1,
            timestamp=row["date"],
            power_consumption=row["Power Consumption"],
            outdoor_temp=row["Outdoor Temperature"],
            occupancy=row["Occupancy"]
        )
        records.append(record)

    session.bulk_save_objects(records)
    session.commit()
    print(f"Inserted {len(records)} rows into energy_usage.")
   

if __name__ == "__main__":
    session = SessionLocal()
    load_facility(session)
    load_energy_usage(session)
    session.close()