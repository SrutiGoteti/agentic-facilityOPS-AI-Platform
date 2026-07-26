from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
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