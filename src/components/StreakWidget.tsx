'use client';

import React from 'react';
import { Flame, Target, Sparkles, AlertCircle, Award } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface StreakWidgetProps {
  currentStreak: number;
  longestStreak: number;
  streakSecuredToday: boolean;
  loggedTotals: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  targetMacros: {
    calories: number;
    protein: number;
    carbs: number;
    fats: number;
  };
  loading?: boolean;
}

export default function StreakWidget({
  currentStreak,
  longestStreak,
  streakSecuredToday,
  loggedTotals,
  targetMacros,
  loading = false
}: StreakWidgetProps) {
  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] gap-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] text-slate-500 font-semibold">Updating streak engine...</p>
      </Card>
    );
  }

  // Calculate percentages
  const calPercent = Math.min(Math.round((loggedTotals.calories / (targetMacros.calories || 1)) * 100), 100);
  const proPercent = Math.min(Math.round((loggedTotals.protein / (targetMacros.protein || 1)) * 100), 100);

  return (
    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Flame className={`w-4.5 h-4.5 ${streakSecuredToday ? 'text-orange-500 fill-orange-500/10 animate-bounce' : 'text-slate-400'}`} />
            Streak Engine
          </CardTitle>
          <CardDescription className="text-[11px] text-slate-550">Log meals and hit targets to keep your streak hot</CardDescription>
        </div>
        
        {streakSecuredToday ? (
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full shadow-xs flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-655 animate-pulse" /> Secured Today
          </span>
        ) : (
          <span className="text-[9px] uppercase tracking-wider font-extrabold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-600" /> In Progress
          </span>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4 pt-1">
        {/* Streak Numbers Display */}
        <div className="grid grid-cols-2 gap-3 bg-slate-50/50 border border-slate-100 rounded-xl p-3 text-center">
          <div className="space-y-0.5">
            <p className="text-2xl font-black text-slate-900 flex items-center justify-center gap-1">
              {currentStreak}
              <Flame className={`w-6 h-6 ${currentStreak > 0 ? 'text-orange-500 fill-orange-500/20' : 'text-slate-300'}`} />
            </p>
            <p className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500">Current Streak</p>
          </div>
          <div className="space-y-0.5 border-l border-slate-200/60">
            <p className="text-2xl font-black text-indigo-650 flex items-center justify-center gap-1">
              {longestStreak}
              <Award className="w-5.5 h-5.5 text-indigo-600" />
            </p>
            <p className="text-[9px] uppercase tracking-widest font-extrabold text-slate-500">Longest Streak</p>
          </div>
        </div>

        {/* Macro Progress for Streak Lock */}
        <div className="space-y-2.5">
          {/* Calories Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-750 flex items-center gap-1">
                Calories ({loggedTotals.calories} / {targetMacros.calories} kcal)
              </span>
              <span className={`${calPercent >= 90 && calPercent <= 110 ? 'text-emerald-650' : 'text-slate-550'}`}>
                {calPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  calPercent >= 90 && calPercent <= 110 
                    ? 'bg-emerald-500' 
                    : calPercent > 110 
                      ? 'bg-rose-500' 
                      : 'bg-indigo-600'
                }`}
                style={{ width: `${calPercent}%` }}
              />
            </div>
          </div>

          {/* Protein Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-bold">
              <span className="text-slate-750">
                Protein ({loggedTotals.protein}g / {targetMacros.protein}g)
              </span>
              <span className={`${proPercent >= 90 && proPercent <= 110 ? 'text-emerald-650' : 'text-slate-550'}`}>
                {proPercent}%
              </span>
            </div>
            <div className="w-full bg-slate-150 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${
                  proPercent >= 90 && proPercent <= 110 
                    ? 'bg-emerald-500' 
                    : proPercent > 110 
                      ? 'bg-rose-500' 
                      : 'bg-indigo-600'
                }`}
                style={{ width: `${proPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Dynamic Tip Helper */}
        <p className="text-[10.5px] text-slate-500 leading-relaxed font-medium bg-indigo-50/20 border border-indigo-100/30 rounded-lg p-2.5">
          {streakSecuredToday ? (
            <span className="text-emerald-800 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Awesome work! Your macro targets are locked. Streak secured!
            </span>
          ) : (
            <span className="text-slate-600 flex items-start gap-1">
              <Target className="w-3.5 h-3.5 text-indigo-600 mt-0.5 shrink-0" />
              Log your meals today and aim for 90% - 110% of your targets to secure your streak!
            </span>
          )}
        </p>
      </CardContent>
    </Card>
  );
}
