from sqlalchemy import Column, String, Date, Numeric, Boolean, DateTime, func
from sqlalchemy.dialects.postgresql import UUID
from ..database import Base

class Profile(Base):
    __tablename__ = "profiles"
    __table_args__ = {"schema": "public"}

    id = Column(UUID(as_uuid=True), primary_key=True, index=True)
    name = Column(String, nullable=True)
    gender = Column(String, nullable=True)
    date_of_birth = Column(Date, nullable=True)
    height = Column(Numeric, nullable=True)
    height_unit = Column(String, nullable=True)
    weight = Column(Numeric, nullable=True)
    weight_unit = Column(String, nullable=True)
    target_weight = Column(Numeric, nullable=True)
    target_weight_unit = Column(String, nullable=True)
    current_physique = Column(String, nullable=True)
    target_goal = Column(String, nullable=True)
    dietary_identity = Column(String, nullable=True)
    equipment_access = Column(String, nullable=True)
    onboarded = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
