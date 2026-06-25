import json
import logging
from typing import Optional
import google.generativeai as genai
from ..config import settings
from ..schemas.profile import ProfileBase
from ..schemas.workout import WorkoutResponse, WeeklyScheduleItem, WorkoutPlanDay, ExerciseItem
from ..schemas.nutrition import NutritionResponse, MealSuggestionItem, FoodAlternativeItem, MealAnalyzeResponse, HydrationResponse

logger = logging.getLogger(__name__)

if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

class GeminiService:
    @staticmethod
    def _is_configured() -> bool:
        return bool(settings.GEMINI_API_KEY)

    @classmethod
    def generate_workout_plan(
        cls, 
        profile: ProfileBase, 
        experience_level: str, 
        workout_preference: Optional[str] = None,
        feel_sore: bool = False
    ) -> WorkoutResponse:
        if not cls._is_configured():
            logger.warning("Gemini API key is not configured. Returning mock workout plan.")
            return cls._get_mock_workout_plan(profile, experience_level, workout_preference, feel_sore)

        # Prepare user description prompt
        prompt = f"""
        Generate a personalized workout plan and weekly split for a user with the following profile:
        - Name: {profile.name or 'Athlete'}
        - Gender: {profile.gender or 'Not Specified'}
        - Height: {profile.height or 175} cm
        - Weight: {profile.weight or 70} kg
        - Target Weight: {profile.target_weight or 70} kg
        - Current Physique: {profile.current_physique or 'Average'}
        - Target Goal: {profile.target_goal or 'V-Taper Focus'}
        - Equipment Access: {profile.equipment_access or 'Commercial Gym'}
        - Experience Level: {experience_level}
        - Preference: {workout_preference or 'None'}
        - STATE: User is feeling sore? {feel_sore}

        CRITICAL DIRECTION: If Soreness state is True, you MUST skip all heavy weight lifting workouts. Instead, replace ALL scheduled sessions with dynamic mobility, deep static stretching, yoga, walking, and active recovery routines.

        Return your output strictly as a JSON object matching the following structure:
        {{
            "workout_split": "Mobility & Recovery" if sore else "Push/Pull/Legs",
            "weekly_schedule": [
                {{"day": "Monday", "focus": "Gentle Yoga & Stretching Flow" if sore else "Push Day", "is_rest_day": false}}
            ],
            "daily_workouts": [
                {{
                    "day": "Monday",
                    "workout_name": "Active Recovery & Stretching",
                    "exercises": [
                        {{
                            "name": "Hamstring Stretch",
                            "target_muscle": "Hamstrings",
                            "sets": "3 sets",
                            "reps": "30 sec hold",
                            "coaching_tip": "Keep breath deep and relaxed, do not force the stretch."
                        }}
                    ]
                }}
            ],
            "ai_coach_advice": "A short recovery-focused advice paragraph explaining why mobility is critical today."
        }}
        """

        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            return WorkoutResponse(**data)
        except Exception as e:
            logger.error(f"Error calling Gemini API for workout plan: {e}")
            # Dynamic fallback to mock data on rate limit or API failure
            return cls._get_mock_workout_plan(profile, experience_level, workout_preference, feel_sore)

    @classmethod
    def generate_nutrition_plan(
        cls,
        profile: ProfileBase,
        calories: int,
        protein: int,
        carbs: int,
        fats: int
    ) -> NutritionResponse:
        if not cls._is_configured():
            logger.warning("Gemini API key is not configured. Returning mock nutrition plan.")
            return cls._get_mock_nutrition_plan(profile, calories, protein, carbs, fats)

        prompt = f"""
        Generate a personalized nutrition plan and daily meal suggestions for a user with the following profile:
        - Name: {profile.name or 'Athlete'}
        - Goal: {profile.target_goal or 'V-Taper Focus'}
        - Dietary Style: {profile.dietary_identity or 'Non-Veg'}
        - Target Daily Calories: {calories} kcal
        - Target Protein: {protein}g
        - Target Carbs: {carbs}g
        - Target Fats: {fats}g

        Return your output strictly as a JSON object matching the following structure:
        {{
            "daily_nutrition_recommendations": "Overall advice explaining targets and how to fulfill them.",
            "meal_suggestions": [
                {{
                    "meal_type": "Breakfast",
                    "name": "Scrambled Eggs with Spinach",
                    "estimated_calories": 350,
                    "protein": "25g",
                    "carbs": "5g",
                    "fats": "18g",
                    "ingredients": ["3 large eggs", "1 cup baby spinach", "1 tsp olive oil"]
                }}
            ],
            "food_alternatives": [
                {{
                    "original_food": "Jasmine Rice",
                    "alternative_food": "Quinoa",
                    "reason": "Offers more fiber and higher trace amino acids."
                }}
            ]
        }}
        """

        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            return NutritionResponse(**data)
        except Exception as e:
            logger.error(f"Error calling Gemini API for nutrition plan: {e}")
            return cls._get_mock_nutrition_plan(profile, calories, protein, carbs, fats)

    @staticmethod
    def _get_mock_workout_plan(profile: ProfileBase, experience: str, pref: Optional[str], feel_sore: bool = False) -> WorkoutResponse:
        import random
        goal = profile.target_goal or "V-Taper Focus"
        equip = profile.equipment_access or "Commercial Gym"
        
        if feel_sore:
            split_name = "Active Recovery & Mobility"
            schedule = [
                WeeklyScheduleItem(day="Monday", focus="Lower Body Mobility Flow", is_rest_day=False),
                WeeklyScheduleItem(day="Tuesday", focus="Upper Body Stretching & Yoga", is_rest_day=False),
                WeeklyScheduleItem(day="Wednesday", focus="Rest & Hydration Recovery", is_rest_day=True),
                WeeklyScheduleItem(day="Thursday", focus="Full Body Foam Rolling & Soft Tissue Work", is_rest_day=False),
                WeeklyScheduleItem(day="Friday", focus="Active recovery (45m brisk walk)", is_rest_day=False),
                WeeklyScheduleItem(day="Saturday", focus="Active recovery (30m Cardio walk)", is_rest_day=True),
                WeeklyScheduleItem(day="Sunday", focus="Rest", is_rest_day=True),
            ]
            
            mobility_exercises = [
                ExerciseItem(name="90/90 Hip Swivels", target_muscle="Hips", sets="3 sets", reps="10 reps/side", coaching_tip="Keep torso upright, rotate hips slowly."),
                ExerciseItem(name="World's Greatest Stretch", target_muscle="Thoracic Spine & Hips", sets="3 sets", reps="6 reps/side", coaching_tip="Step forward, twist torso towards front leg."),
                ExerciseItem(name="Deep Squat Hold", target_muscle="Ankles & Groin", sets="3 sets", reps="30 sec hold", coaching_tip="Sit deep, keep heels flat on the floor."),
                ExerciseItem(name="Cat-Cow Spine Flow", target_muscle="Spine", sets="3 sets", reps="12 reps", coaching_tip="Flow smoothly with your breathing to release tension."),
                ExerciseItem(name="Cossack Squats", target_muscle="Hips & Groin", sets="3 sets", reps="8 reps/side", coaching_tip="Keep heels flat, sink weight to the side.")
            ]
            
            stretching_exercises = [
                ExerciseItem(name="Child's Pose", target_muscle="Lats & Upper Back", sets="3 sets", reps="45 sec hold", coaching_tip="Reach arms forward, push hips back to heels."),
                ExerciseItem(name="Thread the Needle", target_muscle="Shoulders & Mid-back", sets="3 sets", reps="8 reps/side", coaching_tip="Slide arm underneath chest, feel shoulder stretch."),
                ExerciseItem(name="Pigeon Pose Stretch", target_muscle="Glutes & Piriformis", sets="3 sets", reps="45 sec/side", coaching_tip="Keep hips square, slide opposite leg straight back."),
                ExerciseItem(name="Doorway Chest Stretch", target_muscle="Pectorals", sets="3 sets", reps="30 sec hold", coaching_tip="Step forward gently to open up front chest wall.")
            ]
            
            # Select random subset to feel dynamic
            daily = [
                WorkoutPlanDay(
                    day="Monday",
                    workout_name="Dynamic Lower Body Mobility",
                    exercises=random.sample(mobility_exercises, 3)
                ),
                WorkoutPlanDay(
                    day="Thursday",
                    workout_name="Upper Body Stretching",
                    exercises=random.sample(stretching_exercises, 2)
                )
            ]
            advice = "AI Coach Note: You are feeling sore today. All heavy lifts have been swapped out. Focus on breathwork, slow joint rotations, and active tissue bloodflow."
        else:
            split_name = "Push / Pull / Legs"
            if goal == "V-Taper Focus":
              split_name = "Shoulder & Lat Hypertrophy Focus"
            elif goal == "Aggressive Cut":
              split_name = "High Density Full Body Conditioning"

            schedule = [
                WeeklyScheduleItem(day="Monday", focus="Upper Body (Lat & Shoulder expansion)", is_rest_day=False),
                WeeklyScheduleItem(day="Tuesday", focus="Lower Body (Quad focus)", is_rest_day=False),
                WeeklyScheduleItem(day="Wednesday", focus="Rest & Hydration Recovery", is_rest_day=True),
                WeeklyScheduleItem(day="Thursday", focus="Upper Body Pull (Mid Back & Rear Delts)", is_rest_day=False),
                WeeklyScheduleItem(day="Friday", focus="Arm and Shoulder Core Conditioning", is_rest_day=False),
                WeeklyScheduleItem(day="Saturday", focus="Active recovery (30m Cardio walk)", is_rest_day=True),
                WeeklyScheduleItem(day="Sunday", focus="Rest", is_rest_day=True),
            ]

            is_rebuild = pref is not None and "hypertrophy" in pref.lower()
            
            if is_rebuild:
                monday_exercises = [
                    ExerciseItem(name="Weighted Pullups", target_muscle="Lats", sets="4 sets", reps="8-10 reps", coaching_tip="Control the descent, squeeze lats at the top."),
                    ExerciseItem(name="Cable Lateral Y-Raises", target_muscle="Lateral Delts", sets="4 sets", reps="12-15 reps", coaching_tip="Set cables at wrist height, pull in a Y-shape."),
                    ExerciseItem(name="Chest Supported T-Bar Row", target_muscle="Upper Back", sets="3 sets", reps="10-12 reps", coaching_tip="Squeeze upper back at the peak contraction.")
                ]
                thursday_exercises = [
                    ExerciseItem(name="Dumbbell Rear Delt Flyes", target_muscle="Rear Delts", sets="4 sets", reps="15 reps", coaching_tip="Keep pinkies high, control the weight."),
                    ExerciseItem(name="Flat Barbell Bench Press", target_muscle="Upper Chest", sets="3 sets", reps="8 reps", coaching_tip="Keep shoulder blades retracted, push through feet.")
                ]
                advice = f"AI Coach Note: Routine regenerated with custom hypertrophy optimization. Target ranges, loads, and exercises have been updated for your '{goal}' goal."
            else:
                monday_exercises = [
                    ExerciseItem(name="Wide Grip Lat Pulldown", target_muscle="Lats", sets="4 sets", reps="10-12 reps", coaching_tip="Pull with your elbows, not hands."),
                    ExerciseItem(name="Dumbbell Lateral Raise", target_muscle="Lateral Delts", sets="4 sets", reps="15 reps", coaching_tip="Keep shoulders down, raise weights slightly forward."),
                    ExerciseItem(name="Supported Rows", target_muscle="Upper Back", sets="3 sets", reps="8-10 reps", coaching_tip="Squeeze shoulder blades for 1 second at apex.")
                ]
                thursday_exercises = [
                    ExerciseItem(name="Face Pulls", target_muscle="Rear Delts / Rotator Cuff", sets="4 sets", reps="15 reps", coaching_tip="Pull towards nose and squeeze back of shoulders."),
                    ExerciseItem(name="Incline DB Press", target_muscle="Upper Chest", sets="3 sets", reps="10 reps", coaching_tip="Control negative phase for 3 seconds.")
                ]
                advice = f"Welcome to the {experience} dynamic coaching regimen. Since you are focused on '{goal}' using a '{equip}', ensure progress loads are recorded. Drink sufficient water."

            # Add minor random variations to reps and sets to make it feel alive
            if random.random() > 0.5:
                for ex in monday_exercises + thursday_exercises:
                    if "4 sets" in ex.sets and random.random() > 0.6:
                        ex.sets = "3 sets"
                    elif "3 sets" in ex.sets and random.random() > 0.6:
                        ex.sets = "4 sets"

            daily = [
                WorkoutPlanDay(
                    day="Monday",
                    workout_name="Lat Width Expansion" if not is_rebuild else "Advanced Upper Hypertrophy",
                    exercises=monday_exercises
                ),
                WorkoutPlanDay(
                    day="Thursday",
                    workout_name="Upper Body Pull & Shoulders" if not is_rebuild else "Upper Body Strength Rebuild",
                    exercises=thursday_exercises
                )
            ]

        return WorkoutResponse(
            workout_split=split_name,
            weekly_schedule=schedule,
            daily_workouts=daily,
            ai_coach_advice=advice
        )


    @staticmethod
    def _get_mock_nutrition_plan(profile: ProfileBase, cal: int, pro: int, carb: int, fat: int) -> NutritionResponse:
        diet = profile.dietary_identity or "Non-Veg"
        goal = profile.target_goal or "V-Taper Focus"

        rec = f"AI Advice: Maintain a stable daily intake of {cal} kcal targeting {pro}g protein to preserve lean structure on your {goal} split. Keep sodium levels in check."

        meals = [
            MealSuggestionItem(
                meal_type="Breakfast",
                name="Egg Whites & Avocado Toast" if diet != "Strict Veg" else "Tofu Scramble & Avocado Toast",
                estimated_calories=380,
                protein=f"{pro // 4}g",
                carbs="35g",
                fats="12g",
                ingredients=["4 egg whites (or 150g firm tofu)", "1 slice whole wheat bread", "30g ripe avocado"]
            ),
            MealSuggestionItem(
                meal_type="Lunch",
                name="Double Breast Grilled Chicken with Basmati" if diet == "Non-Veg" else "High-Protein Lentil Stew with Quinoa",
                estimated_calories=550,
                protein=f"{pro // 3}g",
                carbs="60g",
                fats="8g",
                ingredients=["180g Chicken breast (or 200g cooked lentils)", "100g cooked rice or quinoa", "1 cup steamed broccoli"]
            )
        ]

        alts = [
            FoodAlternativeItem(original_food="White Bread", alternative_food="Whole Oats", reason="Provides complex low-glycemic carbohydrates and high prebiotic fiber."),
            FoodAlternativeItem(original_food="Egg Whites", alternative_food="Tempeh", reason="Excellent vegan alternative with rich prebiotic protein fibers.")
        ]

        return NutritionResponse(
            daily_nutrition_recommendations=rec,
            meal_suggestions=meals,
            food_alternatives=alts
        )

    @classmethod
    def analyze_meal(
        cls, 
        description: str, 
        meal_type: str = "Lunch"
    ) -> MealAnalyzeResponse:
        if not cls._is_configured():
            logger.warning("Gemini API key is not configured. Returning mock meal analysis.")
            return cls._get_mock_meal_analysis(description, meal_type)

        prompt = f"""
        Analyze the following meal description and estimate its macro-nutrients and key ingredients:
        - Meal Description: "{description}"
        - Meal Type: {meal_type}

        Return your output strictly as a JSON object matching the following structure:
        {{
            "name": "Proper capitalized name of the meal",
            "meal_type": "{meal_type}",
            "estimated_calories": 420,
            "protein": "25g",
            "carbs": "45g",
            "fats": "12g",
            "ingredients": ["ingredient 1", "ingredient 2"]
        }}
        """

        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            return MealAnalyzeResponse(**data)
        except Exception as e:
            logger.error(f"Error calling Gemini API for meal analysis: {e}")
            return cls._get_mock_meal_analysis(description, meal_type)

    @staticmethod
    def _get_mock_meal_analysis(description: str, meal_type: str) -> MealAnalyzeResponse:
        # Generate simple realistic numbers based on keywords
        desc_lower = description.lower()
        cal = 350
        pro = 20
        carb = 35
        fat = 10
        name = "Logged Meal"

        if "chicken" in desc_lower or "breast" in desc_lower:
            name = "Grilled Chicken Meal"
            cal = 480
            pro = 38
            carb = 25
            fat = 8
        elif "egg" in desc_lower or "scramble" in desc_lower:
            name = "Scrambled Eggs Breakfast"
            cal = 320
            pro = 24
            carb = 8
            fat = 18
        elif "shake" in desc_lower or "protein" in desc_lower or "whey" in desc_lower:
            name = "Whey Protein Shake"
            cal = 240
            pro = 28
            carb = 15
            fat = 3
        elif "salad" in desc_lower:
            name = "Fresh Green Salad"
            cal = 180
            pro = 6
            carb = 12
            fat = 10
            
        ingredients = [x.strip() for x in description.split(",") if x.strip()]
        if not ingredients:
            ingredients = [description]

        return MealAnalyzeResponse(
            name=name,
            meal_type=meal_type,
            estimated_calories=cal,
            protein=f"{pro}g",
            carbs=f"{carb}g",
            fats=f"{fat}g",
            ingredients=ingredients
        )

    @classmethod
    def generate_grocery_list(cls, dietary_identity: str, meal_suggestions: list) -> dict:
        # Define default categories structured fallback
        mock_grocery = {
            "vegetables": [
                {"name": "Baby Spinach", "quantity": "1 big bag"},
                {"name": "Broccoli", "quantity": "2 large heads"},
                {"name": "Sweet Potatoes", "quantity": "1 kg"}
            ],
            "fruits": [
                {"name": "Blueberries", "quantity": "2 boxes"},
                {"name": "Bananas", "quantity": "1 dozen"}
            ],
            "protein_sources": [
                {"name": "Egg Whites" if dietary_identity != "Strict Veg" else "Firm Tofu", "quantity": "2 cartons" if dietary_identity != "Strict Veg" else "3 blocks"},
                {"name": "Chicken Breast" if dietary_identity == "Non-Veg" else "Lentils", "quantity": "1.5 kg" if dietary_identity == "Non-Veg" else "1 bag"}
            ],
            "dairy": [
                {"name": "Greek Yogurt" if dietary_identity != "Dairy-Free" else "Almond Milk", "quantity": "1 large tub" if dietary_identity != "Dairy-Free" else "2 liters"}
            ],
            "grains": [
                {"name": "Basmati Rice", "quantity": "1 kg"},
                {"name": "Quinoa", "quantity": "500g"}
            ],
            "snacks": [
                {"name": "Mixed Nuts", "quantity": "1 pack"},
                {"name": "Rice Cakes", "quantity": "2 packs"}
            ]
        }

        if not cls._is_configured():
            return mock_grocery

        meal_names = [m.get("name", "") if isinstance(m, dict) else getattr(m, "name", "") for m in meal_suggestions]
        prompt = f"""
        Generate a weekly categorized grocery list with estimated quantities based on:
        - Diet Type: {dietary_identity}
        - Scheduled Meals: {', '.join(meal_names)}

        Group items strictly into the following categories:
        - vegetables
        - fruits
        - protein_sources
        - dairy
        - grains
        - snacks

        Return your output strictly as a JSON object matching this structure:
        {{
            "vegetables": [{{"name": "Spinach", "quantity": "1 bag"}}],
            "fruits": [{{"name": "Apples", "quantity": "5 units"}}],
            "protein_sources": [],
            "dairy": [],
            "grains": [],
            "snacks": []
        }}
        """

        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error calling Gemini for grocery list: {e}")
            return mock_grocery

    @classmethod
    def generate_hydration_recommendation(
        cls,
        weight: float,
        tdee: int,
        is_workout_day: bool,
        activity_level: str
    ) -> HydrationResponse:
        # Calculate hydration target using the formula
        base_liters = (weight * 35) / 1000.0
        
        # TDEE bonus
        tdee_bonus = 0.0
        if tdee > 2000:
            tdee_bonus = (tdee - 2000) / 5000.0
        
        # Activity level modifier
        activity_mods = {
            "Sedentary": 0.0,
            "Lightly Active": 0.2,
            "Moderately Active": 0.4,
            "Very Active": 0.6
        }
        activity_bonus = activity_mods.get(activity_level, 0.4)
        
        # Workout day modifier
        workout_bonus = 0.75 if is_workout_day else 0.0
        
        total_target = round(base_liters + tdee_bonus + activity_bonus + workout_bonus, 2)

        # Build dynamic advice fallback
        weight_advice = f"For your {weight}kg bodyweight, a baseline of {round(weight * 35 / 1000, 1)}L is recommended."
        if is_workout_day:
            workout_advice = f"Since today is a workout day, target an extra 750ml during/after exercise to cover sweat loss."
        else:
            workout_advice = f"Today is a rest day, so stick to regular spacing of fluid intake."

        activity_advice = ""
        if activity_level == "Very Active":
            activity_advice = "Your high activity profile requires consistent electrolyte replenishment."
        elif activity_level == "Moderately Active":
            activity_advice = "Maintain moderate pacing with a focus on hydration around your active hours."
        else:
            activity_advice = "Ensure baseline intake even on sedentary days to keep BMR optimized."

        timing_advice = f"Consume 500ml in the morning, space out 250-500ml intervals between meals, and aim for a total of {total_target}L today."
        
        fallback_rec = f"{weight_advice} {workout_advice} {activity_advice} {timing_advice}"

        if not cls._is_configured():
            logger.warning("Gemini API key is not configured. Returning calculated target with mock recommendation.")
            return HydrationResponse(daily_target_liters=total_target, ai_recommendation=fallback_rec)

        prompt = f"""
        Generate a personalized daily hydration recommendation and timing strategy based on:
        - User Weight: {weight} kg
        - Daily Energy Expenditure (TDEE): {tdee} kcal
        - Today is a Workout Day: {is_workout_day}
        - Activity Level: {activity_level}
        Calculated daily hydration target is: {total_target} Liters.

        Explain when the user should drink water (e.g. pre-workout, post-workout, morning, evening), tips on electrolyte intake if needed, and brief coaching advice in 2-3 sentences. Keep the recommendation concise, professional, and directly actionable.
        
        Return your output strictly as a JSON object matching this structure:
        {{
            "daily_target_liters": {total_target},
            "ai_recommendation": "Coaching advice explaining timing and hydration strategies."
        }}
        """

        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
            response = model.generate_content(
                prompt,
                generation_config={"response_mime_type": "application/json"}
            )
            data = json.loads(response.text)
            if "daily_target_liters" not in data:
                data["daily_target_liters"] = total_target
            return HydrationResponse(**data)
        except Exception as e:
            logger.error(f"Error calling Gemini for hydration: {e}")
            return HydrationResponse(daily_target_liters=total_target, ai_recommendation=fallback_rec)


