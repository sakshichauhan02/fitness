'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isMock } from '@/lib/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { 
  User, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  ChevronRight, 
  Scale, 
  Ruler, 
  Dumbbell, 
  Zap, 
  Flame, 
  Leaf, 
  Utensils, 
  Check, 
  Building2, 
  Smartphone,
  Info
} from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [profileExists, setProfileExists] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form Fields State
  const [name, setName] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other' | ''>('');
  const [dob, setDob] = useState('');

  // Unit Toggles
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lbs'>('kg');

  // Metric Values
  const [heightCm, setHeightCm] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  
  const [weight, setWeight] = useState('');
  const [targetWeight, setTargetWeight] = useState('');

  // Baseline, Goals, Engine Choices
  const [currentPhysique, setCurrentPhysique] = useState<'Skinny' | 'Skinny-Fat' | 'Average' | 'Athletic' | 'Overweight' | ''>('');
  const [targetGoal, setTargetGoal] = useState<'V-Taper Focus' | 'Lean Bulk' | 'Aggressive Cut' | 'Strength & Performance' | ''>('');
  
  const [dietaryIdentity, setDietaryIdentity] = useState<'Strict Veg' | 'Eggitarian' | 'Non-Veg' | 'Dairy-Free' | ''>('');
  const [equipmentAccess, setEquipmentAccess] = useState<'Commercial Gym' | 'Home Dumbbells' | 'Bodyweight' | ''>('');

  // Check auth and current onboarding status on mount
  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Fetch profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (profile) {
        setProfileExists(true);
        if (profile.name) setName(profile.name);
        if (profile.onboarded) {
          window.location.href = '/dashboard';
        }
      }
    }
    checkAuth();
  }, [router, supabase]);

  // Conversions
  const getFinalMetrics = () => {
    let finalHeight = 0; // stored as cm
    if (heightUnit === 'cm') {
      finalHeight = parseFloat(heightCm) || 0;
    } else {
      const ft = parseFloat(heightFt) || 0;
      const inch = parseFloat(heightIn) || 0;
      finalHeight = Math.round((ft * 30.48) + (inch * 2.54));
    }

    let finalWeight = 0; // stored as kg
    if (weightUnit === 'kg') {
      finalWeight = parseFloat(weight) || 0;
    } else {
      const lbsVal = parseFloat(weight) || 0;
      finalWeight = Math.round(lbsVal / 2.20462);
    }

    let finalTargetWeight = 0; // stored as kg
    if (weightUnit === 'kg') {
      finalTargetWeight = parseFloat(targetWeight) || 0;
    } else {
      const lbsVal = parseFloat(targetWeight) || 0;
      finalTargetWeight = Math.round(lbsVal / 2.20462);
    }

    return {
      height: finalHeight,
      weight: finalWeight,
      target_weight: finalTargetWeight
    };
  };

  const handleNext = () => {
    setErrorMsg(null);
    
    // Validation rules
    if (step === 1) {
      if (!name.trim()) return setErrorMsg('Please enter your name.');
      if (!gender) return setErrorMsg('Please select your gender.');
      if (!dob) return setErrorMsg('Please select your date of birth.');
    }
    if (step === 2) {
      if (heightUnit === 'cm' && !heightCm) return setErrorMsg('Please enter your height.');
      if (heightUnit === 'ft' && (!heightFt || !heightIn)) return setErrorMsg('Please enter your height in feet and inches.');
      if (!weight) return setErrorMsg('Please enter your current weight.');
      if (!targetWeight) return setErrorMsg('Please enter your target weight.');
    }
    if (step === 3) {
      if (!currentPhysique) return setErrorMsg('Please select your starting baseline.');
    }
    if (step === 4) {
      if (!targetGoal) return setErrorMsg('Please select your aesthetic goal.');
    }

    setStep((prev) => Math.min(prev + 1, 5));
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setErrorMsg(null);
    if (!dietaryIdentity) return setErrorMsg('Please select your dietary identity.');
    if (!equipmentAccess) return setErrorMsg('Please select your equipment access.');

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No authenticated user found.');

      const metrics = getFinalMetrics();

      const profileData = {
        id: user.id,
        name,
        gender,
        date_of_birth: dob,
        height: metrics.height,
        height_unit: heightUnit,
        weight: metrics.weight,
        weight_unit: weightUnit,
        target_weight: metrics.target_weight,
        target_weight_unit: weightUnit,
        current_physique: currentPhysique,
        target_goal: targetGoal,
        dietary_identity: dietaryIdentity,
        equipment_access: equipmentAccess,
        onboarded: true,
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('profiles')
        .upsert(profileData);

      if (error) throw error;

      window.location.href = '/dashboard';
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to complete onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 md:p-8">
      <div className="relative w-full max-w-[560px]">
        {/* Onboarding Header */}
        <div className="mb-4 flex items-center justify-between px-1">
          <span className="text-xs font-bold tracking-wider text-indigo-650 uppercase">
            FITAI PROFILER
          </span>
          <span className="text-xs font-semibold text-slate-500">
            Step {step} of 5
          </span>
        </div>

        {/* Global Progress Bar */}
        <div className="w-full h-1 bg-slate-200 rounded-full mb-6 overflow-hidden">
          <div 
            className="h-full bg-indigo-650 transition-all duration-500 ease-out" 
            style={{ width: `${(step / 5) * 100}%` }}
          />
        </div>

        {/* Sandbox Mode indicator */}
        {isMock && (
          <div className="mb-4 flex items-center justify-center gap-1.5 rounded-lg border border-amber-250 bg-amber-50/70 py-2 px-3.5 text-[10px] font-semibold text-amber-800 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Sandbox Mode active. Using local mock database.
          </div>
        )}

        {/* Card Frame */}
        <Card className="border border-slate-200 bg-white shadow-md rounded-2xl">
          <CardContent className="pt-6 pb-6 px-4 md:px-8">
            
            {/* Error Banner */}
            {errorMsg && (
              <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-750 mb-6 animate-in fade-in duration-200">
                <Info className="h-4 w-4 shrink-0 text-red-650 mt-0.5" />
                <p className="leading-normal font-medium">{errorMsg}</p>
              </div>
            )}

            {/* Step Content Wrapper */}
            <div className="min-h-[300px] flex flex-col justify-between">
              
              {/* STEP 1: IDENTITY & BIOLOGY */}
              {step === 1 && (
                <div className="space-y-5 animate-in fade-in duration-350">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-5 h-5 text-indigo-600" /> Identity & Biology
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Let's start with the basics to establish your genetic foundation.</p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Your Full Name</Label>
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 text-xs h-9.5 rounded-lg"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700">Biological Gender</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {['Male', 'Female', 'Other'].map((g) => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setGender(g as any)}
                            className={`py-2 px-4 rounded-xl text-xs font-semibold border transition-all duration-200 flex flex-col items-center gap-1.5 cursor-pointer ${
                              gender === g
                                ? 'bg-indigo-50 border-2 border-indigo-600 text-indigo-700 shadow-sm'
                                : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span>{g}</span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Note: Needed for precise BMR and calorie output calculations.</p>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="dob" className="text-xs font-semibold text-slate-700">Date of Birth</Label>
                      <Input
                        id="dob"
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 text-xs h-9.5 rounded-lg"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: THE METRICS */}
              {step === 2 && (
                <div className="space-y-5 animate-in fade-in duration-350">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Scale className="w-5 h-5 text-indigo-600" /> The Metrics
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Specify your current biometric proportions.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Height input with toggle */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">Height</Label>
                        <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setHeightUnit('cm')}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${heightUnit === 'cm' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                          >
                            cm
                          </button>
                          <button
                            type="button"
                            onClick={() => setHeightUnit('ft')}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${heightUnit === 'ft' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                          >
                            ft / in
                          </button>
                        </div>
                      </div>

                      {heightUnit === 'cm' ? (
                        <div className="relative">
                          <Input
                            type="number"
                            placeholder="175"
                            value={heightCm}
                            onChange={(e) => setHeightCm(e.target.value)}
                            className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 pr-9 text-xs h-9.5 rounded-lg"
                          />
                          <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">cm</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="5"
                              value={heightFt}
                              onChange={(e) => setHeightFt(e.target.value)}
                              className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 pr-9 text-xs h-9.5 rounded-lg"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">ft</span>
                          </div>
                          <div className="relative">
                            <Input
                              type="number"
                              placeholder="9"
                              value={heightIn}
                              onChange={(e) => setHeightIn(e.target.value)}
                              className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 pr-9 text-xs h-9.5 rounded-lg"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">in</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Weights inputs with toggle */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-semibold text-slate-700">Weight Metrics</Label>
                        <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                          <button
                            type="button"
                            onClick={() => setWeightUnit('kg')}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${weightUnit === 'kg' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                          >
                            kg
                          </button>
                          <button
                            type="button"
                            onClick={() => setWeightUnit('lbs')}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${weightUnit === 'lbs' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
                          >
                            lbs
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <Label htmlFor="weight" className="text-[10px] text-slate-500 font-semibold">Current Weight</Label>
                          <div className="relative">
                            <Input
                              id="weight"
                              type="number"
                              placeholder={weightUnit === 'kg' ? '70' : '154'}
                              value={weight}
                              onChange={(e) => setWeight(e.target.value)}
                              className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 pr-10 text-xs h-9.5 rounded-lg"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">{weightUnit}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <Label htmlFor="targetWeight" className="text-[10px] text-slate-500 font-semibold">Target Weight</Label>
                          <div className="relative">
                            <Input
                              id="targetWeight"
                              type="number"
                              placeholder={weightUnit === 'kg' ? '75' : '165'}
                              value={targetWeight}
                              onChange={(e) => setTargetWeight(e.target.value)}
                              className="bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 pr-10 text-xs h-9.5 rounded-lg"
                            />
                            <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-semibold">{weightUnit}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: CURRENT BASELINE */}
              {step === 3 && (
                <div className="space-y-5 animate-in fade-in duration-350">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Ruler className="w-5 h-5 text-indigo-600" /> Current Baseline
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Select the option that best reflects your starting physique.</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {[
                      { value: 'Skinny', label: 'Skinny', desc: 'Low muscle mass, fast metabolism' },
                      { value: 'Skinny-Fat', label: 'Skinny-Fat', desc: 'Lower muscle mass with localized midsection fat' },
                      { value: 'Average', label: 'Average', desc: 'Balanced body composition baseline' },
                      { value: 'Athletic', label: 'Athletic', desc: 'Higher muscle mass, active baseline' },
                      { value: 'Overweight', label: 'Overweight', desc: 'Higher body fat index, looking to cut down' }
                    ].map((physique) => (
                      <button
                        key={physique.value}
                        type="button"
                        onClick={() => setCurrentPhysique(physique.value as any)}
                        className={`p-3 rounded-xl border text-left transition-all duration-200 flex justify-between items-center cursor-pointer ${
                          currentPhysique === physique.value
                            ? 'bg-indigo-50 border-2 border-indigo-600 text-indigo-750 shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className={`text-xs font-bold ${currentPhysique === physique.value ? 'text-indigo-850' : 'text-slate-900'}`}>{physique.label}</span>
                          <p className="text-[10px] text-slate-500">{physique.desc}</p>
                        </div>
                        {currentPhysique === physique.value && (
                          <div className="w-4.5 h-4.5 rounded-full bg-indigo-600 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 4: THE AESTHETIC GOAL */}
              {step === 4 && (
                <div className="space-y-5 animate-in fade-in duration-350">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-indigo-600" /> The Aesthetic Goal
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">What is your primary architectural target?</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5">
                    {[
                      { value: 'V-Taper Focus', label: 'V-Taper Focus', desc: 'Wide shoulders, lats expansion & ultra-slim waist silhouette' },
                      { value: 'Lean Bulk', label: 'Lean Bulk', desc: 'Slow calorie surplus targeting high-quality lean muscle gains' },
                      { value: 'Aggressive Cut', label: 'Aggressive Cut', desc: 'Accelerated fat loss program preserving lean tissues' },
                      { value: 'Strength & Performance', label: 'Strength & Performance', desc: 'Heavy lift progression, conditioning, and athletic power output' }
                    ].map((goal) => (
                      <button
                        key={goal.value}
                        type="button"
                        onClick={() => setTargetGoal(goal.value as any)}
                        className={`p-3.5 rounded-xl border text-left transition-all duration-200 flex justify-between items-center cursor-pointer ${
                          targetGoal === goal.value
                            ? 'bg-indigo-50 border-2 border-indigo-600 text-indigo-750 shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className={`text-xs font-bold ${targetGoal === goal.value ? 'text-indigo-850' : 'text-slate-900'}`}>{goal.label}</span>
                          <p className="text-[10px] text-slate-500">{goal.desc}</p>
                        </div>
                        {targetGoal === goal.value && (
                          <div className="w-4.5 h-4.5 rounded-full bg-indigo-600 flex items-center justify-center">
                            <Check className="w-2.5 h-2.5 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP 5: THE ENGINE */}
              {step === 5 && (
                <div className="space-y-5 animate-in fade-in duration-350">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Flame className="w-5 h-5 text-indigo-600" /> The Engine
                    </h2>
                    <p className="text-slate-500 text-xs mt-1">Diet and logistics that power your daily setup.</p>
                  </div>

                  <div className="space-y-4">
                    {/* Dietary Identity */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Leaf className="w-4 h-4 text-emerald-600" /> Dietary Identity
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {[
                          { value: 'Strict Veg', label: 'Strict Veg' },
                          { value: 'Eggitarian', label: 'Eggitarian' },
                          { value: 'Non-Veg', label: 'Non-Veg' },
                          { value: 'Dairy-Free', label: 'Dairy-Free' }
                        ].map((diet) => (
                          <button
                            key={diet.value}
                            type="button"
                            onClick={() => setDietaryIdentity(diet.value as any)}
                            className={`p-2.5 rounded-lg border text-center text-xs font-semibold transition-all duration-200 cursor-pointer ${
                              dietaryIdentity === diet.value
                                ? 'bg-indigo-50 border-2 border-indigo-600 text-indigo-700'
                                : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            {diet.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Equipment Access */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-indigo-600" /> Equipment Access
                      </Label>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'Commercial Gym', label: 'Gym' },
                          { value: 'Home Dumbbells', label: 'Dumbbells' },
                          { value: 'Bodyweight', label: 'Bodyweight' }
                        ].map((equip) => (
                          <button
                            key={equip.value}
                            type="button"
                            onClick={() => setEquipmentAccess(equip.value as any)}
                            className={`p-2.5 rounded-lg border text-center text-xs font-semibold transition-all duration-200 flex flex-col items-center justify-center gap-1 cursor-pointer ${
                              equipmentAccess === equip.value
                                ? 'bg-indigo-50 border-2 border-indigo-600 text-indigo-700'
                                : 'bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                          >
                            <span className="text-[10px] font-bold">{equip.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Action Footer */}
              <div className="flex justify-between items-center mt-8 pt-4 border-t border-slate-100">
                {step > 1 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handlePrev}
                    disabled={loading}
                    className="border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 flex items-center gap-2 h-9 text-xs px-3.5 rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" /> Back
                  </Button>
                ) : (
                  <div />
                )}

                {step < 5 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-indigo-600 hover:bg-indigo-750 text-white flex items-center gap-2 font-semibold h-9 text-xs px-4 rounded-lg cursor-pointer shadow-sm"
                  >
                    Next <ChevronRight className="w-4 h-4" />
                  </Button>
                ) : (
                  <Button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-indigo-600 hover:bg-indigo-750 text-white font-semibold flex items-center gap-2 h-9 text-xs px-4.5 rounded-lg transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    {loading ? (
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>
                        Unlock Engine <Sparkles className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                )}
              </div>

            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
