import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import StreakWidget from '@/components/StreakWidget';
import BadgeSection from '@/components/BadgeSection';
import { 
  Sparkles, 
  Activity, 
  Beef, 
  Droplets, 
  Calendar, 
  Utensils, 
  Flame, 
  MessageSquare,
  TrendingUp, 
  Compass, 
  ArrowRight,
  TrendingDown
} from 'lucide-react';

function calculateAge(dobString?: string): number {
  if (!dobString) return 0;
  const dob = new Date(dobString);
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

function calculateBMR(weight: number, height: number, age: number, gender: string): number {
  if (!weight || !height || !age) return 0;
  if (gender === 'Male') {
    return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
  } else if (gender === 'Female') {
    return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161);
  } else {
    return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 78);
  }
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/onboarding');
  }

  // Synchronize profile with backend SQL database for gamification targets
  try {
    const checkRes = await fetch(`http://localhost:8000/profiles/${profile.id}`, { cache: 'no-store' });
    if (checkRes.status === 404) {
      await fetch('http://localhost:8000/profiles/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
    } else if (checkRes.ok) {
      await fetch(`http://localhost:8000/profiles/${profile.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profile)
      });
    }
  } catch (err) {
    console.error('Failed to sync profile with backend database:', err);
  }

  const age = calculateAge(profile.date_of_birth);
  const bmr = calculateBMR(profile.weight, profile.height, age, profile.gender);
  const tdee = Math.round(bmr * 1.375);

  // Calorie adjustments based on Aesthetic Goal
  let calorieTarget = tdee;
  let targetAction = 'Maintenance';
  let coachFocusMsg = '';
  if (profile.target_goal === 'Lean Bulk') {
    calorieTarget = tdee + 300;
    targetAction = 'Surplus (Lean Muscle Build)';
    coachFocusMsg = 'Prioritize a sustained caloric surplus and heavy compound movements to stimulate muscle synthesis.';
  } else if (profile.target_goal === 'Aggressive Cut') {
    calorieTarget = tdee - 500;
    targetAction = 'Deficit (Accelerated Fat Loss)';
    coachFocusMsg = 'Maintain a high protein ratio and precise hydration to preserve lean muscle tissue during fat adaptation.';
  } else if (profile.target_goal === 'V-Taper Focus') {
    calorieTarget = tdee - 150;
    targetAction = 'Recomposition (Waist Reduction)';
    coachFocusMsg = 'Prioritize lateral delt raises, wide pullups, and a slight calorie deficit to maximize shoulder-to-waist proportions.';
  } else if (profile.target_goal === 'Strength & Performance') {
    calorieTarget = tdee + 100;
    targetAction = 'Athletic Performance Boost';
    coachFocusMsg = 'Optimize complex carbohydrate timing around workouts to maximize glycogen stores and explosive lift progression.';
  }

  // Macronutrient calculation
  const proteinTargetGrams = Math.round(profile.weight * 2.0);
  const proteinCalories = proteinTargetGrams * 4;
  const fatCalories = Math.round(calorieTarget * 0.25);
  const fatTargetGrams = Math.round(fatCalories / 9);
  const carbCalories = calorieTarget - proteinCalories - fatCalories;
  const carbTargetGrams = Math.round(carbCalories / 4);

  // Calculate weight delta
  const weightDelta = (profile.weight - profile.target_weight).toFixed(1);
  const isLoss = profile.weight > profile.target_weight;

  // Load gamification status from backend API
  let gamificationStatus: any = null;
  try {
    const gamificationRes = await fetch(`http://localhost:8000/gamification/status/${profile.id}`, {
      cache: 'no-store'
    });
    if (gamificationRes.ok) {
      gamificationStatus = await gamificationRes.json();
    }
  } catch (err) {
    console.error('Failed to fetch gamification status for overview:', err);
  }

  // Load workout plan and nutrition plan dynamically from backend APIs
  let workoutPlan: any = null;
  let nutritionPlan: any = null;

  try {
    const workoutRes = await fetch('http://localhost:8000/workouts/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: {
          name: profile.name,
          gender: profile.gender,
          height: profile.height,
          weight: profile.weight,
          target_weight: profile.target_weight,
          current_physique: profile.current_physique,
          target_goal: profile.target_goal,
          dietary_identity: profile.dietary_identity,
          equipment_access: profile.equipment_access,
        },
        experience_level: 'Intermediate',
        workout_preference: profile.target_goal,
      }),
      next: { revalidate: 3600 }
    });
    if (workoutRes.ok) {
      workoutPlan = await workoutRes.json();
    }
  } catch (err) {
    console.error('Failed to pre-fetch workout details for overview:', err);
  }

  try {
    const nutritionRes = await fetch('http://localhost:8000/nutrition/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: {
          name: profile.name,
          gender: profile.gender,
          height: profile.height,
          weight: profile.weight,
          target_weight: profile.target_weight,
          current_physique: profile.current_physique,
          target_goal: profile.target_goal,
          dietary_identity: profile.dietary_identity,
          equipment_access: profile.equipment_access,
        },
        calories_target: calorieTarget,
        protein_target: proteinTargetGrams,
        carb_target: carbTargetGrams,
        fat_target: fatTargetGrams,
      }),
      next: { revalidate: 3600 }
    });
    if (nutritionRes.ok) {
      nutritionPlan = await nutritionRes.json();
    }
  } catch (err) {
    console.error('Failed to pre-fetch nutrition details for overview:', err);
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative z-10 max-w-5xl mx-auto">
      
      {/* Top Section: Greeting & Goal Progress Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        <div className="md:col-span-2">
          <span className="text-[10px] font-bold text-indigo-650 uppercase tracking-widest bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md inline-block mb-2">
            AI Coach Active
          </span>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900">
            Welcome back, {profile.name}
          </h1>
          <p className="text-slate-500 text-xs mt-1 leading-relaxed">
            Your physical baseline is locked. Below is your optimized daily configuration designed by the health engine.
          </p>
        </div>

        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Target Weight Progress</span>
            <span className="text-slate-500 font-medium">
              {profile.weight_unit === 'lbs' ? `${Math.round(profile.weight * 2.20462)}lbs` : `${profile.weight}kg`} 
              <ArrowRight className="w-3 h-3 inline mx-0.5 text-slate-400" /> 
              {profile.weight_unit === 'lbs' ? `${Math.round(profile.target_weight * 2.20462)}lbs` : `${profile.target_weight}kg`}
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 rounded-full" style={{ width: '60%' }} />
          </div>
          <p className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
            <span>
              {profile.weight_unit === 'lbs' 
                ? `${Math.round(Math.abs(profile.weight - profile.target_weight) * 2.20462)} lbs` 
                : `${Math.abs(profile.weight - profile.target_weight).toFixed(1)} kg`}
              {isLoss ? ' to shed' : ' to gain'} for your target goal.
            </span>
          </p>
        </div>
      </div>

      {/* AI Coach Insights Section */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="pb-2 flex flex-row items-center gap-2 space-y-0">
          <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-650">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-bold text-slate-900">Daily AI Coach Insight</CardTitle>
            <CardDescription className="text-[10px] text-slate-500">Real-time physiological guidance based on your profile.</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-100 text-xs text-slate-700 leading-relaxed">
            <strong className="text-slate-900 block mb-1 font-bold">Coach Recommendation:</strong>
            {nutritionPlan?.daily_nutrition_recommendations || `${coachFocusMsg} Based on your activity index, your Basal Metabolic Rate (BMR) sits at ${bmr} kcal, and your active TDEE is ${tdee} kcal.`}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] font-medium text-slate-600">
            <div className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-all duration-200">
              <span className="w-5 h-5 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs shrink-0">1</span>
              <div>
                <span className="text-slate-900 font-bold block mb-0.5">
                  {workoutPlan?.ai_coach_advice ? 'Workout Insight' : 'Hydration Timing'}
                </span>
                {workoutPlan?.ai_coach_advice || 'Ensure you consume 500ml of water 30 minutes before your first active lift to maximize blood volume.'}
              </div>
            </div>
            <div className="flex items-start gap-2 p-2 rounded-lg border border-slate-100 hover:bg-slate-50 transition-all duration-200">
              <span className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xs shrink-0">2</span>
              <div>
                <span className="text-slate-900 font-bold block mb-0.5">
                  {nutritionPlan?.food_alternatives?.[0] ? 'Suggested Food Swap' : 'Dietary Compliance'}
                </span>
                {nutritionPlan?.food_alternatives?.[0] ? (
                  <span>
                    Swap <strong className="text-slate-950">{nutritionPlan.food_alternatives[0].original_food}</strong> for <strong className="text-emerald-700">{nutritionPlan.food_alternatives[0].alternative_food}</strong>: {nutritionPlan.food_alternatives[0].reason}
                  </span>
                ) : (
                  `Stay aligned with your ${profile.dietary_identity} lifestyle to minimize gut inflammation.`
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Overview Cards: Calories, Protein, Carbs, Fat */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Daily Target Allocation</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Calories */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Calories</span>
                <p className="text-lg font-extrabold text-indigo-650">{calorieTarget}</p>
                <p className="text-[10px] text-slate-500 font-semibold">{targetAction}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Flame className="w-4.5 h-4.5 fill-indigo-600/10" />
              </div>
            </CardContent>
          </Card>

          {/* Protein */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Protein</span>
                <p className="text-lg font-extrabold text-slate-900">{proteinTargetGrams}g</p>
                <p className="text-[10px] text-slate-500">{proteinCalories} kcal target</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                <Beef className="w-4.5 h-4.5" />
              </div>
            </CardContent>
          </Card>

          {/* Carbs */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Carbs</span>
                <p className="text-lg font-extrabold text-slate-900">{carbTargetGrams}g</p>
                <p className="text-[10px] text-slate-500">{carbCalories} kcal target</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-650">
                <Utensils className="w-4.5 h-4.5" />
              </div>
            </CardContent>
          </Card>

          {/* Fat */}
          <Card className="bg-white border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Fat</span>
                <p className="text-lg font-extrabold text-slate-900">{fatTargetGrams}g</p>
                <p className="text-[10px] text-slate-500">{fatCalories} kcal target</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-650">
                <Droplets className="w-4.5 h-4.5" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Streak & Milestone Badges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <StreakWidget
            currentStreak={gamificationStatus?.current_streak ?? 0}
            longestStreak={gamificationStatus?.longest_streak ?? 0}
            streakSecuredToday={gamificationStatus?.streak_secured_today ?? false}
            loggedTotals={gamificationStatus?.logged_totals ?? { calories: 0, protein: 0, carbs: 0, fats: 0 }}
            targetMacros={gamificationStatus?.target_macros ?? { calories: calorieTarget, protein: proteinTargetGrams, carbs: carbTargetGrams, fats: fatTargetGrams }}
          />
        </div>
        <div className="md:col-span-2">
          <BadgeSection
            unlockedBadges={gamificationStatus?.unlocked_badges ?? []}
          />
        </div>
      </div>

      {/* Today's Focus Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-650" /> Today's Workout Focus
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Scheduled active muscle split target.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full inline-block mb-1">
                  {workoutPlan?.workout_split || 'V-Taper Split'}
                </span>
                <p className="text-xs font-bold text-slate-850">
                  {workoutPlan?.weekly_schedule?.[0]?.focus || 'Upper Body Hypertrophy'}
                </p>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-white border px-2.5 py-1 rounded-full shadow-sm">
                60 Mins
              </span>
            </div>
            <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
              {workoutPlan?.ai_coach_advice || `Ensure heavy lift progressions for shoulder width Expansion and mid-back density to support your registered ${profile.target_goal} goal.`}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Utensils className="w-4 h-4 text-indigo-650" /> Today's Nutrition Focus
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">Dietary compliance thresholds.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 pt-1">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full inline-block mb-1">
                  {profile.dietary_identity}
                </span>
                <p className="text-xs font-bold text-slate-850">
                  {nutritionPlan?.meal_suggestions?.[0] ? `Suggested ${nutritionPlan.meal_suggestions[0].meal_type}` : 'Target Compliance Ratio'}
                </p>
              </div>
              <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-100 px-2.5 py-1 rounded-full shadow-sm">
                100%
              </span>
            </div>
            <p className="text-[11px] text-slate-550 leading-relaxed font-medium">
              {nutritionPlan?.meal_suggestions?.[0] ? (
                <span>
                  For a clean {nutritionPlan.meal_suggestions[0].meal_type.toLowerCase()}, try: <strong className="text-slate-850">{nutritionPlan.meal_suggestions[0].name}</strong> ({nutritionPlan.meal_suggestions[0].estimated_calories} kcal, {nutritionPlan.meal_suggestions[0].protein} Protein, {nutritionPlan.meal_suggestions[0].carbs} Carbs).
                </span>
              ) : (
                `Focus on eating clean sources that support your lifestyle while hitting your precise target of ${proteinTargetGrams}g protein.`
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress Section */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4 text-indigo-650" /> Weekly Progress Tracker
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">Visualize body fat indices and consistency trends.</CardDescription>
        </CardHeader>
        <CardContent className="pt-1">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 flex flex-col justify-between h-28">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Weight Trend</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900">
                  {profile.weight_unit === 'lbs' ? `${Math.round(profile.weight * 2.20462)} lbs` : `${profile.weight} kg`}
                </span>
                <span className="text-[10px] font-bold text-emerald-650">
                  {profile.weight_unit === 'lbs' ? '-1.1 lbs this week' : '-0.5kg this week'}
                </span>
              </div>
              <div className="h-6 flex items-end gap-1.5 w-full">
                {[30, 45, 60, 50, 65, 80, 70].map((h, i) => (
                  <div key={i} className="flex-1 bg-slate-200 h-full rounded-sm" style={{ height: `${h}%` }} />
                ))}
              </div>
            </div>

            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 flex flex-col justify-between h-28">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Estimated Body Fat</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900">14.8 %</span>
                <span className="text-[10px] font-bold text-indigo-600">Optimal Range</span>
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: '45%' }} />
              </div>
            </div>

            <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/50 flex flex-col justify-between h-28">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Compliance Index</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-slate-900">92 %</span>
                <span className="text-[10px] font-bold text-emerald-650">Highly Consistent</span>
              </div>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((d) => (
                  <div key={d} className="w-4 h-4 rounded bg-indigo-50 border border-indigo-200 flex items-center justify-center text-[8px] font-bold text-indigo-600">✓</div>
                ))}
                {[6, 7].map((d) => (
                  <div key={d} className="w-4 h-4 rounded bg-slate-100 border border-slate-250 flex items-center justify-center text-[8px] font-bold text-slate-400">-</div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
    </div>
  );
}
