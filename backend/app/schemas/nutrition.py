from pydantic import BaseModel, Field
from typing import Optional, List
from uuid import UUID
from .profile import ProfileBase

class NutritionRequest(BaseModel):
    user_id: Optional[UUID] = None
    profile: Optional[ProfileBase] = None
    calories_target: Optional[int] = Field(default=None, description="Custom target calories if not using profile calculations")
    protein_target: Optional[int] = Field(default=None, description="Custom target protein in grams")
    carb_target: Optional[int] = Field(default=None, description="Custom target carbs in grams")
    fat_target: Optional[int] = Field(default=None, description="Custom target fats in grams")

class MealSuggestionItem(BaseModel):
    meal_type: str = Field(description="Breakfast, Lunch, Dinner, or Snack")
    name: str
    estimated_calories: int
    protein: str
    carbs: str
    fats: str
    ingredients: List[str]

class FoodAlternativeItem(BaseModel):
    original_food: str
    alternative_food: str
    reason: str

class NutritionResponse(BaseModel):
    daily_nutrition_recommendations: str
    meal_suggestions: List[MealSuggestionItem]
    food_alternatives: List[FoodAlternativeItem]

class MealAnalyzeRequest(BaseModel):
    description: str
    meal_type: Optional[str] = Field(default="Lunch", description="Breakfast, Lunch, Dinner, or Snack")

class MealAnalyzeResponse(BaseModel):
    name: str
    meal_type: str
    estimated_calories: int
    protein: str
    carbs: str
    fats: str
    ingredients: List[str]

class GroceryItem(BaseModel):
    name: str
    quantity: str

class GroceryListResponse(BaseModel):
    vegetables: List[GroceryItem] = []
    fruits: List[GroceryItem] = []
    protein_sources: List[GroceryItem] = []
    dairy: List[GroceryItem] = []
    grains: List[GroceryItem] = []
    snacks: List[GroceryItem] = []


class HydrationRequest(BaseModel):
    weight: float = Field(..., description="Weight of the user in kg")
    tdee: int = Field(..., description="TDEE of the user in kcal")
    is_workout_day: bool = Field(default=False, description="Whether it is a workout day")
    activity_level: str = Field(default="Moderately Active", description="Activity level: Sedentary, Lightly Active, Moderately Active, Very Active")


class HydrationResponse(BaseModel):
    daily_target_liters: float = Field(..., description="Calculated hydration target in Liters")
    ai_recommendation: str = Field(..., description="AI generated recommendation for hydration timing and habits")


class VoiceMealLogResponse(BaseModel):
    transcription: str
    analysis: MealAnalyzeResponse


class OCRMealAnalysisResponse(BaseModel):
    name: str
    estimated_calories: int
    protein: str
    carbs: str
    fats: str
    serving_size: Optional[str] = "1 serving"
    raw_text_summary: Optional[str] = ""




