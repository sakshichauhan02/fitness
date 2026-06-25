'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { 
  Settings, 
  User, 
  Trash2,
  Scale,
  Database,
  Info
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'biometric' | 'units' | 'api'>('biometric');
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [weightUnit, setWeightUnit] = useState('kg');
  const [heightUnit, setHeightUnit] = useState('cm');

  useEffect(() => {
    async function loadProfile() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userProfile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          
          if (userProfile) {
            setProfile(userProfile);
            setName(userProfile.name || '');
            setWeightUnit(userProfile.weight_unit || 'kg');
            setHeightUnit(userProfile.height_unit || 'cm');
          }
        }
      } catch (err) {
        console.error('Error loading profile in settings:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveChanges = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setErrorMsg(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No active session found.');

      const updates = {
        name,
        weight_unit: weightUnit,
        height_unit: heightUnit,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', user.id);

      if (error) throw error;

      setSaveSuccess(true);
      // Automatically clear success indicator after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleResetProfile = async () => {
    if (!confirm('Are you sure you want to reset your profile and complete onboarding again?')) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Clear onboarding status or profile cookies/db state
        await supabase
          .from('profiles')
          .update({ onboarded: false })
          .eq('id', user.id);
        
        // Log out or push to onboarding
        await supabase.auth.signOut();
        window.location.href = '/login';
      }
    } catch (err) {
      console.error('Error resetting profile:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold">Loading Config Core...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative z-10 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Settings className="w-5.5 h-5.5 text-indigo-650" /> Settings
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">Configure profile thresholds, metrics conventions, and credentials integration.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Side menu list */}
        <div className="space-y-1.5">
          {[
            { id: 'biometric', name: 'Biometric Profile', desc: 'Age, gender, and weight metrics', icon: User },
            { id: 'units', name: 'Measurement Units', desc: 'Toggles for cm/ft and kg/lbs', icon: Scale },
            { id: 'api', name: 'Integrations & API', desc: 'Sync with smartbands / databases', icon: Database }
          ].map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSaveSuccess(false);
                  setErrorMsg(null);
                }}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 flex items-center gap-3 cursor-pointer ${
                  active 
                    ? 'bg-white border-slate-200 text-slate-900 shadow-sm' 
                    : 'bg-transparent border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100/40'
                }`}
              >
                <item.icon className={`w-4 h-4 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
                <div>
                  <p className="text-xs font-bold">{item.name}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Side config forms */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">
                {activeTab === 'biometric' && 'Personal Details'}
                {activeTab === 'units' && 'Measurement Metrics'}
                {activeTab === 'api' && 'Developer API Integrations'}
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">
                {activeTab === 'biometric' && 'Update the parameters governing your BMR estimates.'}
                {activeTab === 'units' && 'Switch between Metric and Imperial formatting standards.'}
                {activeTab === 'api' && 'Sync your fitness trackers or connect external baseline stores.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              
              {saveSuccess && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-xs text-emerald-800 font-medium">
                  Changes saved successfully!
                </div>
              )}

              {errorMsg && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-800 font-medium flex items-center gap-2">
                  <Info className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {activeTab === 'biometric' && (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="fullName" className="text-xs font-semibold text-slate-700">Display Name</Label>
                    <Input 
                      id="fullName"
                      type="text" 
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your Name" 
                      className="bg-white border border-slate-200 text-slate-900 text-xs h-9 rounded-lg focus:border-indigo-500 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700">Aesthetic Target Goal</Label>
                    <div className="bg-slate-50 border border-slate-200 text-slate-500 text-xs px-3 py-2.5 rounded-lg select-none">
                      {profile?.target_goal || 'V-Taper Focus'}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">Note: Reset profile to modify biometric objectives.</span>
                  </div>
                </div>
              )}

              {activeTab === 'units' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 block">Weight Unit Convention</Label>
                    <div className="flex gap-2">
                      {['kg', 'lbs'].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setWeightUnit(u)}
                          className="px-4 py-2 border rounded-lg text-xs font-bold transition-all cursor-pointer"
                          style={{
                            backgroundColor: weightUnit === u ? '#4f46e5' : '#ffffff',
                            color: weightUnit === u ? '#ffffff' : '#334155',
                            borderColor: weightUnit === u ? '#4f46e5' : '#cbd5e1'
                          }}
                        >
                          {u.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-slate-700 block">Height Unit Convention</Label>
                    <div className="flex gap-2">
                      {['cm', 'ft'].map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setHeightUnit(u)}
                          className="px-4 py-2 border rounded-lg text-xs font-bold transition-all cursor-pointer"
                          style={{
                            backgroundColor: heightUnit === u ? '#4f46e5' : '#ffffff',
                            color: heightUnit === u ? '#ffffff' : '#334155',
                            borderColor: heightUnit === u ? '#4f46e5' : '#cbd5e1'
                          }}
                        >
                          {u === 'cm' ? 'CM (Metric)' : 'FT (Imperial)'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'api' && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  <p className="font-semibold text-slate-700 mb-1">Google Fit & Apple Health Sync</p>
                  Fitness tracker API bindings are mock-activated. Syncing will occur in the background when active.
                </div>
              )}

            </CardContent>
            {activeTab !== 'api' && (
              <CardFooter className="border-t border-slate-100 px-6 py-3.5 flex justify-end">
                <Button 
                  onClick={handleSaveChanges}
                  disabled={saving}
                  size="sm" 
                  className="bg-indigo-600 hover:bg-indigo-755 text-white font-semibold text-xs h-8.5 rounded-lg shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
              </CardFooter>
            )}
          </Card>

          <Card className="bg-white border border-slate-250 shadow-sm rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-red-650 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4 text-red-500" /> Danger Zone
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Delete all your physical metrics and baseline data permanently.</CardDescription>
            </CardHeader>
            <CardContent className="pt-1">
              <Button 
                onClick={handleResetProfile}
                size="sm" 
                variant="destructive" 
                className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-semibold text-xs h-8.5 rounded-lg cursor-pointer"
              >
                Reset FitAI Engine Profile
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
