from sqlalchemy import Column, String, Date, Integer, Boolean, DateTime, ForeignKey, Numeric, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base

class DailySummary(Base):
    __tablename__ = "daily_summaries"
    __table_args__ = {"schema": "public"}

    user_id = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), primary_key=True)
    date = Column(Date, primary_key=True)
    weight = Column(Numeric, nullable=True)
    water_intake = Column(Numeric, default=0.0, nullable=False)
    workout_completed = Column(Boolean, default=False, nullable=False)
    sleep_hours = Column(Numeric, default=8.0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    profile = relationship("Profile", backref="daily_summaries")

class MealLog(Base):
    __tablename__ = "meal_logs"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    date = Column(Date, nullable=False)
    name = Column(String, nullable=False)
    meal_type = Column(String, nullable=False)
    calories = Column(Integer, nullable=False)
    protein = Column(Integer, nullable=False)
    carbs = Column(Integer, nullable=False)
    fats = Column(Integer, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    profile = relationship("Profile", backref="meal_logs")
