'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { API_BASE_URL } from '@/lib/api';
import { getLocalDateString } from '@/lib/utils/date';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Sparkles, 
  Activity, 
  Flame, 
  Utensils, 
  Droplets, 
  Moon, 
  Heart, 
  Target, 
  Weight,
  ShieldCheck,
  TrendingUp,
  BrainCircuit,
  Info
} from 'lucide-react';

interface Profile {
  id: string;
  name: string;
  gender: string;
  date_of_birth: string;
  height: number;
  weight: number;
  target_goal: string;
}

interface CoachData {
  daily_fitness_score: number;
  recovery_score: number;
  workout_recommendation: string;
  meal_recommendation: string;
  muscle_group_recommendation: string;
  rest_day_recommendation: string;
  motivation_tip: string;
  status: string;
}

export default function AICoachPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachData, setCoachData] = useState<CoachData | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Today's metrics states
  const [waterLogged, setWaterLogged] = useState(0.0);
  const [sleepHours, setSleepHours] = useState(8.0);
  const [workoutCompleted, setWorkoutCompleted] = useState(false);
  const [caloriesLogged, setCaloriesLogged] = useState(0);
  const [proteinLogged, setProteinLogged] = useState(0);

  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = '/login';
        return;
      }

      try {
        const checkRes = await fetch(`${API_BASE_URL}/profiles/${user.id}`);
        if (checkRes.ok) {
          const userProfile = await checkRes.json();
          setProfile(userProfile);
          
          // Fetch today's metrics
          const todayStr = getLocalDateString();
          const historyRes = await fetch(`${API_BASE_URL}/history/day/${user.id}/${todayStr}`);
          if (historyRes.ok) {
            const historyData = await historyRes.json();
            setWaterLogged(historyData.water_intake || 0.0);
            setSleepHours(historyData.sleep_hours !== undefined ? historyData.sleep_hours : 8.0);
            setWorkoutCompleted(historyData.workout_completed || false);
            setCaloriesLogged(historyData.macro_totals?.calories || 0);
            setProteinLogged(historyData.macro_totals?.protein || 0);
          }
        }
      } catch (err) {
        console.error('Failed to load profile or daily metrics:', err);
        setErrorMsg('Failed to connect to the backend server.');
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleGetCoachAdvice = async () => {
    if (!profile) return;
    setCoachLoading(true);
    setErrorMsg(null);

    try {
      const todayStr = getLocalDateString();
      const response = await fetch(`${API_BASE_URL}/coach/recommendation/${profile.id}?local_date=${todayStr}`);
      if (!response.ok) {
        throw new Error('Failed to generate coaching recommendation.');
      }
      const data = await response.json();
      setOcrDataCache(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to generate recommendations. Please try again.');
    } finally {
      setCoachLoading(false);
    }
  };

  const setOcrDataCache = (data: CoachData) => {
    setCoachData(data);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent':
        return 'text-emerald-700 bg-emerald-50 border-emerald-250';
      case 'Good':
        return 'text-indigo-750 bg-indigo-50 border-indigo-150';
      case 'Needs Improvement':
        return 'text-rose-700 bg-rose-50 border-rose-250';
      default:
        return 'text-slate-700 bg-slate-50 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
        {/* HEADER SECTION SKELETON */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-200 rounded animate-pulse"></div>
            <div className="h-3 w-80 bg-slate-100 rounded animate-pulse"></div>
          </div>
          <div className="h-9 w-32 bg-slate-200 rounded-xl animate-pulse"></div>
        </div>

        {/* METRICS PANEL SKELETON */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 grid grid-cols-2 md:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-slate-55/40 border border-slate-100 h-20 rounded-xl animate-pulse"></div>
          ))}
        </div>

        {/* MAIN BODY SKELETON */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 h-24 rounded-xl animate-pulse"></div>
            ))}
          </div>
          <div className="h-12 bg-slate-50 border border-slate-100 rounded-2xl animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-slate-50 border border-slate-100 h-28 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-indigo-600" /> AI Fitness Coach
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalized intelligence engine matching your habits and macros with Gemini.
          </p>
        </div>
        
        <Button
          onClick={handleGetCoachAdvice}
          disabled={coachLoading}
          className="bg-indigo-650 hover:bg-indigo-755 text-white font-bold text-xs py-2 px-4 h-9 rounded-xl flex items-center gap-1.5 transition-transform duration-200 hover:scale-102 cursor-pointer shadow-sm disabled:opacity-50"
        >
          {coachLoading ? 'Analyzing Metrics...' : 'Consult AI Coach'}
          <Sparkles className="w-4 h-4 text-white/80 animate-pulse" />
        </Button>
      </div>

      {errorMsg && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-750">
          <Info className="w-4 h-4 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* TODAY'S METRICS PANEL CARD */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-indigo-600" /> Today's Assessment Inputs
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 text-center">
          <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-3.5 space-y-1 transition-transform duration-200 hover:scale-103 hover:bg-slate-100/30 cursor-default">
            <Target className="w-4 h-4 text-indigo-650 mx-auto animate-pulse" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Goal</p>
            <p className="text-xs font-extrabold text-slate-800 truncate">{profile?.target_goal || 'None'}</p>
          </div>
          <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-3.5 space-y-1 transition-transform duration-200 hover:scale-103 hover:bg-slate-100/30 cursor-default">
            <Utensils className="w-4 h-4 text-indigo-650 mx-auto" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Calories</p>
            <p className="text-xs font-extrabold text-slate-800">{caloriesLogged} kcal</p>
          </div>
          <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-3.5 space-y-1 transition-transform duration-200 hover:scale-103 hover:bg-slate-100/30 cursor-default">
            <Heart className="w-4 h-4 text-indigo-650 mx-auto" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Protein</p>
            <p className="text-xs font-extrabold text-slate-800">{proteinLogged} g</p>
          </div>
          <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-3.5 space-y-1 transition-transform duration-200 hover:scale-103 hover:bg-slate-100/30 cursor-default">
            <Droplets className="w-4 h-4 text-indigo-650 mx-auto" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Hydration</p>
            <p className="text-xs font-extrabold text-slate-800">{waterLogged} L</p>
          </div>
          <div className="bg-slate-50/50 border border-slate-200/50 rounded-xl p-3.5 space-y-1 col-span-2 md:col-span-1 transition-transform duration-200 hover:scale-103 hover:bg-slate-100/30 cursor-default">
            <Moon className="w-4 h-4 text-indigo-650 mx-auto" />
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Sleep</p>
            <p className="text-xs font-extrabold text-slate-800">{sleepHours} hrs</p>
          </div>
        </CardContent>
      </Card>

      {/* COACH RECOMMENDATION DATA DISPLAY */}
      {coachLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white border border-slate-200/60 rounded-xl h-24 flex flex-col justify-center items-center space-y-2.5 shadow-xs p-4">
                <div className="h-2.5 w-24 bg-slate-200 rounded animate-pulse"></div>
                <div className="h-7 w-16 bg-slate-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 border border-slate-200/55 rounded-2xl p-4 h-12 flex items-center justify-center">
            <div className="h-2 w-3/4 bg-slate-200 rounded animate-pulse"></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 space-y-3.5 shadow-xs">
                <div className="h-2.5 w-32 bg-slate-200 rounded animate-pulse"></div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-150 rounded animate-pulse"></div>
                  <div className="h-2 w-5/6 bg-slate-150 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : coachData ? (
        <div className="space-y-6 animate-in fade-in duration-300">
          
          {/* SCORES SUMMARY BOX */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <Card className="bg-white border border-slate-200 shadow-sm rounded-xl text-center flex flex-col justify-center py-5 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300">
              <div className="space-y-1 z-10">
                <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Daily Fitness Score</span>
                <p className="text-3xl font-extrabold text-indigo-600">{coachData.daily_fitness_score}</p>
                <div className="w-16 h-1 mx-auto bg-indigo-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-indigo-600" style={{ width: `${coachData.daily_fitness_score}%` }}></div>
                </div>
              </div>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-sm rounded-xl text-center flex flex-col justify-center py-5 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300">
              <div className="space-y-1 z-10">
                <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Recovery Indicator</span>
                <p className="text-3xl font-extrabold text-indigo-600">{coachData.recovery_score}%</p>
                <div className="w-16 h-1 mx-auto bg-indigo-100 rounded-full mt-1 overflow-hidden">
                  <div className="h-full bg-indigo-600" style={{ width: `${coachData.recovery_score}%` }}></div>
                </div>
              </div>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-sm rounded-xl text-center flex flex-col justify-center py-5 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-slate-300">
              <div className="space-y-1 z-10 px-3">
                <span className="text-[9px] uppercase font-extrabold text-slate-500 tracking-wider">Overall Coach Status</span>
                <div className={`mt-1.5 px-3 py-1 text-xs font-bold rounded-full border text-center inline-block ${getStatusColor(coachData.status)}`}>
                  {coachData.status}
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5 font-medium">Keep hitting target macros to stay secure.</p>
              </div>
            </Card>

          </div>

          {/* MOTIVATIONAL QUOTE BANNER */}
          <div className="bg-gradient-to-r from-indigo-50/50 to-sky-50/30 border border-indigo-100 rounded-2xl p-4 flex items-center gap-3 transition-all duration-300 hover:shadow-xs hover:border-indigo-200">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 animate-spin-slow" />
            <p className="text-xs text-slate-750 font-bold italic leading-relaxed">
              "{coachData.motivation_tip}"
            </p>
          </div>

          {/* RECOMMENDATIONS CARDS SPLIT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            <Card className="bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:scale-[1.01]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600 animate-pulse" /> Workout Split Recommendation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-650 leading-relaxed font-medium">
                  {coachData.workout_recommendation}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:scale-[1.01]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Utensils className="w-4 h-4 text-indigo-650" /> Nutrition & Meal Suggestions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-650 leading-relaxed font-medium">
                  {coachData.meal_recommendation}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:scale-[1.01]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <Target className="w-4 h-4 text-indigo-650" /> Muscle Group Focus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-650 leading-relaxed font-medium">
                  {coachData.muscle_group_recommendation}
                </p>
              </CardContent>
            </Card>

            <Card className="bg-white border border-slate-200 shadow-sm rounded-xl transition-all duration-300 hover:shadow-md hover:border-slate-300 hover:scale-[1.01]">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-650" /> Rest Split Strategy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-slate-650 leading-relaxed font-medium">
                  {coachData.rest_day_recommendation}
                </p>
              </CardContent>
            </Card>

          </div>

        </div>
      ) : (
        /* DISENGAGED EMPTY STATE */
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl text-center py-14 px-6 space-y-4 transition-all duration-300 hover:shadow-md hover:border-slate-300">
          <div className="w-14 h-14 bg-indigo-50/50 border border-indigo-100 rounded-full flex items-center justify-center mx-auto text-indigo-600 transition-transform duration-300 hover:rotate-12 cursor-pointer shadow-inner">
            <BrainCircuit className="w-7 h-7" />
          </div>
          <div className="max-w-[280px] mx-auto space-y-1.5">
            <h3 className="text-sm font-extrabold text-slate-800">Your AI Fitness Report</h3>
            <p className="text-[10.5px] text-slate-500 leading-relaxed">
              Consult the coach to compile today's hydration, sleep, workouts, and macro logs into actionable feedback.
            </p>
          </div>
          <Button 
            onClick={handleGetCoachAdvice}
            disabled={coachLoading}
            className="bg-indigo-650 hover:bg-indigo-755 text-white font-bold text-xs py-2 px-5 h-8.5 rounded-xl cursor-pointer shadow-xs disabled:opacity-50 transition-transform duration-200 hover:scale-102"
          >
            {coachLoading ? 'Consulting Coach...' : 'Get Coach Analysis'}
          </Button>
        </div>
      )}

    </div>
  );
}
