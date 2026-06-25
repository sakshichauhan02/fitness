from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models.profile import Profile
from typing import List
from pydantic import BaseModel
from ..schemas.nutrition import NutritionRequest, NutritionResponse, MealAnalyzeRequest, MealAnalyzeResponse, GroceryListResponse, HydrationRequest, HydrationResponse
from ..services.gemini import GeminiService

router = APIRouter(
    prefix="/nutrition",
    tags=["nutrition"]
)

def calculate_age(dob) -> int:
    if not dob:
        return 28
    from datetime import date
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

@router.post("/generate", response_model=NutritionResponse)
def generate_nutrition(req: NutritionRequest, db: Session = Depends(get_db)):
    profile = req.profile

    # Load from DB if user_id is provided
    if req.user_id:
        db_profile = db.query(Profile).filter(Profile.id == req.user_id).first()
        if not db_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User profile not found in database."
            )
        profile = db_profile

    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either user_id or profile object must be provided to generate a nutrition plan."
        )

    # Calculate caloric and macro targets if not overridden in request
    calories = req.calories_target
    protein = req.protein_target
    carbs = req.carb_target
    fats = req.fat_target

    if calories is None:
        # Recreate baseline calculations from frontend rules
        age = calculate_age(profile.date_of_birth)
        weight = float(profile.weight or 70)
        height = float(profile.height or 175)
        gender = profile.gender or "Other"
        
        # Mifflin-St Jeor
        if gender == 'Male':
            bmr = (10 * weight) + (6.25 * height) - (5 * age) + 5
        elif gender == 'Female':
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 161
        else:
            bmr = (10 * weight) + (6.25 * height) - (5 * age) - 78
            
        tdee = bmr * 1.375
        
        goal = profile.target_goal or "V-Taper Focus"
        if goal == 'Lean Bulk':
            calories = int(tdee + 300)
        elif goal == 'Aggressive Cut':
            calories = int(tdee - 500)
        elif goal == 'V-Taper Focus':
            calories = int(tdee - 150)
        else:
            calories = int(tdee + 100)

    if protein is None:
        protein = int((profile.weight or 70) * 2.0)
        
    if fats is None:
        fats = int((calories * 0.25) / 9)
        
    if carbs is None:
        carbs = int((calories - (protein * 4) - (fats * 9)) / 4)

    # Call Gemini service layer
    plan = GeminiService.generate_nutrition_plan(
        profile=profile,
        calories=calories,
        protein=protein,
        carbs=carbs,
        fats=fats
    )
    return plan

@router.post("/analyze-meal", response_model=MealAnalyzeResponse)
def analyze_meal(req: MealAnalyzeRequest):
    if not req.description.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Meal description cannot be empty."
        )
    analysis = GeminiService.analyze_meal(
        description=req.description,
        meal_type=req.meal_type
    )
    return analysis

class GroceryRequest(BaseModel):
    dietary_identity: str
    meals: List[str]

@router.post("/grocery-list", response_model=GroceryListResponse)
def generate_grocery(req: GroceryRequest):
    grocery_data = GeminiService.generate_grocery_list(
        dietary_identity=req.dietary_identity,
        meal_suggestions=req.meals
    )
    return grocery_data


@router.post("/hydration-recommendation", response_model=HydrationResponse)
def get_hydration_recommendation(req: HydrationRequest):
    return GeminiService.generate_hydration_recommendation(
        weight=req.weight,
        tdee=req.tdee,
        is_workout_day=req.is_workout_day,
        activity_level=req.activity_level
    )


