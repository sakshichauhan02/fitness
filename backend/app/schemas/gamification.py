from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from datetime import date, datetime

class LoggedMealItem(BaseModel):
    name: str
    cal: int = Field(description="Calories in kcal")
    pro: str = Field(description="Protein in grams, e.g., '25g'")
    carb: str = Field(description="Carbs in grams, e.g., '30g'")
    fat: str = Field(description="Fats in grams, e.g., '10g'")

class CheckStreakRequest(BaseModel):
    user_id: UUID
    meals: List[LoggedMealItem]
    local_date: Optional[date] = None

class BadgeItem(BaseModel):
    badge_name: str
    unlocked_at: datetime

    class Config:
        from_attributes = True

class GamificationStatusResponse(BaseModel):
    current_streak: int
    longest_streak: int
    last_completed_date: Optional[date] = None
    streak_secured_today: bool
    logged_totals: dict = Field(description="Totals of logged macros: calories, protein, carbs, fats")
    target_macros: dict = Field(description="Targets of macros: calories, protein, carbs, fats")
    unlocked_badges: List[BadgeItem]
