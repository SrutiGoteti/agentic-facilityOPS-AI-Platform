from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Boolean, ForeignKey
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Facility(Base):
    __tablename__ = "facilities"

    facility_id = Column(Integer, primary_key=True, autoincrement=True)
    facility_name = Column(String, nullable=False)
    facility_type = Column(String)
    zone_location = Column(String)
    area_sqft = Column(Float)
    num_floors = Column(Integer)


class EnergyUsage(Base):
    __tablename__ = "energy_usage"

    record_id = Column(Integer, primary_key=True, autoincrement=True)
    facility_id = Column(Integer, ForeignKey("facilities.facility_id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    power_consumption = Column(Float)
    outdoor_temp = Column(Float)
    occupancy = Column(Float)

class Asset(Base):
    __tablename__ = "assets"

    asset_id = Column(Integer, primary_key=True, autoincrement=True)
    facility_id = Column(Integer, ForeignKey("facilities.facility_id"), nullable=False)
    asset_type = Column(String)
    install_date = Column(Date)
    status = Column(String)


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    record_id = Column(Integer, primary_key=True, autoincrement=True)
    asset_id = Column(Integer, ForeignKey("assets.asset_id"), nullable=False)
    product_id = Column(String)
    product_type = Column(String)
    air_temperature = Column(Float)
    process_temperature = Column(Float)
    rotational_speed = Column(Float)
    torque = Column(Float)
    tool_wear = Column(Float)
    machine_failure = Column(Boolean)
    failure_type = Column(String) 