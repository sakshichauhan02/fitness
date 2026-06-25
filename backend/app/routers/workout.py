from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.profile import Profile
from ..schemas.workout import WorkoutRequest, WorkoutResponse
from ..services.gemini import GeminiService

router = APIRouter(
    prefix="/workouts",
    tags=["workouts"]
)

@router.post("/generate", response_model=WorkoutResponse)
def generate_workout(req: WorkoutRequest, db: Session = Depends(get_db)):
    profile = req.profile

    # Load profile from db if user_id is provided
    if req.user_id:
        db_profile = db.query(Profile).filter(Profile.id == req.user_id).first()
        if not db_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found in database."
            )
        # Create a ProfileBase copy from the DB model
        profile = db_profile

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either user_id or full profile object must be provided to generate a workout plan."
        )

    # Call Gemini service layer
    plan = GeminiService.generate_workout_plan(
        profile=profile,
        experience_level=req.experience_level,
        workout_preference=req.workout_preference,
        feel_sore=req.feel_sore
    )
    return plan
