from pydantic import BaseModel
from typing import Optional

class CoachRecommendationResponse(BaseModel):
    daily_fitness_score: int
    recovery_score: int
    workout_recommendation: str
    meal_recommendation: str
    muscle_group_recommendation: str
    rest_day_recommendation: str
    motivation_tip: str
    status: str  # "Excellent", "Good", "Needs Improvement"
