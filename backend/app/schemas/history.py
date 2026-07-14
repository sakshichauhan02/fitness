from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from uuid import UUID
from datetime import date, datetime

class MealLogItem(BaseModel):
    id: int
    name: str
    meal_type: str
    calories: int
    protein: int
    carbs: int
    fats: int
    date: date
    created_at: datetime

    class Config:
        from_attributes = True

class MealLogCreate(BaseModel):
    user_id: UUID
    date: date
    name: str
    meal_type: str
    calories: int
    protein: int
    carbs: int
    fats: int

class DailyUpdatePayload(BaseModel):
    user_id: UUID
    date: date
    weight: Optional[float] = None
    water_intake: Optional[float] = None
    workout_completed: Optional[bool] = None
    sleep_hours: Optional[float] = None

class MacroTotals(BaseModel):
    calories: int = 0
    protein: int = 0
    carbs: int = 0
    fats: int = 0

class DailyHistoryDayResponse(BaseModel):
    date: date
    weight: Optional[float] = None
    water_intake: float = 0.0
    workout_completed: bool = False
    sleep_hours: float = 8.0
    meals: List[MealLogItem] = []
    macro_totals: MacroTotals = Field(default_factory=MacroTotals)

class HistoryRangeResponse(BaseModel):
    history: Dict[str, DailyHistoryDayResponse]
