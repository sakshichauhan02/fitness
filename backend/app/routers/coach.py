from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date, timedelta
from typing import Optional

from ..database import get_db
from ..models.profile import Profile
from ..models.history import DailySummary, MealLog
from ..schemas.coach import CoachRecommendationResponse
from ..services.gemini import GeminiService

router = APIRouter(
    prefix="/coach",
    tags=["coach"]
)

@router.get("/recommendation/{user_id}", response_model=CoachRecommendationResponse)
def get_coach_recommendation(user_id: UUID, local_date: Optional[date] = None, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found in database."
        )

    today = local_date if local_date is not None else date.today()

    summary = db.query(DailySummary).filter(
        DailySummary.user_id == user_id,
        DailySummary.date == today
    ).first()

    weight = float(profile.weight or 70.0)
    height = float(profile.height or 175.0)
    water_intake = float(summary.water_intake) if summary else 0.0
    sleep_hours = float(summary.sleep_hours) if (summary and summary.sleep_hours is not None) else 8.0
    workout_completed = summary.workout_completed if summary else False

    meals = db.query(MealLog).filter(
        MealLog.user_id == user_id,
        MealLog.date == today
    ).all()

    daily_calories = 0
    protein_intake = 0
    for m in meals:
        daily_calories += m.calories
        protein_intake += m.protein

    seven_days_ago = today - timedelta(days=7)
    past_summaries = db.query(DailySummary).filter(
        DailySummary.user_id == user_id,
        DailySummary.date >= seven_days_ago,
        DailySummary.date < today
    ).all()

    workouts_completed_count = sum(1 for s in past_summaries if s.workout_completed)
    workout_history_summary = f"Completed {workouts_completed_count} workouts in the last 7 days."

    recommendation = GeminiService.generate_coach_recommendation(
        goal=profile.target_goal or "Fitness",
        weight=weight,
        height=height,
        workout_history_summary=workout_history_summary,
        daily_calories=daily_calories,
        protein_intake=protein_intake,
        water_intake=water_intake,
        sleep_hours=sleep_hours,
        workout_completed=workout_completed
    )

    return CoachRecommendationResponse(**recommendation)
