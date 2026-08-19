import pandas as pd
from datetime import date
from app.core.database import SessionLocal
from app.models.db_models import Asset, MaintenanceRecord

ASSET_TYPES = ["HVAC Unit", "Chiller", "Lighting Panel", "Water Pump", "Backup Generator"]

def derive_failure_type(row):
    if row["TWF"] == 1:
        return "Tool Wear Failure"
    if row["HDF"] == 1:
        return "Heat Dissipation Failure"
    if row["PWF"] == 1:
        return "Power Failure"
    if row["OSF"] == 1:
        return "Overstrain Failure"
    if row["RNF"] == 1:
        return "Random Failure"
    return None

def load_assets(session):
    existing = session.query(Asset).count()
    if existing > 0:
        print("Assets already exist, skipping.")
        return session.query(Asset).all()

    assets = []
    for i, asset_type in enumerate(ASSET_TYPES, start=1):
        asset = Asset(
            facility_id=1,
            asset_type=asset_type,
            install_date=date(2017, 1, 1),
            status="active"
        )
        assets.append(asset)
    session.add_all(assets)
    session.commit()
    print(f"Inserted {len(assets)} synthetic assets.")
    return assets

def load_maintenance_records(session, assets):
    existing = session.query(MaintenanceRecord).count()
    if existing > 0:
        print("Maintenance records already exist, skipping.")
        return

    df = pd.read_csv("../data/raw/ai4i2020.csv")
    num_assets = len(assets)

    records = []
    for idx, row in df.iterrows():
        asset = assets[idx % num_assets]  # distribute rows round-robin across the 5 assets
        record = MaintenanceRecord(
            asset_id=asset.asset_id,
            product_id=row["Product ID"],
            product_type=row["Type"],
            air_temperature=row["Air temperature [K]"],
            process_temperature=row["Process temperature [K]"],
            rotational_speed=row["Rotational speed [rpm]"],
            torque=row["Torque [Nm]"],
            tool_wear=row["Tool wear [min]"],
            machine_failure=bool(row["Machine failure"]),
            failure_type=derive_failure_type(row)
        )
        records.append(record)

    session.bulk_save_objects(records)
    session.commit()
    print(f"Inserted {len(records)} maintenance records across {num_assets} assets.")

if __name__ == "__main__":
    session = SessionLocal()
    assets = load_assets(session)
    load_maintenance_records(session, assets)
    session.close()