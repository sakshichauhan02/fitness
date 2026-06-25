from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from .profile import ProfileBase

class WorkoutRequest(BaseModel):
    user_id: Optional[UUID] = None
    profile: Optional[ProfileBase] = None
    experience_level: str = Field(default="Intermediate", description="Beginner, Intermediate, or Advanced")
    workout_preference: Optional[str] = Field(default=None, description="e.g., strength, hypertrophy, cardio focus")
    feel_sore: Optional[bool] = Field(default=False, description="If True, replace workouts with mobility/stretching active recovery")


class WeeklyScheduleItem(BaseModel):
    day: str
    focus: str
    is_rest_day: bool

class ExerciseItem(BaseModel):
    name: str
    target_muscle: str
    sets: str
    reps: str
    coaching_tip: str

class WorkoutPlanDay(BaseModel):
    day: str
    workout_name: str
    exercises: List[ExerciseItem]

class WorkoutResponse(BaseModel):
    workout_split: str
    weekly_schedule: List[WeeklyScheduleItem]
    daily_workouts: List[WorkoutPlanDay]
    ai_coach_advice: str
