'use client';

import React, { useState } from 'react';
import { getLocalDateString } from '@/lib/utils/date';
import { API_BASE_URL } from '@/lib/api';
import PWAInstallPrompt from '@/components/PWAInstallPrompt';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient, isMock } from '@/lib/supabase/client';
import { 
  Flame, 
  Plus, 
  LayoutDashboard, 
  BrainCircuit, 
  Activity, 
  LineChart, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  User,
  Sparkles,
  UtensilsCrossed,
  Pizza,
  TrendingUp,
  Apple,
  Calendar
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface DashboardShellProps {
  profile: any;
  children: React.ReactNode;
}

export default function DashboardShell({ profile, children }: DashboardShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAddMeal, setShowAddMeal] = useState(false);
  const [streak, setStreak] = useState<number>(0);

  React.useEffect(() => {
    if (!profile || !profile.id) return;
    async function fetchStreak() {
      try {
        const todayStr = getLocalDateString();
        const res = await fetch(`${API_BASE_URL}/gamification/status/${profile.id}?local_date=${todayStr}`);
        if (res.ok) {
          const data = await res.json();
          setStreak(data.current_streak);
        }
      } catch (err) {
        console.error('Failed to fetch streak in shell:', err);
      }
    }
    fetchStreak();
  }, [profile]);

  // Meal Log State
  const [mealName, setMealName] = useState('');
  const [calories, setCalories] = useState('');
  const [macos, setMacros] = useState({ protein: '', carbs: '', fats: '' });
  const [logSuccess, setLogSuccess] = useState(false);

  const navigation = [
    { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
    { name: 'AI Smart Log', href: '/dashboard/smart-log', icon: BrainCircuit },
    { name: 'Workout Plan', href: '/dashboard/workout-plan', icon: Activity },
    { name: 'My Progress', href: '/dashboard/my-progress', icon: LineChart },
    { name: 'History Calendar', href: '/dashboard/history', icon: Calendar },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleAddMealSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mealName) return;
    
    // Simulate log
    setLogSuccess(true);
    setTimeout(() => {
      setMealName('');
      setCalories('');
      setMacros({ protein: '', carbs: '', fats: '' });
      setLogSuccess(false);
      setShowAddMeal(false);
    }, 1200);
  };

  const getPageTitle = () => {
    const active = navigation.find(item => item.href === pathname);
    return active ? active.name : 'FitAI';
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col md:flex-row relative">
      
      {/* MOBILE HEADER */}
      <header className="md:hidden flex h-14 items-center justify-between px-4 bg-white border-b border-slate-200 z-20 w-full shrink-0">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white">
            <Flame className="w-4 h-4 fill-white/10" />
          </div>
          <span className="font-bold text-slate-900">FitAI</span>
        </div>
        <div className="flex items-center gap-3">
          {/* Consistency Streak Mobile */}
          <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full text-slate-700 text-xs font-bold">
            <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/20" />
            <span>{streak}</span>
          </div>

          <button 
            type="button" 
            onClick={() => setMobileMenuOpen(true)}
            className="p-1 text-slate-500 hover:text-slate-950"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* PERSISTENT DESKTOP SIDEBAR */}
      <aside className="hidden md:flex md:w-60 flex-col bg-slate-50 border-r border-slate-200/80 z-10 shrink-0 relative">
        {/* Brand */}
        <div className="h-14 flex items-center gap-2 px-5 border-b border-slate-200/60">
          <div className="flex items-center justify-center w-7.5 h-7.5 rounded-lg bg-indigo-600 text-white">
            <Flame className="w-4 h-4 fill-white/10" />
          </div>
          <span className="font-bold text-slate-900 text-base">
            FitAI
          </span>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 group ${
                  isActive 
                    ? 'bg-indigo-50/60 border-r-2 border-indigo-650 text-indigo-750 font-bold' 
                    : 'text-slate-550 hover:text-slate-900 hover:bg-slate-100/40'
                }`}
              >
                <Icon className={`w-4 h-4 shrink-0 transition-all duration-205 ${
                  isActive ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                }`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* User profile details & Logout at bottom */}
        <div className="p-4 border-t border-slate-200/60 space-y-3">
          <div className="flex items-center gap-2.5 px-1.5">
            <div className="w-7.5 h-7.5 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center text-slate-700 text-xs font-bold font-mono">
              {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{profile.name || 'Athlete'}</p>
              <p className="text-[10px] text-slate-500 truncate capitalize">{profile.target_goal || 'Base Profile'}</p>
            </div>
          </div>
          
          {/* Sandbox Indicator */}
          {isMock && (
            <div className="flex items-center gap-1.5 rounded-lg border border-amber-250 bg-amber-50/80 py-1 px-2.5 text-[9px] font-semibold text-amber-800">
              <span className="h-1 w-1 rounded-full bg-amber-500 animate-pulse" />
              <span>Sandbox Active</span>
            </div>
          )}
          
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-650 hover:bg-red-50 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER SIDEBAR */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          
          <div className="relative w-60 bg-white flex flex-col h-full border-r border-slate-200 shadow-2xl animate-in slide-in-from-left duration-250">
            <div className="h-14 flex items-center justify-between px-5 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-600 text-white">
                  <Flame className="w-4 h-4 fill-white/10" />
                </div>
                <span className="font-bold text-slate-900 text-sm">FitAI</span>
              </div>
              <button 
                type="button" 
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            <nav className="flex-1 px-3 py-4 space-y-0.5">
              {navigation.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link 
                    key={item.name} 
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      isActive 
                        ? 'bg-indigo-50 border-r-2 border-indigo-600 text-indigo-700 font-bold' 
                        : 'text-slate-550 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 space-y-3">
              <div className="flex items-center gap-2.5 px-1.5">
                <div className="w-7.5 h-7.5 rounded-full bg-slate-200 flex items-center justify-center text-slate-700 text-xs font-bold font-mono">
                  {profile.name ? profile.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{profile.name || 'Athlete'}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-500 hover:text-red-650 hover:bg-red-50 transition-all duration-200"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MAIN CONTAINER */}
      <div className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* DESKTOP HEADER */}
        <header className="hidden md:flex h-14 items-center justify-between px-6 bg-white border-b border-slate-200/60 w-full shrink-0">
          <h1 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            {getPageTitle()}
          </h1>

          <div className="flex items-center gap-4">
            {/* Consistency Streak Desktop */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3.5 py-1 rounded-full text-slate-700 text-xs font-bold shadow-sm transition-transform duration-200 hover:scale-102">
              <Flame className="w-4 h-4 text-orange-500 fill-orange-500/10" />
              <span>{streak} Day Streak</span>
            </div>

            {/* Add Meal CTA */}
            <Button
              type="button"
              onClick={() => setShowAddMeal(true)}
              className="bg-indigo-600 hover:bg-indigo-755 text-white font-semibold text-xs px-3.5 h-8.5 rounded-lg shadow-sm flex items-center gap-1.5 transition-all duration-200 hover:scale-102 active:scale-98 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add Meal
            </Button>
          </div>
        </header>

        {/* SCROLLABLE ROUTE CONTENT */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-50 relative">
          {children}

          {/* FLOATING MOBILE CTA */}
          <button
            type="button"
            onClick={() => setShowAddMeal(true)}
            className="md:hidden fixed bottom-6 right-6 w-11 h-11 bg-indigo-600 rounded-full flex items-center justify-center text-white shadow-md hover:scale-105 active:scale-95 transition-all duration-200 z-40 cursor-pointer"
          >
            <Plus className="w-5.5 h-5.5" />
          </button>
        </main>
      </div>

      {/* ADD MEAL MODAL */}
      {showAddMeal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs" onClick={() => setShowAddMeal(false)} />
          
          <Card className="relative z-10 w-full max-w-[420px] bg-white border border-slate-200 shadow-xl overflow-hidden animate-in zoom-in-95 duration-200 rounded-2xl">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-850 flex items-center gap-2">
                <UtensilsCrossed className="w-4 h-4 text-indigo-650" /> Log Meal Details
              </h2>
              <button 
                type="button" 
                onClick={() => setShowAddMeal(false)}
                className="text-slate-400 hover:text-slate-650"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMealSubmit}>
              <CardContent className="p-5 space-y-4">
                {logSuccess ? (
                  <div className="text-center py-6 space-y-2 animate-in zoom-in-95 duration-250">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600">
                      <Pizza className="w-5 h-5 animate-bounce" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-850">Meal Logged Successfully!</h3>
                    <p className="text-[10px] text-slate-500">AI metrics and caloric logs updated.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="mealName" className="text-xs font-semibold text-slate-700">Food / Meal Description</Label>
                      <Input
                        id="mealName"
                        type="text"
                        placeholder="Grilled chicken breast, white rice, avocado"
                        required
                        value={mealName}
                        onChange={(e) => setMealName(e.target.value)}
                        className="bg-white border-slate-200 text-slate-900 text-xs h-9 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label htmlFor="calories" className="text-xs font-semibold text-slate-700">Calories (approx)</Label>
                        <div className="relative">
                          <Input
                            id="calories"
                            type="number"
                            placeholder="580"
                            value={calories}
                            onChange={(e) => setCalories(e.target.value)}
                            className="bg-white border-slate-200 text-slate-900 text-xs h-9 pr-9 focus:border-indigo-500 focus:ring-indigo-500 rounded-lg"
                          />
                          <span className="absolute right-3 top-2.5 text-[10px] text-slate-400 font-semibold">kcal</span>
                        </div>
                      </div>
                      <div className="space-y-1.5 flex flex-col justify-end">
                        <p className="text-[10px] text-slate-550 leading-normal flex items-start gap-1 pb-1">
                          <Apple className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span>Leave empty for AI estimation.</span>
                        </p>
                      </div>
                    </div>

                    <div className="pt-1.5">
                      <Label className="text-xs font-semibold text-slate-700 block mb-2">Macros Breakdown (Optional)</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="Pro (g)"
                            value={macos.protein}
                            onChange={(e) => setMacros({...macos, protein: e.target.value})}
                            className="bg-white border-slate-200 text-slate-900 text-[11px] h-8 text-center rounded-lg focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="Carbs (g)"
                            value={macos.carbs}
                            onChange={(e) => setMacros({...macos, carbs: e.target.value})}
                            className="bg-white border-slate-200 text-slate-900 text-[11px] h-8 text-center rounded-lg focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="Fats (g)"
                            value={macos.fats}
                            onChange={(e) => setMacros({...macos, fats: e.target.value})}
                            className="bg-white border-slate-200 text-slate-900 text-[11px] h-8 text-center rounded-lg focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      className="w-full mt-2 bg-indigo-650 hover:bg-indigo-755 text-white font-semibold text-xs h-9.5 rounded-lg shadow-sm cursor-pointer"
                    >
                      Process & Log Meal
                    </Button>
                  </>
                )}
              </CardContent>
            </form>
          </Card>
        </div>
      )}

      {/* PWA INSTALLATION PROMPT */}
      <PWAInstallPrompt />
    </div>
  );
}
