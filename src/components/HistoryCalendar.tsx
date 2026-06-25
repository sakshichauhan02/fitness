'use client';

import React, { useState, useEffect } from 'react';
import { getLocalDateString } from '@/lib/utils/date';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Flame, 
  Droplets, 
  Dumbbell, 
  Scale, 
  Plus, 
  Minus, 
  CheckCircle2, 
  Utensils,
  Calendar,
  Loader2
} from 'lucide-react';

interface HistoryCalendarProps {
  userId: string;
}

export default function HistoryCalendar({ userId }: HistoryCalendarProps) {
  const supabase = createClient();
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    return `${y}-${m}-${d}`;
  });
  const [monthHistory, setMonthHistory] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [updating, setUpdating] = useState<boolean>(false);
  const [profile, setProfile] = useState<any>(null);

  const [gamificationStatus, setGamificationStatus] = useState<any>(null);

  // Load user profile targets and gamification status
  useEffect(() => {
    async function loadProfileAndStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Load profile
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        setProfile(data);

        // Load gamification status
        try {
          const todayStr = getLocalDateString();
          const res = await fetch(`http://localhost:8000/gamification/status/${user.id}?local_date=${todayStr}`);
          if (res.ok) {
            const statusData = await res.json();
            setGamificationStatus(statusData);
          }
        } catch (err) {
          console.error('Failed to fetch gamification status in calendar:', err);
        }
      }
    }
    loadProfileAndStatus();
  }, [userId]);

  // Fetch month data when month changes
  const fetchMonthData = async () => {
    setLoading(true);
    try {
      const cells = generateGridCells();
      const startDateStr = cells[0].dateStr;
      const endDateStr = cells[cells.length - 1].dateStr;

      const response = await fetch(
        `http://localhost:8000/history/range/${userId}?start_date=${startDateStr}&end_date=${endDateStr}`
      );
      if (response.ok) {
        const data = await response.json();
        setMonthHistory(data.history);
      }
    } catch (err) {
      console.error('Failed to fetch calendar range history:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchMonthData();
    }
  }, [userId, currentMonth]);

  // Navigate Months
  const handlePrevMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Toggle Workout Completion
  const handleToggleWorkout = async () => {
    const dayData = monthHistory[selectedDateStr];
    if (!dayData) return;

    setUpdating(true);
    const newStatus = !dayData.workout_completed;
    try {
      const res = await fetch('http://localhost:8000/history/daily-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          date: selectedDateStr,
          workout_completed: newStatus
        })
      });

      if (res.ok) {
        const updatedDay = await res.json();
        setMonthHistory(prev => ({
          ...prev,
          [selectedDateStr]: updatedDay
        }));
      }
    } catch (err) {
      console.error('Failed to update workout status:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Adjust Water Intake
  const handleAdjustWater = async (amount: number) => {
    const dayData = monthHistory[selectedDateStr];
    if (!dayData) return;

    setUpdating(true);
    const newWater = Math.max(0, parseFloat((dayData.water_intake + amount).toFixed(1)));
    try {
      const res = await fetch('http://localhost:8000/history/daily-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          date: selectedDateStr,
          water_intake: newWater
        })
      });

      if (res.ok) {
        const updatedDay = await res.json();
        setMonthHistory(prev => ({
          ...prev,
          [selectedDateStr]: updatedDay
        }));
      }
    } catch (err) {
      console.error('Failed to update water intake:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Adjust Weight Entry
  const handleSaveWeight = async (weightVal: number | null) => {
    setUpdating(true);
    try {
      const res = await fetch('http://localhost:8000/history/daily-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          date: selectedDateStr,
          weight: weightVal
        })
      });

      if (res.ok) {
        const updatedDay = await res.json();
        setMonthHistory(prev => ({
          ...prev,
          [selectedDateStr]: updatedDay
        }));
      }
    } catch (err) {
      console.error('Failed to update weight entry:', err);
    } finally {
      setUpdating(false);
    }
  };

  // Generate Calendar Grid Cells
  const generateGridCells = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthTotalDays = new Date(year, month, 0).getDate();
    
    const cells = [];
    
    // Helper to format a date locally as YYYY-MM-DD
    const formatLocalDate = (y: number, m: number, d: number) => {
      const mm = (m + 1).toString().padStart(2, '0');
      const dd = d.toString().padStart(2, '0');
      return `${y}-${mm}-${dd}`;
    };
    
    // Prev Month padding
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthTotalDays - i;
      const prevDate = new Date(year, month - 1, d);
      const dateStr = formatLocalDate(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate());
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false
      });
    }
    
    // Current Month
    for (let d = 1; d <= totalDays; d++) {
      const currDate = new Date(year, month, d);
      const dateStr = formatLocalDate(currDate.getFullYear(), currDate.getMonth(), currDate.getDate());
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: true
      });
    }
    
    // Next Month padding
    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const dateStr = formatLocalDate(nextDate.getFullYear(), nextDate.getMonth(), nextDate.getDate());
      cells.push({
        dateStr,
        dayNum: d,
        isCurrentMonth: false
      });
    }
    
    return cells;
  };

  const gridCells = generateGridCells();
  const selectedDayData = monthHistory[selectedDateStr] || {
    date: selectedDateStr,
    weight: null,
    water_intake: 0,
    workout_completed: false,
    meals: [],
    macro_totals: { calories: 0, protein: 0, carbs: 0, fats: 0 }
  };

  // Calculate macro limits
  const targetCals = gamificationStatus?.target_macros?.calories || profile?.calories_target || 2000;
  const targetProtein = gamificationStatus?.target_macros?.protein || profile?.protein_target || 140;

  const calPercentage = Math.min(100, Math.round((selectedDayData.macro_totals.calories / targetCals) * 100));
  const proPercentage = Math.min(100, Math.round((selectedDayData.macro_totals.protein / targetProtein) * 100));

  // Streak/Macros met formula: logged meals AND calories within 10% tolerance (standard streak engine rule)
  const isMacrosMet = (dayStr: string) => {
    const data = monthHistory[dayStr];
    if (!data || data.meals.length === 0) return false;
    const diff = Math.abs(data.macro_totals.calories - targetCals);
    return diff <= targetCals * 0.1; // 10% tolerance
  };

  // Helper to format date display
  const formatFriendlyDate = (dateStr: string) => {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* LEFT: THE MONTHLY CALENDAR GRID */}
      <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50 border-b border-slate-100">
          <div>
            <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-indigo-650" />
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <CardDescription className="text-[10px] text-slate-500">Track and review daily consistency parameters</CardDescription>
          </div>
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handlePrevMonth}
              className="p-1 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-slate-600"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button 
              onClick={handleNextMonth}
              className="p-1 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg cursor-pointer transition-colors text-slate-600"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          
          {/* Days of the week header */}
          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          {/* Calendar Day Grid */}
          {loading ? (
            <div className="h-64 flex flex-col items-center justify-center gap-2 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-650" />
              Loading history data...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1.5">
              {gridCells.map((cell, i) => {
                const dayData = monthHistory[cell.dateStr];
                const hasMeals = dayData && dayData.meals && dayData.meals.length > 0;
                const macrosSecured = isMacrosMet(cell.dateStr);
                const hasWater = dayData && dayData.water_intake > 0;
                const hasWorkout = dayData && dayData.workout_completed;
                const hasWeight = dayData && dayData.weight !== null;
                const isSelected = cell.dateStr === selectedDateStr;

                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDateStr(cell.dateStr)}
                    className={`min-h-[52px] p-1.5 flex flex-col items-start justify-between rounded-lg border text-left cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-650 bg-indigo-50/40 ring-1 ring-indigo-600'
                        : cell.isCurrentMonth
                        ? 'border-slate-100 bg-slate-50/40 hover:bg-slate-50'
                        : 'border-slate-100 bg-white/20 opacity-40 hover:opacity-70'
                    }`}
                  >
                    <span className={`text-[10px] font-bold ${
                      isSelected 
                        ? 'text-indigo-700' 
                        : cell.isCurrentMonth 
                        ? 'text-slate-700' 
                        : 'text-slate-400'
                    }`}>
                      {cell.dayNum}
                    </span>

                    {/* Cell Indicators */}
                    <div className="flex items-center gap-0.5 mt-2 w-full justify-end">
                      {macrosSecured && (
                        <span title="Macros streak target secured" className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      )}
                      {hasMeals && !macrosSecured && (
                        <span title="Meals logged (macro target missed)" className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                      )}
                      {hasWater && (
                        <span title="Hydration logged" className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                      )}
                      {hasWorkout && (
                        <span title="Active workout logged" className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                      )}
                      {hasWeight && (
                        <span title="Weight entry logged" className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* RIGHT: DAILY DETAILS PANEL */}
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden flex flex-col justify-between">
        <div className="p-5 space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Historical Focus Day</span>
            <h3 className="text-sm font-bold text-slate-800 mt-0.5">
              {formatFriendlyDate(selectedDateStr)}
            </h3>
          </div>

          {/* WORKOUT & HYDRATION & WEIGHT INTERACTIVE PANELS */}
          <div className="grid grid-cols-1 gap-3">
            
            {/* WORKOUT TOGGLE */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-xs font-semibold">
              <span className="text-slate-700 flex items-center gap-1.5">
                <Dumbbell className="w-4 h-4 text-indigo-650" /> Workout Completed
              </span>
              <button
                disabled={updating}
                onClick={handleToggleWorkout}
                className={`w-9 h-5 rounded-full transition-colors cursor-pointer relative ${
                  selectedDayData.workout_completed ? 'bg-indigo-600' : 'bg-slate-200'
                }`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.75 transition-all shadow-sm ${
                  selectedDayData.workout_completed ? 'left-4.75' : 'left-0.75'
                }`} />
              </button>
            </div>

            {/* WATER CONTROL */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-xs font-semibold">
              <span className="text-slate-700 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-500" /> Hydration Intake
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={updating || selectedDayData.water_intake <= 0}
                  onClick={() => handleAdjustWater(-0.25)}
                  className="p-1 bg-white border border-slate-200 hover:bg-slate-50 disabled:opacity-55 rounded cursor-pointer transition-colors"
                >
                  <Minus className="w-3 h-3 text-slate-600" />
                </button>
                <span className="text-slate-800 font-mono text-[11px] min-w-[52px] text-center">
                  {selectedDayData.water_intake.toFixed(2)} L
                </span>
                <button
                  disabled={updating}
                  onClick={() => handleAdjustWater(0.25)}
                  className="p-1 bg-white border border-slate-200 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                >
                  <Plus className="w-3 h-3 text-slate-600" />
                </button>
              </div>
            </div>

            {/* WEIGHT INPUT */}
            <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-xs font-semibold">
              <span className="text-slate-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-rose-400" /> Bodyweight Record
              </span>
              <div className="flex items-center gap-1.5">
                <input 
                  type="number"
                  step="0.1"
                  disabled={updating}
                  placeholder="--.-"
                  value={selectedDayData.weight !== null ? selectedDayData.weight : ''}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '') {
                      handleSaveWeight(null);
                    } else {
                      const num = parseFloat(v);
                      if (!isNaN(num)) handleSaveWeight(num);
                    }
                  }}
                  className="w-16 bg-white border border-slate-200 rounded px-1.5 py-0.5 text-center font-mono text-[11px] text-slate-900 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-400">kg</span>
              </div>
            </div>

          </div>

          {/* MACRO TARGET COMPLIANCE PROGRESS */}
          <div className="space-y-3 pt-2">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Daily Macronutrient Targets</span>
            
            {/* Calories */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                <span>Calories</span>
                <span>{selectedDayData.macro_totals.calories} / {targetCals} kcal ({calPercentage}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${
                    isMacrosMet(selectedDateStr) ? 'bg-emerald-500' : 'bg-indigo-650'
                  }`}
                  style={{ width: `${calPercentage}%` }}
                />
              </div>
            </div>

            {/* Protein */}
            <div className="space-y-1">
              <div className="flex justify-between text-[11px] font-semibold text-slate-700">
                <span>Protein</span>
                <span>{selectedDayData.macro_totals.protein} / {targetProtein}g ({proPercentage}%)</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-650 rounded-full transition-all duration-500"
                  style={{ width: `${proPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* MEAL LISTING */}
          <div className="space-y-2 pt-2">
            <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider block">Logged Meals ({selectedDayData.meals.length})</span>
            
            <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
              {selectedDayData.meals.length === 0 ? (
                <div className="text-center py-4 text-[10px] text-slate-400 font-medium border border-dashed border-slate-200 rounded-lg">
                  No meals logged on this date.
                </div>
              ) : (
                selectedDayData.meals.map((meal: any, idx: number) => (
                  <div key={idx} className="p-2 bg-slate-50/60 border border-slate-100 rounded-lg text-[10px] font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="space-y-0.5 max-w-[70%]">
                      <p className="text-slate-800 truncate" title={meal.name}>{meal.name}</p>
                      <p className="text-[9px] text-slate-400">{meal.meal_type}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-650 font-bold">{meal.calories} kcal</p>
                      <p className="text-[9px] text-slate-400">P: {meal.protein}g | C: {meal.carbs}g | F: {meal.fats}g</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

        </div>
        
        <div className="p-3.5 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-semibold">
          Updates here automatically recalculate streak records.
        </div>
      </Card>

    </div>
  );
}
