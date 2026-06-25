import sqlite3
import os
from datetime import date

db_path = 'fitai.db'
if not os.path.exists(db_path):
    # Try parent directory or absolute path
    db_path = os.path.join(os.path.dirname(__file__), 'fitai.db')

print(f"Connecting to database at: {os.path.abspath(db_path)}")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Exact database ID without hyphens
user_id = '187737e27b0d4678a3d1e34047eedd28'
today_str = '2026-06-25'

# 1. Clear existing entries for today
cursor.execute("DELETE FROM meal_logs WHERE user_id = ? AND date = ?", (user_id, today_str))
cursor.execute("DELETE FROM daily_summaries WHERE user_id = ? AND date = ?", (user_id, today_str))
cursor.execute("DELETE FROM streak_history WHERE user_id = ? AND completed_date = ?", (user_id, today_str))
cursor.execute("DELETE FROM user_streaks WHERE user_id = ?", (user_id,))
print("Cleared old database records for today to prepare clean slots.")

# 2. Insert perfect target-aligned meals (Target: 1712 kcal, 116g protein)
perfect_meals = [
    ('Oatmeal & Protein Shake', 'Breakfast', 400, 25, 50, 10, today_str),
    ('Grilled Chicken & Jasmine Rice', 'Lunch', 800, 60, 90, 15, today_str),
    ('Eggs & Avocado Toast', 'Dinner', 512, 31, 45, 18, today_str)
]

for name, meal_type, cal, pro, carb, fat, d in perfect_meals:
    cursor.execute("""
        INSERT INTO meal_logs (user_id, date, name, meal_type, calories, protein, carbs, fats, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    """, (user_id, d, name, meal_type, cal, pro, carb, fat))
print("Inserted 3 perfect target-aligned meals (Total: 1712 kcal, 116g protein).")

# 3. Insert daily summary (Weight: 58kg, Water: 3.0L, Workout: Completed)
cursor.execute("""
    INSERT INTO daily_summaries (user_id, date, weight, water_intake, workout_completed, created_at, updated_at)
    VALUES (?, ?, 58.0, 3.0, 1, datetime('now'), datetime('now'))
""", (user_id, today_str))
print("Inserted today's daily summary.")

# 4. Insert active streak counter (Streak: 1 Day)
cursor.execute("""
    INSERT INTO user_streaks (user_id, current_streak, longest_streak, last_completed_date, created_at, updated_at)
    VALUES (?, 1, 1, ?, datetime('now'), datetime('now'))
""", (user_id, today_str))
print("Seeded active streak counter to 1.")

# 5. Insert streak history as secured/completed
cursor.execute("""
    INSERT INTO streak_history (user_id, completed_date, meals_logged, macros_met, calories_logged, protein_logged, carbs_logged, fats_logged, created_at)
    VALUES (?, ?, 1, 1, 1712, 116, 185, 43, datetime('now'))
""", (user_id, today_str))
print("Seeded streak history record as secured.")

conn.commit()
conn.close()
print("Database successfully updated with the correct user ID format!")
