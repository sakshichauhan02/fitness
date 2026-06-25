from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import date, datetime, timedelta
from typing import List, Optional

from ..database import get_db
from ..models.profile import Profile
from ..models.gamification import UserStreak, StreakHistory, UserBadge
from ..schemas.gamification import CheckStreakRequest, GamificationStatusResponse, BadgeItem

router = APIRouter(
    prefix="/gamification",
    tags=["gamification"]
)

def calculate_age(dob) -> int:
    if not dob:
        return 28
    today = date.today()
    return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

def get_user_macro_targets(profile: Profile):
    # MIPHLIN-ST JEOR
    age = calculate_age(profile.date_of_birth)
    weight = float(profile.weight or 70)
    height = float(profile.height or 175)
    gender = profile.gender or "Other"
    
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
        
    protein = int(weight * 2.0)
    fats = int((calories * 0.25) / 9)
    carbs = int((calories - (protein * 4) - (fats * 9)) / 4)
    
    return {
        "calories": calories,
        "protein": protein,
        "carbs": carbs,
        "fats": fats
    }

def check_and_decay_streak(streak: UserStreak, today_date: date):
    if not streak.last_completed_date:
        streak.current_streak = 0
        return
        
    yesterday = today_date - timedelta(days=1)
    
    # Re-verify if they missed yesterday
    if streak.last_completed_date < yesterday:
        streak.current_streak = 0

@router.get("/status/{user_id}", response_model=GamificationStatusResponse)
def get_gamification_status(user_id: UUID, local_date: Optional[date] = None, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.id == user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found in database."
        )
        
    # Get macro targets
    targets = get_user_macro_targets(profile)
    
    # If local_date is not provided, fall back to server date
    today = local_date if local_date is not None else date.today()
    
    # Fetch or initialize streak
    streak = db.query(UserStreak).filter(UserStreak.user_id == user_id).first()
    if not streak:
        streak = UserStreak(
            user_id=user_id,
            current_streak=0,
            longest_streak=0,
            last_completed_date=None
        )
        db.add(streak)
        db.commit()
        db.refresh(streak)
    else:
        check_and_decay_streak(streak, today)
        db.commit()
        
    # Get today's logged totals
    history = db.query(StreakHistory).filter(
        StreakHistory.user_id == user_id,
        StreakHistory.completed_date == today
    ).first()
    
    logged_totals = {
        "calories": history.calories_logged if history else 0,
        "protein": history.protein_logged if history else 0,
        "carbs": history.carbs_logged if history else 0,
        "fats": history.fats_logged if history else 0
    }
    
    streak_secured_today = bool(history and history.macros_met and history.meals_logged)
    
    # Fetch unlocked badges
    badges = db.query(UserBadge).filter(UserBadge.user_id == user_id).all()
    unlocked_badges = [BadgeItem.from_orm(b) for b in badges]
    
    return GamificationStatusResponse(
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        last_completed_date=streak.last_completed_date,
        streak_secured_today=streak_secured_today,
        logged_totals=logged_totals,
        target_macros=targets,
        unlocked_badges=unlocked_badges
    )

@router.post("/check-streak", response_model=GamificationStatusResponse)
def check_streak(req: CheckStreakRequest, db: Session = Depends(get_db)):
    profile = db.query(Profile).filter(Profile.id == req.user_id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User profile not found in database."
        )
        
    targets = get_user_macro_targets(profile)
    
    # Calculate logged totals from request
    total_cal = 0
    total_pro = 0
    total_carb = 0
    total_fat = 0
    
    for meal in req.meals:
        total_cal += meal.cal
        # Parse strings like "24g" or "12"
        pro_val = int(''.join(filter(str.isdigit, meal.pro)) or 0)
        carb_val = int(''.join(filter(str.isdigit, meal.carb)) or 0)
        fat_val = int(''.join(filter(str.isdigit, meal.fat)) or 0)
        
        total_pro += pro_val
        total_carb += carb_val
        total_fat += fat_val
        
    meals_logged = len(req.meals) > 0
    
    # Verify if calorie and protein targets are met within ±10% tolerance
    cal_target = targets["calories"]
    pro_target = targets["protein"]
    
    calories_met = (cal_target * 0.9) <= total_cal <= (cal_target * 1.1)
    protein_met = (pro_target * 0.9) <= total_pro <= (pro_target * 1.1)
    
    macros_met = calories_met and protein_met
    secured_today = meals_logged and macros_met
    
    # If local_date is not provided, fall back to server date
    today = req.local_date if req.local_date is not None else date.today()
    
    # Get or create StreakHistory for today
    history = db.query(StreakHistory).filter(
        StreakHistory.user_id == req.user_id,
        StreakHistory.completed_date == today
    ).first()
    
    if not history:
        history = StreakHistory(
            user_id=req.user_id,
            completed_date=today
        )
        db.add(history)
        
    history.meals_logged = meals_logged
    history.macros_met = macros_met
    history.calories_logged = total_cal
    history.protein_logged = total_pro
    history.carbs_logged = total_carb
    history.fats_logged = total_fat
    
    # Fetch user streak state
    streak = db.query(UserStreak).filter(UserStreak.user_id == req.user_id).first()
    if not streak:
        streak = UserStreak(
            user_id=req.user_id,
            current_streak=0,
            longest_streak=0,
            last_completed_date=None
        )
        db.add(streak)
        
    # Process streak counter logic
    yesterday = today - timedelta(days=1)
    previous_last_date = streak.last_completed_date
    
    # Run decays if they missed previous days
    check_and_decay_streak(streak, today)
    
    if secured_today:
        if streak.last_completed_date == today:
            # Already secured today, do not increment but maintain
            pass
        elif streak.last_completed_date == yesterday:
            # Increment consecutive day streak
            streak.current_streak += 1
            streak.last_completed_date = today
        else:
            # Broken streak or first streak day
            streak.current_streak = 1
            streak.last_completed_date = today
            
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
    else:
        # Revert streak if it was secured today but now falls out of tolerance
        if streak.last_completed_date == today:
            if previous_last_date == today:
                # If they were secured today, but now are not, we decrement
                if streak.current_streak > 0:
                    streak.current_streak -= 1
                # Restore to yesterday or null
                streak.last_completed_date = None # simplified revert
                
    db.commit()
    db.refresh(streak)
    db.refresh(history)
    
    # Check milestone badge unlocking criteria
    badge_milestones = {
        7: "7-Day Fire",
        30: "30-Day Consistency",
        50: "50-Day Elite",
        100: "100-Day Club"
    }
    
    for days, badge_name in badge_milestones.items():
        if streak.current_streak >= days:
            # Check if badge is already unlocked in DB
            existing_badge = db.query(UserBadge).filter(
                UserBadge.user_id == req.user_id,
                UserBadge.badge_name == badge_name
            ).first()
            if not existing_badge:
                new_badge = UserBadge(
                    user_id=req.user_id,
                    badge_name=badge_name
                )
                db.add(new_badge)
                
    db.commit()
    
    # Fetch all unlocked badges
    badges = db.query(UserBadge).filter(UserBadge.user_id == req.user_id).all()
    unlocked_badges = [BadgeItem.from_orm(b) for b in badges]
    
    logged_totals = {
        "calories": total_cal,
        "protein": total_pro,
        "carbs": total_carb,
        "fats": total_fat
    }
    
    return GamificationStatusResponse(
        current_streak=streak.current_streak,
        longest_streak=streak.longest_streak,
        last_completed_date=streak.last_completed_date,
        streak_secured_today=secured_today,
        logged_totals=logged_totals,
        target_macros=targets,
        unlocked_badges=unlocked_badges
    )
