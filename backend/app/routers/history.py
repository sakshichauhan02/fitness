from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from uuid import UUID
from datetime import date, timedelta
from typing import List

from ..database import get_db
from ..models.history import DailySummary, MealLog
from ..schemas.history import (
    MealLogCreate, MealLogItem, DailyUpdatePayload, 
    DailyHistoryDayResponse, HistoryRangeResponse, MacroTotals
)

router = APIRouter(
    prefix="/history",
    tags=["history"]
)

@router.get("/range/{user_id}", response_model=HistoryRangeResponse)
def get_history_range(user_id: UUID, start_date: date, end_date: date, db: Session = Depends(get_db)):
    # Fetch daily summaries in range
    summaries = db.query(DailySummary).filter(
        DailySummary.user_id == user_id,
        DailySummary.date >= start_date,
        DailySummary.date <= end_date
    ).all()
    
    # Fetch meal logs in range
    meals = db.query(MealLog).filter(
        MealLog.user_id == user_id,
        MealLog.date >= start_date,
        MealLog.date <= end_date
    ).all()
    
    # Map summaries and meals by date
    history_map = {}
    
    # Initialize all dates in range with default values
    curr = start_date
    while curr <= end_date:
        date_str = curr.strftime("%Y-%m-%d")
        history_map[date_str] = DailyHistoryDayResponse(
            date=curr,
            weight=None,
            water_intake=0.0,
            workout_completed=False,
            meals=[],
            macro_totals=MacroTotals()
        )
        curr += timedelta(days=1)
        
    # Populate summaries
    for s in summaries:
        d_str = s.date.strftime("%Y-%m-%d")
        if d_str in history_map:
            history_map[d_str].weight = float(s.weight) if s.weight is not None else None
            history_map[d_str].water_intake = float(s.water_intake)
            history_map[d_str].workout_completed = s.workout_completed
            
    # Populate meals and compute totals
    for m in meals:
        d_str = m.date.strftime("%Y-%m-%d")
        if d_str in history_map:
            history_map[d_str].meals.append(MealLogItem.from_orm(m))
            history_map[d_str].macro_totals.calories += m.calories
            history_map[d_str].macro_totals.protein += m.protein
            history_map[d_str].macro_totals.carbs += m.carbs
            history_map[d_str].macro_totals.fats += m.fats
            
    return HistoryRangeResponse(history=history_map)

@router.get("/day/{user_id}/{date_val}", response_model=DailyHistoryDayResponse)
def get_history_day(user_id: UUID, date_val: date, db: Session = Depends(get_db)):
    summary = db.query(DailySummary).filter(
        DailySummary.user_id == user_id,
        DailySummary.date == date_val
    ).first()
    
    meals = db.query(MealLog).filter(
        MealLog.user_id == user_id,
        MealLog.date == date_val
    ).all()
    
    macro_totals = MacroTotals()
    meal_items = []
    for m in meals:
        meal_items.append(MealLogItem.from_orm(m))
        macro_totals.calories += m.calories
        macro_totals.protein += m.protein
        macro_totals.carbs += m.carbs
        macro_totals.fats += m.fats
        
    return DailyHistoryDayResponse(
        date=date_val,
        weight=float(summary.weight) if (summary and summary.weight is not None) else None,
        water_intake=float(summary.water_intake) if summary else 0.0,
        workout_completed=summary.workout_completed if summary else False,
        meals=meal_items,
        macro_totals=macro_totals
    )

@router.post("/meal", response_model=MealLogItem)
def create_meal_log(req: MealLogCreate, db: Session = Depends(get_db)):
    db_meal = MealLog(**req.model_dump())
    db.add(db_meal)
    db.commit()
    db.refresh(db_meal)
    return db_meal

@router.put("/meal/{meal_id}", response_model=MealLogItem)
def update_meal_log(meal_id: int, req: MealLogCreate, db: Session = Depends(get_db)):
    db_meal = db.query(MealLog).filter(MealLog.id == meal_id).first()
    if not db_meal:
        raise HTTPException(status_code=404, detail="Meal log not found.")
    
    for key, value in req.model_dump().items():
        setattr(db_meal, key, value)
        
    db.commit()
    db.refresh(db_meal)
    return db_meal

@router.delete("/meal/{meal_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_meal_log(meal_id: int, db: Session = Depends(get_db)):
    db_meal = db.query(MealLog).filter(MealLog.id == meal_id).first()
    if not db_meal:
        raise HTTPException(status_code=404, detail="Meal log not found.")
    db.delete(db_meal)
    db.commit()
    return None

@router.post("/daily-update", response_model=DailyHistoryDayResponse)
def update_daily_summary(req: DailyUpdatePayload, db: Session = Depends(get_db)):
    summary = db.query(DailySummary).filter(
        DailySummary.user_id == req.user_id,
        DailySummary.date == req.date
    ).first()
    
    # Check which fields were explicitly provided in the request
    fields_set = req.model_fields_set
    
    if not summary:
        summary = DailySummary(
            user_id=req.user_id,
            date=req.date,
            weight=req.weight,
            water_intake=req.water_intake if req.water_intake is not None else 0.0,
            workout_completed=req.workout_completed if req.workout_completed is not None else False
        )
        db.add(summary)
    else:
        if 'weight' in fields_set:
            summary.weight = req.weight
        if 'water_intake' in fields_set:
            if req.water_intake is not None:
                summary.water_intake = req.water_intake
        if 'workout_completed' in fields_set:
            if req.workout_completed is not None:
                summary.workout_completed = req.workout_completed
            
    try:
        db.commit()
        db.refresh(summary)
    except IntegrityError:
        db.rollback()
        # Fetch the record that was concurrently inserted
        summary = db.query(DailySummary).filter(
            DailySummary.user_id == req.user_id,
            DailySummary.date == req.date
        ).first()
        if not summary:
            raise
        
        # Apply the updates to the existing record
        if 'weight' in fields_set:
            summary.weight = req.weight
        if 'water_intake' in fields_set:
            if req.water_intake is not None:
                summary.water_intake = req.water_intake
        if 'workout_completed' in fields_set:
            if req.workout_completed is not None:
                summary.workout_completed = req.workout_completed
        
        db.commit()
        db.refresh(summary)
    
    # Also get meals for response
    meals = db.query(MealLog).filter(
        MealLog.user_id == req.user_id,
        MealLog.date == req.date
    ).all()
    
    macro_totals = MacroTotals()
    meal_items = []
    for m in meals:
        meal_items.append(MealLogItem.from_orm(m))
        macro_totals.calories += m.calories
        macro_totals.protein += m.protein
        macro_totals.carbs += m.carbs
        macro_totals.fats += m.fats
        
    return DailyHistoryDayResponse(
        date=req.date,
        weight=float(summary.weight) if (summary.weight is not None) else None,
        water_intake=float(summary.water_intake),
        workout_completed=summary.workout_completed,
        meals=meal_items,
        macro_totals=macro_totals
    )
