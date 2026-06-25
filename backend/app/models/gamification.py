from sqlalchemy import Column, String, Date, Integer, Boolean, DateTime, ForeignKey, BigInteger, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..database import Base

class UserStreak(Base):
    __tablename__ = "user_streaks"
    __table_args__ = {"schema": "public"}

    user_id = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), primary_key=True)
    current_streak = Column(Integer, default=0, nullable=False)
    longest_streak = Column(Integer, default=0, nullable=False)
    last_completed_date = Column(Date, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    profile = relationship("Profile", backref="streak")

class StreakHistory(Base):
    __tablename__ = "streak_history"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    completed_date = Column(Date, nullable=False)
    meals_logged = Column(Boolean, default=False, nullable=False)
    macros_met = Column(Boolean, default=False, nullable=False)
    calories_logged = Column(Integer, default=0, nullable=False)
    protein_logged = Column(Integer, default=0, nullable=False)
    carbs_logged = Column(Integer, default=0, nullable=False)
    fats_logged = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    profile = relationship("Profile", backref="streak_history")

class UserBadge(Base):
    __tablename__ = "user_badges"
    __table_args__ = {"schema": "public"}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("public.profiles.id", ondelete="CASCADE"), nullable=False)
    badge_name = Column(String, nullable=False)
    unlocked_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    profile = relationship("Profile", backref="badges")
