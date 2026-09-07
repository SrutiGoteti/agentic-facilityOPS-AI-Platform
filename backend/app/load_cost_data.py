import pandas as pd
from app.core.database import SessionLocal
from app.models.db_models import CostEntry, EnergyUsage, MaintenanceRecord, SecurityEvent

# Assumed cost rates — documented assumptions, not hidden
ENERGY_RATE_PER_KWH = 8.5          # ₹ per kWh (typical commercial tariff)
MAINTENANCE_COST_PER_FAILURE = 4500  # ₹ average repair cost per logged failure
SECURITY_COST_PER_EVENT = 800        # ₹ average response/admin cost per logged event
ADMIN_MONTHLY_OVERHEAD = 15000       # ₹ fixed monthly administrative overhead

def load_cost_entries(session):
    existing = session.query(CostEntry).count()
    if existing > 0:
        print("Cost entries already exist, skipping.")
        return

    entries = []

    # --- Energy cost: real kWh × tariff rate, aggregated monthly ---
    energy_records = session.query(EnergyUsage.timestamp, EnergyUsage.power_consumption).filter(EnergyUsage.facility_id == 1).all()
    edf = pd.DataFrame(energy_records, columns=["timestamp", "power_consumption"])
    edf["period"] = pd.to_datetime(edf["timestamp"]).dt.strftime("%Y-%m")
    energy_by_month = edf.groupby("period")["power_consumption"].sum() * ENERGY_RATE_PER_KWH / 4  # 15-min readings -> hourly-equivalent kWh
    for period, amount in energy_by_month.items():
        entries.append(CostEntry(facility_id=1, category="energy", amount=round(amount, 2), period=period, description="Energy consumption cost"))

    # --- Maintenance cost: real failure count × cost per failure, aggregated monthly ---
    maint_records = session.query(MaintenanceRecord.record_id).join(
        MaintenanceRecord.asset
    ).filter(MaintenanceRecord.machine_failure == True).all() if False else None
    # simpler: pull failures directly with a raw query via ORM columns already available
    from app.models.db_models import Asset
    failures = (
        session.query(MaintenanceRecord)
        .join(Asset, MaintenanceRecord.asset_id == Asset.asset_id)
        .filter(Asset.facility_id == 1, MaintenanceRecord.machine_failure == True)
        .all()
    )
    # AI4I has no timestamp on maintenance_records tied to real dates, so distribute evenly across the energy dataset's month range
    months = sorted(edf["period"].unique())
    failures_per_month = len(failures) / len(months)
    for month in months:
        amount = failures_per_month * MAINTENANCE_COST_PER_FAILURE
        entries.append(CostEntry(facility_id=1, category="maintenance", amount=round(amount, 2), period=month, description="Maintenance & repair cost"))

    # --- Security cost: real event count × cost per event, aggregated monthly ---
    sec_records = session.query(SecurityEvent.timestamp).filter(SecurityEvent.facility_id == 1).all()
    sdf = pd.DataFrame(sec_records, columns=["timestamp"])
    sdf["period"] = pd.to_datetime(sdf["timestamp"]).dt.strftime("%Y-%m")
    security_by_month = sdf.groupby("period").size() * SECURITY_COST_PER_EVENT
    for period in months:
        amount = security_by_month.get(period, 0)
        entries.append(CostEntry(facility_id=1, category="security", amount=round(float(amount), 2), period=period, description="Security operations cost"))

    # --- Administrative: fixed monthly overhead ---
    for month in months:
        entries.append(CostEntry(facility_id=1, category="administrative", amount=ADMIN_MONTHLY_OVERHEAD, period=month, description="Administrative overhead"))

    session.bulk_save_objects(entries)
    session.commit()
    print(f"Inserted {len(entries)} cost entries across {len(months)} months.")

if __name__ == "__main__":
    session = SessionLocal()
    load_cost_entries(session)
    session.close()