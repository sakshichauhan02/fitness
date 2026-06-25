'use client';

import React, { useState, useEffect } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Activity, 
  Sparkles, 
  Flame, 
  Dumbbell, 
  Timer, 
  PlusCircle, 
  PlayCircle,
  TrendingUp,
  Target,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Exercise {
  name: string;
  target_muscle: string;
  sets: string;
  reps: string;
  coaching_tip: string;
}

interface ScheduleItem {
  day: string;
  focus: string;
  is_rest_day: boolean;
}

interface DailyWorkout {
  day: string;
  workout_name: string;
  exercises: Exercise[];
}

export default function WorkoutPlanPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [workoutData, setWorkoutData] = useState<any>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [feelSore, setFeelSore] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: userProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        setProfile(userProfile);
        
        if (userProfile) {
          await fetchWorkoutPlan(userProfile, '', false);
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const fetchWorkoutPlan = async (userProfile: any, customPreference: string = '', soreState: boolean = false) => {
    setGenerating(true);
    try {
      const response = await fetch(`${API_BASE_URL}/workouts/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          profile: {
            name: userProfile.name,
            gender: userProfile.gender,
            height: userProfile.height,
            weight: userProfile.weight,
            target_weight: userProfile.target_weight,
            current_physique: userProfile.current_physique,
            target_goal: userProfile.target_goal,
            dietary_identity: userProfile.dietary_identity,
            equipment_access: userProfile.equipment_access,
          },
          experience_level: 'Intermediate',
          workout_preference: customPreference || userProfile.target_goal,
          feel_sore: soreState
        }),
      });

      const data = await response.json();
      setWorkoutData(data);
      
      // Find the first non-rest day to set active
      const firstActiveDayIdx = data.daily_workouts?.findIndex(
        (dw: DailyWorkout) => dw.exercises && dw.exercises.length > 0
      );
      if (firstActiveDayIdx !== -1) {
        setActiveDayIndex(firstActiveDayIdx);
      }
    } catch (err) {
      console.error('Failed to generate workout plan from backend:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleSoreness = async (checked: boolean) => {
    setFeelSore(checked);
    if (profile) {
      await fetchWorkoutPlan(profile, checked ? 'mobility active recovery' : '', checked);
    }
  };

  const handleRebuildRoutine = () => {
    if (profile) {
      fetchWorkoutPlan(profile, 'hypertrophy optimization', feelSore);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-3">
        <div className="w-8 h-8 border-4 border-indigo-650 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold">Loading your physical split details...</p>
      </div>
    );
  }

  const activeWorkout = workoutData?.daily_workouts?.[activeDayIndex];

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative z-10 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="w-5.5 h-5.5 text-indigo-650" /> Workout Plan
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">AI-generated hyper-personalized workout structure mapped to your specific goals.</p>
        </div>
        
        <div className="flex items-center gap-4 self-start md:self-center">
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl cursor-pointer hover:bg-slate-100/70 select-none">
            <input 
              type="checkbox" 
              checked={feelSore}
              onChange={(e) => handleToggleSoreness(e.target.checked)}
              className="rounded border-slate-350 text-indigo-650 focus:ring-indigo-500 cursor-pointer size-4"
            />
            <span>Feeling Sore Today?</span>
          </label>

          <Button 
            onClick={handleRebuildRoutine}
            disabled={generating}
            className="bg-indigo-650 hover:bg-indigo-750 text-white font-semibold text-xs px-3.5 h-8.5 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition-transform duration-200 hover:scale-102"
          >
            {generating ? 'Regenerating...' : 'Generate New Routine'} 
            <Sparkles className="w-4 h-4 text-white/80" />
          </Button>
        </div>
      </div>

      {generating ? (
        <div className="flex flex-col items-center justify-center min-h-[300px] bg-white border border-slate-200 shadow-sm rounded-2xl p-6 text-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <h2 className="text-sm font-bold text-slate-800">Analyzing physical bio-metrics...</h2>
          <p className="text-xs text-slate-500 max-w-xs leading-normal">Gemini is structuring your rep goals, target intensities, and weight splits.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* WORKOUT SPECIFIC SPLIT ROUTINE */}
          <div className="lg:col-span-2 space-y-4">
            {activeWorkout ? (
              <Card className="bg-white border border-slate-200 shadow-md rounded-2xl relative overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between pb-3">
                  <div>
                    <CardTitle className="text-sm font-bold text-slate-900">{activeWorkout.workout_name}</CardTitle>
                    <CardDescription className="text-xs text-slate-500">Day Focus: {activeWorkout.day}</CardDescription>
                  </div>
                  <div className="text-[10px] text-slate-650 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-1 flex items-center gap-1 font-bold shadow-sm">
                    <Timer className="w-3.5 h-3.5 text-indigo-600" />
                    <span>60 mins</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2.5">
                    {activeWorkout.exercises.map((ex: Exercise, idx: number) => (
                      <div key={idx} className="bg-slate-50/70 border border-slate-200/50 rounded-xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase font-bold text-indigo-700 tracking-wider bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full inline-block">
                            {ex.target_muscle}
                          </span>
                          <h3 className="text-xs font-bold text-slate-850">{ex.name}</h3>
                          <p className="text-[10px] text-slate-500 italic leading-normal">{ex.coaching_tip}</p>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-bold">
                          <div className="text-right">
                            <p className="text-slate-800">{ex.sets}</p>
                            <p className="text-[10px] text-slate-500 font-semibold">{ex.reps}</p>
                          </div>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-slate-400 hover:text-indigo-600 rounded-lg">
                            <PlayCircle className="w-5.5 h-5.5 text-indigo-650" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white border border-slate-200 shadow-md rounded-2xl p-6 text-center">
                <p className="text-xs text-slate-500 font-semibold">Select a training day from the sidebar split tracker to view exercises.</p>
              </Card>
            )}

            {workoutData?.ai_coach_advice && (
              <div className="p-4 bg-indigo-50/30 border border-indigo-100/50 rounded-xl text-[11px] text-indigo-900 leading-relaxed">
                <span className="font-bold flex items-center gap-1 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-650" /> Coach Advice
                </span>
                {workoutData.ai_coach_advice}
              </div>
            )}
          </div>

          {/* WORKOUT WEEK SPLIT & EQUIPMENT DETAILS */}
          <div className="space-y-6">
            <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Target className="w-4 h-4 text-indigo-600" /> Muscle Split Progression
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-xs">
                {workoutData?.weekly_schedule?.map((row: ScheduleItem, idx: number) => {
                  const hasExercises = workoutData.daily_workouts?.some(
                    (dw: DailyWorkout) => dw.day.toLowerCase() === row.day.toLowerCase()
                  );
                  const isCurrent = hasExercises && workoutData.daily_workouts?.findIndex((dw: DailyWorkout) => dw.day.toLowerCase() === row.day.toLowerCase()) === activeDayIndex;

                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={!hasExercises}
                      onClick={() => {
                        const targetIdx = workoutData.daily_workouts?.findIndex(
                          (dw: DailyWorkout) => dw.day.toLowerCase() === row.day.toLowerCase()
                        );
                        if (targetIdx !== -1) {
                          setActiveDayIndex(targetIdx);
                        }
                      }}
                      className={`w-full flex items-center justify-between py-2 px-2.5 rounded-lg border text-left transition-all duration-200 ${
                        isCurrent
                          ? 'bg-indigo-50 border-indigo-200 text-indigo-900 font-bold'
                          : hasExercises
                          ? 'bg-white border-transparent text-slate-800 hover:bg-slate-50 cursor-pointer'
                          : 'bg-transparent border-transparent text-slate-400 cursor-not-allowed opacity-60'
                      }`}
                    >
                      <span className="font-semibold">{row.day}</span>
                      <div className="text-right">
                        <p className="text-xs font-bold leading-normal">{row.focus}</p>
                        <span className={`text-[9px] font-bold ${row.is_rest_day ? 'text-slate-400' : 'text-indigo-600'}`}>
                          {row.is_rest_day ? 'Rest Day' : 'Workout'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Equipment Requirements</span>
                  <p className="text-xs font-bold text-slate-800">{profile?.equipment_access || 'Home Dumbbells'}</p>
                  <p className="text-[10px] text-slate-500">Based on Onboarding Profile</p>
                </div>
                <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                  <Dumbbell className="w-4.5 h-4.5" />
                </div>
              </CardContent>
            </Card>
          </div>

        </div>
      )}
    </div>
  );
}
