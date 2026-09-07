from sqlalchemy import Column, Integer, String, Float, DateTime, Date, Boolean, ForeignKey
from datetime import datetime
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

class Room(Base):
    __tablename__ = "rooms"

    room_id = Column(Integer, primary_key=True, autoincrement=True)
    facility_id = Column(Integer, ForeignKey("facilities.facility_id"), nullable=False)
    room_name = Column(String)
    room_type = Column(String)
    capacity = Column(Integer)


class RoomOccupancy(Base):
    __tablename__ = "room_occupancy"

    record_id = Column(Integer, primary_key=True, autoincrement=True)
    room_id = Column(Integer, ForeignKey("rooms.room_id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    headcount = Column(Integer)

class SecurityEvent(Base):
    __tablename__ = "security_events"

    event_id = Column(Integer, primary_key=True, autoincrement=True)
    facility_id = Column(Integer, ForeignKey("facilities.facility_id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    location = Column(String)
    event_type = Column(String)
    severity = Column(String)
    resolved = Column(Boolean, default=False)

class CostEntry(Base):
    __tablename__ = "cost_entries"

    entry_id = Column(Integer, primary_key=True, autoincrement=True)
    facility_id = Column(Integer, ForeignKey("facilities.facility_id"), nullable=False)
    category = Column(String)  # energy, maintenance, security, administrative
    amount = Column(Float)
    period = Column(String)    # e.g. "2018-05" (year-month)
    description = Column(String)

class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)