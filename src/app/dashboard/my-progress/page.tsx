'use client';

import React, { useState, useEffect } from 'react';
import { getLocalDateString } from '@/lib/utils/date';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  LineChart, 
  TrendingDown, 
  Flame, 
  Scale, 
  Sparkles, 
  Calendar,
  CheckCircle2,
  TrendingUp,
  Percent,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WeightLog {
  id: string; // YYYY-MM-DD
  date: string; // YYYY-MM-DD
  displayDate: string; // Jun 10
  weight: number;
  diff: string;
}

export default function MyProgressPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [syncingProfile, setSyncingProfile] = useState(false);
  
  // Backend State
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [gamificationStatus, setGamificationStatus] = useState<any>(null);
  const [todaySummary, setTodaySummary] = useState<any>(null);

  // Edit / Add States
  const [showLogModal, setShowLogModal] = useState(false);
  const [editingLog, setEditingLog] = useState<WeightLog | null>(null);
  const [inputWeight, setInputWeight] = useState('');
  const [inputDate, setInputDate] = useState('');

  // Delete State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Helper to parse dates without timezone shifting
  const parseLocalDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day);
  };

  const loadAllData = async (userId: string) => {
    try {
      const todayStr = getLocalDateString();
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const startStr = getLocalDateString(ninetyDaysAgo);

      // 1. Fetch Today's Summary
      const summaryRes = await fetch(`http://localhost:8000/history/day/${userId}/${todayStr}`);
      let todayData = null;
      if (summaryRes.ok) {
        todayData = await summaryRes.json();
        setTodaySummary(todayData);
      }

      // 2. Fetch Gamification Status
      const gamificationRes = await fetch(`http://localhost:8000/gamification/status/${userId}?local_date=${todayStr}`);
      if (gamificationRes.ok) {
        const gamificationData = await gamificationRes.json();
        setGamificationStatus(gamificationData);
      }

      // 3. Fetch 90-day History Range
      const rangeRes = await fetch(`http://localhost:8000/history/range/${userId}?start_date=${startStr}&end_date=${todayStr}`);
      if (rangeRes.ok) {
        const historyData = await rangeRes.json();
        
        let logs: any[] = Object.values(historyData.history)
          .filter((day: any) => day.weight !== null)
          .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()); // oldest to newest

        // Self-healing Seed: If user has no weight entries and hasn't been seeded yet
        const seedFlagKey = `fitai_weight_seeded_${userId}`;
        if (logs.length === 0 && !localStorage.getItem(seedFlagKey)) {
          // Set the flag immediately to prevent concurrent runs in React StrictMode
          localStorage.setItem(seedFlagKey, 'true');
          
          const seedData = [
            { date: '2026-05-20', weight: 72.4 },
            { date: '2026-05-27', weight: 72.0 },
            { date: '2026-06-03', weight: 71.5 },
            { date: '2026-06-10', weight: 71.2 }
          ];
          
          for (const data of seedData) {
            try {
              await fetch('http://localhost:8000/history/daily-update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_id: userId,
                  date: data.date,
                  weight: data.weight
                })
              });
            } catch (err) {
              console.error(`Failed to seed weight log for ${data.date}:`, err);
            }
          }

          // Re-fetch history
          try {
            const reRangeRes = await fetch(`http://localhost:8000/history/range/${userId}?start_date=${startStr}&end_date=${todayStr}`);
            if (reRangeRes.ok) {
              const reHistoryData = await reRangeRes.json();
              logs = Object.values(reHistoryData.history)
                .filter((day: any) => day.weight !== null)
                .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
            }
          } catch (err) {
            console.error('Failed to re-fetch history range after seeding:', err);
          }
        }

        // Format logs and calculate differences
        const formattedLogs: WeightLog[] = logs.map((log: any, index: number) => {
          let diff = 'Baseline';
          if (index > 0) {
            const change = log.weight - logs[index - 1].weight;
            const sign = change >= 0 ? '+' : '';
            diff = `${sign}${change.toFixed(1)} kg`;
          }
          return {
            id: log.date,
            date: log.date,
            displayDate: parseLocalDate(log.date).toLocaleDateString('en-US', { month: 'short', day: '2-digit' }),
            weight: log.weight,
            diff: diff
          };
        });

        // Display newest first
        setWeightLogs([...formattedLogs].reverse());
      }
    } catch (err) {
      console.error('Failed to load progress data:', err);
    }
  };

  useEffect(() => {
    async function loadProfileAndData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Get profile
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          setProfile(userProfile);

          if (userProfile) {
            setSyncingProfile(true);
            try {
              // Ensure profile exists in SQL backend database
              const checkRes = await fetch(`http://localhost:8000/profiles/${userProfile.id}`);
              if (checkRes.status === 404) {
                await fetch('http://localhost:8000/profiles/', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(userProfile)
                });
              } else if (checkRes.ok) {
                await fetch(`http://localhost:8000/profiles/${userProfile.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(userProfile)
                });
              }
            } catch (syncErr) {
              console.error('Failed to sync profile with SQL backend:', syncErr);
            } finally {
              setSyncingProfile(false);
            }

            // Load range, gamification status, and summaries
            await loadAllData(userProfile.id);
          }
        }
      } catch (err) {
        console.error('Error loading profile in progress page:', err);
      } finally {
        setLoading(false);
      }
    }

    loadProfileAndData();
  }, []);

  const handleOpenAdd = () => {
    setEditingLog(null);
    setInputWeight('');
    setInputDate(getLocalDateString());
    setShowLogModal(true);
  };

  const handleOpenEdit = (log: WeightLog) => {
    setEditingLog(log);
    setInputWeight(log.weight.toString());
    setInputDate(log.date);
    setShowLogModal(true);
  };

  const handleSaveWeight = async (e: React.FormEvent) => {
    e.preventDefault();
    const weightNum = parseFloat(inputWeight);
    if (isNaN(weightNum) || !inputDate.trim() || !profile) return;

    try {
      const response = await fetch('http://localhost:8000/history/daily-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          date: inputDate,
          weight: weightNum
        })
      });
      if (response.ok) {
        setShowLogModal(false);
        await loadAllData(profile.id);
      }
    } catch (err) {
      console.error('Failed to save weight entry:', err);
    }
  };

  const handleDeleteWeight = async (id: string) => {
    if (!profile) return;
    try {
      const response = await fetch('http://localhost:8000/history/daily-update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          date: id,
          weight: null // Passing null clears the weigh-in for that date
        })
      });
      if (response.ok) {
        setConfirmDeleteId(null);
        await loadAllData(profile.id);
      }
    } catch (err) {
      console.error('Failed to delete weight log:', err);
    }
  };

  // Generate dynamic trend line data from the last 7 logged entries (oldest to newest)
  const graphLogs = [...weightLogs].reverse().slice(-7);
  const graphWeights = graphLogs.map(l => l.weight);
  const minW = graphWeights.length > 0 ? Math.min(...graphWeights) : 70;
  const maxW = graphWeights.length > 0 ? Math.max(...graphWeights) : 75;
  const rangeW = maxW - minW;

  const graphData = graphLogs.map((log) => {
    let height = 50;
    if (rangeW > 0) {
      // Scale heights between 25% and 85% for elegant visualization
      height = 25 + ((log.weight - minW) / rangeW) * 60;
    }
    return {
      date: log.displayDate,
      weight: log.weight,
      height: height
    };
  });

  // Calculate stats for widgets
  const latestWeight = weightLogs.length > 0 ? weightLogs[0].weight : (profile?.weight || 70.0);
  const baselineWeight = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1].weight : (profile?.weight || 70.0);
  const totalChange = latestWeight - baselineWeight;
  const targetWeight = profile?.target_weight || 68.0;
  const distanceToTarget = Math.abs(latestWeight - targetWeight);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-650" />
        <p className="text-xs font-semibold">Synchronizing biometric history...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative z-10">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <LineChart className="w-5.5 h-5.5 text-indigo-650" /> My Progress
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">Visualize and monitor biometric weight targets, physique trends, and consistency analytics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* WEIGHT PROGRESS LOGS */}
        <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Weight Tracking History</CardTitle>
              <CardDescription className="text-xs text-slate-500">Manual weigh-ins matching goal pathway</CardDescription>
            </div>
            <button 
              onClick={handleOpenAdd}
              className="border border-slate-200 bg-white hover:bg-slate-50 text-[10px] h-8 px-3 font-semibold flex items-center gap-1.5 cursor-pointer rounded-lg shadow-xs transition-colors"
            >
              Log Weight <Scale className="w-3.5 h-3.5 text-indigo-650" />
            </button>
          </CardHeader>
          <CardContent>
            {/* Visual Progress Graph Bar Representation */}
            <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-5 mb-5 text-center space-y-3">
              <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider block">Weekly Trend Line</span>
              
              {graphData.length === 0 ? (
                <div className="h-20 flex items-center justify-center text-[11px] font-medium text-slate-400">
                  No weight data recorded yet.
                </div>
              ) : (
                <div className="h-20 flex items-end justify-between gap-3 px-4 pt-2">
                  {graphData.map((data, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                      <div 
                        className={`w-full rounded-t transition-all duration-350 ${
                          i === graphData.length - 1 ? 'bg-indigo-600 shadow-sm' : 'bg-slate-200 hover:bg-slate-300'
                        }`}
                        style={{ height: `${data.height}%` }}
                        title={`${data.weight} kg on ${data.date}`}
                      />
                      <span className="text-[9px] text-slate-500 font-mono">{data.date}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
              {weightLogs.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 font-medium border border-dashed border-slate-200 rounded-lg">
                  Record your weight to begin tracking progress.
                </div>
              ) : (
                weightLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200/50 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors">
                    <span className="text-slate-600 flex items-center gap-2">
                      <Calendar className="w-3.5 h-3.5 text-indigo-600" /> {log.displayDate}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-800">{log.weight} kg</span>
                      <span className={`text-[10px] font-bold ${log.diff.startsWith('-') ? 'text-emerald-600' : log.diff.startsWith('+') ? 'text-rose-600' : 'text-slate-500'}`}>
                        {log.diff}
                      </span>
                      <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                        <button 
                          onClick={() => handleOpenEdit(log)}
                          className="text-slate-500 hover:text-indigo-600 p-1 cursor-pointer transition-colors"
                          title="Edit entry"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(log.id)}
                          className="text-slate-500 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                          title="Delete entry"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* LOG/EDIT WEIGHT MODAL */}
        {showLogModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-5 relative space-y-4 animate-in zoom-in-95 duration-200">
              <div>
                <h2 className="text-sm font-bold text-slate-900">{editingLog ? 'Edit Weight Log' : 'Log Daily Weight'}</h2>
                <p className="text-[10px] text-slate-500">Record your current baseline weight metric in kg.</p>
              </div>

              <form onSubmit={handleSaveWeight} className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Weight (kg)</label>
                  <input 
                    type="number"
                    step="0.1"
                    required
                    placeholder="70.5"
                    value={inputWeight}
                    onChange={(e) => setInputWeight(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-950 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Date Stamp</label>
                  <input 
                    type="date"
                    required
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-950 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                  <button 
                    type="button"
                    onClick={() => setShowLogModal(false)}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all duration-150"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all duration-150 shadow-sm"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* DELETE CONFIRMATION MODAL */}
        {confirmDeleteId !== null && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs shadow-xl p-5 relative space-y-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900">Delete weight log?</h2>
                <p className="text-[10px] text-slate-500 mt-1">This action cannot be undone. Daily statistics calculations will adapt accordingly.</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setConfirmDeleteId(null)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] px-3.5 py-1.5 rounded-md font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => handleDeleteWeight(confirmDeleteId)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-3.5 py-1.5 rounded-md font-semibold cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CONSISTENCY METRICS */}
        <div className="space-y-6">
          <Card className="bg-white border border-slate-200 shadow-md rounded-2xl relative overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Flame className="w-4 h-4 text-indigo-600" /> Consistency Streak
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3.5 text-center">
              <div className="text-4xl font-extrabold text-indigo-600">
                {gamificationStatus?.current_streak ?? 0}
              </div>
              <p className="text-xs font-semibold text-slate-700">Days Active in a Row</p>
              <p className="text-[10px] text-slate-500 leading-normal">Keep logging meals and workouts to power your FitAI streak factor multiplier!</p>

              {/* Checklist details */}
              <div className="pt-1.5 text-left space-y-2 border-t border-slate-100">
                {[
                  { 
                    name: `Calories Target Met (${gamificationStatus?.logged_totals?.calories ?? 0} / ${gamificationStatus?.target_macros?.calories ?? 2000} kcal)`, 
                    done: gamificationStatus?.streak_secured_today || false 
                  },
                  { 
                    name: `Hydration Logged (${todaySummary?.water_intake.toFixed(1) ?? '0.0'} L)`, 
                    done: todaySummary ? todaySummary.water_intake > 0 : false 
                  },
                  { 
                    name: 'Logged Active Workout Split', 
                    done: todaySummary?.workout_completed || false 
                  }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-[11px] font-medium">
                    <CheckCircle2 className={`w-4 h-4 ${item.done ? 'text-emerald-600' : 'text-slate-300'}`} />
                    <span className={item.done ? 'text-slate-700 font-semibold' : 'text-slate-400'}>{item.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* PHYSIQUE BODY FAT / MUSCLE RATIO */}
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardContent className="p-4.5 flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Weight Status Tracker</span>
                <p className="text-lg font-extrabold text-slate-900">{latestWeight.toFixed(1)} kg</p>
                <p className="text-[10px] text-slate-500">
                  Target: {targetWeight} kg ({totalChange === 0 ? 'Baseline' : `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)} kg total change`})
                </p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-650">
                <TrendingDown className="w-4.5 h-4.5" />
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
