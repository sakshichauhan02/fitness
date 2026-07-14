'use client';

import React, { useState, useEffect } from 'react';
import { getLocalDateString } from '@/lib/utils/date';
import { API_BASE_URL } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  BrainCircuit, 
  Search, 
  Flame, 
  Beef, 
  Utensils, 
  Droplets,
  Plus,
  Sparkles,
  Calendar,
  Smile,
  Info,
  Mic,
  Square,
  Camera
} from 'lucide-react';
import { useRef } from 'react';
import { Button } from '@/components/ui/button';

interface Meal {
  id: number;
  name: string;
  type: string;
  cal: number;
  pro: string;
  carb: string;
  fat: string;
}

export default function SmartLogPage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Meal logs state
  const [mealDescription, setMealDescription] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [mealType, setMealType] = useState('Lunch');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [gamificationStatus, setGamificationStatus] = useState<any>(null);
  const [profileSynced, setProfileSynced] = useState(false);

  // Audio Recording States
  const [recording, setRecording] = useState(false);

  // OCR/Vision States
  const [ocrUploading, setOcrUploading] = useState(false);
  const [showOcrModal, setShowOcrModal] = useState(false);
  const [ocrData, setOcrData] = useState({
    name: '',
    estimated_calories: 0,
    protein: '',
    carbs: '',
    fats: '',
    serving_size: '1 serving',
    raw_text_summary: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setOcrUploading(true);
    setErrorMsg(null);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/nutrition/analyze-image`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to analyze image with OCR.');
      }

      const data = await response.json();
      setOcrData(data);
      setShowOcrModal(true);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Failed to scan image. Please try again.');
    } finally {
      setOcrUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleOcrLogConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ocrData.name || !profile?.id) return;

    setAnalyzing(true);
    setErrorMsg(null);
    try {
      const todayStr = getLocalDateString();
      const caloriesVal = ocrData.estimated_calories || 0;
      const proVal = parseInt(ocrData.protein.replace(/\D/g, ''), 10) || 0;
      const carbVal = parseInt(ocrData.carbs.replace(/\D/g, ''), 10) || 0;
      const fatVal = parseInt(ocrData.fats.replace(/\D/g, ''), 10) || 0;

      const saveResponse = await fetch(`${API_BASE_URL}/history/meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          date: todayStr,
          name: ocrData.name,
          meal_type: mealType,
          calories: caloriesVal,
          protein: proVal,
          carbs: carbVal,
          fats: fatVal
        })
      });

      if (saveResponse.ok) {
        const newDbMeal = await saveResponse.json();
        const newMeal: Meal = {
          id: newDbMeal.id,
          name: newDbMeal.name,
          type: newDbMeal.meal_type,
          cal: newDbMeal.calories,
          pro: `${newDbMeal.protein}g`,
          carb: `${newDbMeal.carbs}g`,
          fat: `${newDbMeal.fats}g`
        };

        setMealHistory((prev) => [newMeal, ...prev]);
        setShowOcrModal(false);
      } else {
        throw new Error('Failed to save OCR scanned meal to database.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to log scanned meal.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Audio Recording States
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [sleepHours, setSleepHours] = useState(8.0);

  const startRecording = async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else {
          mimeType = '';
        }
      }
      
      const options = mimeType ? { mimeType } : undefined;
      const recorder = new MediaRecorder(stream, options);
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: mimeType || 'audio/webm' });
        await handleVoiceUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err: any) {
      console.error('Microphone access denied or unsupported:', err);
      setVoiceError('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && recording) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const handleVoiceUpload = async (audioBlob: Blob) => {
    setAnalyzing(true);
    setErrorMsg(null);
    setVoiceError(null);
    
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'voice-meal-log.webm');
      formData.append('meal_type', mealType);

      const response = await fetch(`${API_BASE_URL}/nutrition/voice-log`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe and analyze voice meal log.');
      }

      const data = await response.json();
      setMealDescription(data.transcription);
      
      const analysis = data.analysis;
      const caloriesVal = analysis.estimated_calories || 0;
      const proVal = parseInt(analysis.protein.replace(/\D/g, ''), 10) || 0;
      const carbVal = parseInt(analysis.carbs.replace(/\D/g, ''), 10) || 0;
      const fatVal = parseInt(analysis.fats.replace(/\D/g, ''), 10) || 0;
      const todayStr = getLocalDateString();
      
      if (!profile || !profile.id) {
        throw new Error('Profile details not loaded yet.');
      }

      const saveResponse = await fetch(`${API_BASE_URL}/history/meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          date: todayStr,
          name: analysis.name,
          meal_type: analysis.meal_type || mealType,
          calories: caloriesVal,
          protein: proVal,
          carbs: carbVal,
          fats: fatVal
        })
      });

      if (saveResponse.ok) {
        const newDbMeal = await saveResponse.json();
        const newMeal: Meal = {
          id: newDbMeal.id,
          name: newDbMeal.name,
          type: newDbMeal.meal_type,
          cal: newDbMeal.calories,
          pro: `${newDbMeal.protein}g`,
          carb: `${newDbMeal.carbs}g`,
          fat: `${newDbMeal.fats}g`
        };

        setMealHistory((prev) => [newMeal, ...prev]);
        setMealDescription('');
      } else {
        throw new Error('Voice log transcribed, but failed to save to database.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error processing voice recording.');
    } finally {
      setAnalyzing(false);
    }
  };

  const [mealHistory, setMealHistory] = useState<Meal[]>([
    { id: 1, name: 'Eggs Whites & Avocado Toast', type: 'Breakfast', cal: 380, pro: '24g', carb: '32g', fat: '14g' },
    { id: 2, name: 'Double Breast Grilled Chicken with Jasmine Rice', type: 'Lunch', cal: 620, pro: '52g', carb: '65g', fat: '8g' },
    { id: 3, name: 'Whey Isolate Shake & Banana', type: 'Snack', cal: 280, pro: '26g', carb: '30g', fat: '2g' }
  ]);

  // Manual Log Form State
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualCategory, setManualCategory] = useState('Breakfast');
  const [manualCal, setManualCal] = useState('');
  const [manualPro, setManualPro] = useState('');
  const [manualCarb, setManualCarb] = useState('');
  const [manualFat, setManualFat] = useState('');



  // Hydration state
  const [waterLogged, setWaterLogged] = useState(1.8); // Liters
  
  // Dynamic Hydration logic states
  const [isWorkoutDay, setIsWorkoutDay] = useState(true);
  const [activityLevel, setActivityLevel] = useState('Moderately Active');
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [waterTarget, setWaterTarget] = useState(3.0);
  const [loadingRecommendation, setLoadingRecommendation] = useState(false);
  const [tdee, setTdee] = useState(2400);

  const calculateAge = (dobString: string) => {
    if (!dobString) return 28;
    const dob = new Date(dobString);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const calculateBMR = (weight: number, height: number, age: number, gender: string) => {
    if (gender === 'Male') {
      return Math.round((10 * weight) + (6.25 * height) - (5 * age) + 5);
    } else if (gender === 'Female') {
      return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 161);
    } else {
      return Math.round((10 * weight) + (6.25 * height) - (5 * age) - 78);
    }
  };

  // Fetch recommendation from API
  const fetchHydration = async (weight: number, calculatedTdee: number, workoutDay: boolean, activity: string) => {
    setLoadingRecommendation(true);
    try {
      const response = await fetch(`${API_BASE_URL}/nutrition/hydration-recommendation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          weight: weight,
          tdee: calculatedTdee,
          is_workout_day: workoutDay,
          activity_level: activity
        })
      });
      if (response.ok) {
        const data = await response.json();
        setWaterTarget(data.daily_target_liters);
        setAiRecommendation(data.ai_recommendation);
      } else {
        throw new Error('Failed to load hydration details');
      }
    } catch (err) {
      console.error('Error fetching hydration recommendation:', err);
      // Fallback local calculations if API fails
      const baseLiters = (weight * 35) / 1000.0;
      const tdeeBonus = calculatedTdee > 2000 ? (calculatedTdee - 2000) / 5000.0 : 0.0;
      const activityMods: Record<string, number> = {
        "Sedentary": 0.0,
        "Lightly Active": 0.2,
        "Moderately Active": 0.4,
        "Very Active": 0.6
      };
      const activityBonus = activityMods[activity] ?? 0.4;
      const workoutBonus = workoutDay ? 0.75 : 0.0;
      const localTarget = parseFloat((baseLiters + tdeeBonus + activityBonus + workoutBonus).toFixed(2));
      setWaterTarget(localTarget);
      setAiRecommendation(`Drink 500ml upon waking, space out 250ml intervals between meals, and target an additional ${workoutDay ? 750 : 250}ml during recovery hours to replenish fluid losses and support metabolic rate.`);
    } finally {
      setLoadingRecommendation(false);
    }
  };

  useEffect(() => {
    if (profile) {
      const age = calculateAge(profile.date_of_birth);
      const bmr = calculateBMR(profile.weight || 70, profile.height || 175, age, profile.gender || 'Other');
      const calculatedTdee = Math.round(bmr * 1.375);
      setTdee(calculatedTdee);
      fetchHydration(profile.weight || 70, calculatedTdee, isWorkoutDay, activityLevel);
    }
  }, [profile, isWorkoutDay, activityLevel]);

  // Grocery State
  const [groceryData, setGroceryData] = useState<any>(null);
  const [loadingGrocery, setLoadingGrocery] = useState(false);

  const handleGenerateGrocery = async () => {
    if (!profile) return;
    setLoadingGrocery(true);
    try {
      const mealNames = mealHistory.map(m => m.name);
      const response = await fetch(`${API_BASE_URL}/nutrition/grocery-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dietary_identity: profile.dietary_identity || 'Non-Veg',
          meals: mealNames
        })
      });
      if (response.ok) {
        const data = await response.json();
        setGroceryData(data);
      }
    } catch (err) {
      console.error('Failed to generate grocery list:', err);
    } finally {
      setLoadingGrocery(false);
    }
  };

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
          setProfile(userProfile);

          // Synchronize profile with backend SQL database for gamification targets
          if (userProfile) {
            try {
              const checkRes = await fetch(`${API_BASE_URL}/profiles/${userProfile.id}`);
              if (checkRes.status === 404) {
                await fetch(`${API_BASE_URL}/profiles/`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(userProfile)
                });
              } else if (checkRes.ok) {
                await fetch(`${API_BASE_URL}/profiles/${userProfile.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(userProfile)
                });
              }
              setProfileSynced(true);
            } catch (err) {
              console.error('Failed to sync profile with backend database:', err);
              setProfileSynced(true);
            }
          }
 
          // Load today's meals and water from database, migrating legacy localStorage if needed
          const todayStr = getLocalDateString();
          try {
            const historyRes = await fetch(`${API_BASE_URL}/history/day/${user.id}/${todayStr}`);
            if (historyRes.ok) {
              const historyData = await historyRes.json();
              setWaterLogged(historyData.water_intake || 0.0);
              setSleepHours(historyData.sleep_hours !== undefined ? historyData.sleep_hours : 8.0);
              if (historyData.meals && historyData.meals.length > 0) {
                setMealHistory(historyData.meals.map((m: any) => ({
                  id: m.id,
                  name: m.name,
                  type: m.meal_type,
                  cal: m.calories,
                  pro: `${m.protein}g`,
                  carb: `${m.carbs}g`,
                  fat: `${m.fats}g`
                })));
              } else {
                // Database is empty for today. Check legacy localStorage first
                const storageKey = `fitai_meals_${user.id}_${todayStr}`;
                const savedMealsStr = localStorage.getItem(storageKey);
                let initialMeals: any[] = [];
                
                if (savedMealsStr) {
                  initialMeals = JSON.parse(savedMealsStr);
                } else {
                  // Set default template based on diet
                  if (userProfile?.dietary_identity === 'Strict Veg' || userProfile?.dietary_identity === 'Dairy-Free') {
                    initialMeals = [
                      { id: 1, name: 'Oatmeal with Almonds & Berries', type: 'Breakfast', cal: 340, pro: '12g', carb: '48g', fat: '10g' },
                      { id: 2, name: 'Tofu Stir Fry with Jasmine Rice & Broccoli', type: 'Lunch', cal: 520, pro: '32g', carb: '58g', fat: '14g' },
                      { id: 3, name: 'Plant Protein Shake & Banana', type: 'Snack', cal: 260, pro: '25g', carb: '32g', fat: '3g' }
                    ];
                  } else if (userProfile?.dietary_identity === 'Eggitarian') {
                    initialMeals = [
                      { id: 1, name: 'Eggs Whites & Avocado Toast', type: 'Breakfast', cal: 380, pro: '24g', carb: '32g', fat: '14g' },
                      { id: 2, name: 'High-Protein Lentil Stew with Quinoa', type: 'Lunch', cal: 510, pro: '28g', carb: '68g', fat: '12g' },
                      { id: 3, name: 'Whey Isolate Shake & Banana', type: 'Snack', cal: 280, pro: '26g', carb: '30g', fat: '2g' }
                    ];
                  } else {
                    initialMeals = [
                      { id: 1, name: 'Eggs Whites & Avocado Toast', type: 'Breakfast', cal: 380, pro: '24g', carb: '32g', fat: '14g' },
                      { id: 2, name: 'Double Breast Grilled Chicken with Jasmine Rice', type: 'Lunch', cal: 620, pro: '52g', carb: '65g', fat: '8g' },
                      { id: 3, name: 'Whey Isolate Shake & Banana', type: 'Snack', cal: 280, pro: '26g', carb: '30g', fat: '2g' }
                    ];
                  }
                }
                
                // Save these initial meals to the SQL database to persist them permanently
                const syncedMeals: any[] = [];
                for (const m of initialMeals) {
                  try {
                    const pVal = parseInt(m.pro.replace(/\D/g, ''), 10) || 0;
                    const cVal = parseInt(m.carb.replace(/\D/g, ''), 10) || 0;
                    const fVal = parseInt(m.fat.replace(/\D/g, ''), 10) || 0;
                    
                    const saveRes = await fetch(`${API_BASE_URL}/history/meal`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        user_id: user.id,
                        date: todayStr,
                        name: m.name,
                        meal_type: m.type,
                        calories: m.cal,
                        protein: pVal,
                        carbs: cVal,
                        fats: fVal
                      })
                    });
                    
                    if (saveRes.ok) {
                      const dbMeal = await saveRes.json();
                      syncedMeals.push({
                        id: dbMeal.id,
                        name: dbMeal.name,
                        type: dbMeal.meal_type,
                        cal: dbMeal.calories,
                        pro: `${dbMeal.protein}g`,
                        carb: `${dbMeal.carbs}g`,
                        fat: `${dbMeal.fats}g`
                      });
                    }
                  } catch (err) {
                    console.error('Failed to migrate meal to SQL database:', err);
                  }
                }
                
                if (syncedMeals.length > 0) {
                  setMealHistory(syncedMeals);
                } else {
                  setMealHistory(initialMeals);
                }
                
                // Also initialize daily summary weight and water in database
                await fetch(`${API_BASE_URL}/history/daily-update`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    user_id: user.id,
                    date: todayStr,
                    water_intake: 1.8
                  })
                });
                setWaterLogged(1.8);
              }
            }
          } catch (err) {
            console.error('Failed to load daily history on mount:', err);
          }
        }
      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  // Synchronize meal logs with localStorage and backend streak engine in real-time
  useEffect(() => {
    if (!profile || !profile.id || !profileSynced) return;

    // Save to localStorage
    const todayStr = getLocalDateString();
    const storageKey = `fitai_meals_${profile.id}_${todayStr}`;
    localStorage.setItem(storageKey, JSON.stringify(mealHistory));

    // Send payload to backend check-streak endpoint
    const syncStreakWithBackend = async () => {
      try {
        const formattedMeals = mealHistory.map(m => ({
          name: m.name,
          cal: m.cal,
          pro: m.pro,
          carb: m.carb,
          fat: m.fat
        }));

        const response = await fetch(`${API_BASE_URL}/gamification/check-streak`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profile.id,
            meals: formattedMeals,
            local_date: todayStr
          })
        });

        if (response.ok) {
          const data = await response.json();
          setGamificationStatus(data);
        } else {
          console.error('Failed to sync streak status with backend:', response.statusText);
        }
      } catch (err) {
        console.error('Error syncing streak status with backend:', err);
      }
    };

    syncStreakWithBackend();
  }, [mealHistory, profile]);

  // Meal edit / delete state
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [confirmDeleteMealId, setConfirmDeleteMealId] = useState<number | null>(null);

  const handleOpenEditMeal = (meal: Meal) => {
    setEditingMeal(meal);
    setManualName(meal.name);
    setManualCategory(meal.type);
    setManualCal(meal.cal.toString());
    setManualPro(meal.pro.replace('g', ''));
    setManualCarb(meal.carb.replace('g', ''));
    setManualFat(meal.fat.replace('g', ''));
    setShowManualModal(true);
  };

  const handleManualLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualCal || !profile || !profile.id) return;

    const caloriesVal = parseInt(manualCal, 10) || 0;
    const proteinVal = parseInt(manualPro, 10) || 0;
    const carbsVal = parseInt(manualCarb, 10) || 0;
    const fatVal = parseInt(manualFat, 10) || 0;
    const todayStr = getLocalDateString();

    if (editingMeal) {
      // Edit mode
      try {
        const response = await fetch(`${API_BASE_URL}/history/meal/${editingMeal.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profile.id,
            date: todayStr,
            name: manualName,
            meal_type: manualCategory,
            calories: caloriesVal,
            protein: proteinVal,
            carbs: carbsVal,
            fats: fatVal
          })
        });
        
        if (response.ok) {
          const updatedMeal = await response.json();
          setMealHistory(prev => prev.map(item => {
            if (item.id === editingMeal.id) {
              return {
                id: updatedMeal.id,
                name: updatedMeal.name,
                type: updatedMeal.meal_type,
                cal: updatedMeal.calories,
                pro: `${updatedMeal.protein}g`,
                carb: `${updatedMeal.carbs}g`,
                fat: `${updatedMeal.fats}g`
              };
            }
            return item;
          }));
        }
      } catch (err) {
        console.error('Failed to edit meal in backend:', err);
      }
      setEditingMeal(null);
    } else {
      // Add mode
      try {
        const response = await fetch(`${API_BASE_URL}/history/meal`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profile.id,
            date: todayStr,
            name: manualName,
            meal_type: manualCategory,
            calories: caloriesVal,
            protein: proteinVal,
            carbs: carbsVal,
            fats: fatVal
          })
        });
        
        if (response.ok) {
          const newDbMeal = await response.json();
          const newMeal = {
            id: newDbMeal.id,
            name: newDbMeal.name,
            type: newDbMeal.meal_type,
            cal: newDbMeal.calories,
            pro: `${newDbMeal.protein}g`,
            carb: `${newDbMeal.carbs}g`,
            fat: `${newDbMeal.fats}g`
          };
          setMealHistory(prev => [newMeal, ...prev]);
        }
      } catch (err) {
        console.error('Failed to save manual meal in backend:', err);
      }
    }
    
    // Reset Form
    setManualName('');
    setManualCal('');
    setManualPro('');
    setManualCarb('');
    setManualFat('');
    setShowManualModal(false);
  };

  const handleDeleteMeal = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/history/meal/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setMealHistory(prev => prev.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete meal in backend:', err);
    }
    setConfirmDeleteMealId(null);
  };

  const handleAnalyzeMeal = async () => {
    if (!mealDescription.trim() || !profile || !profile.id) return;
    setAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch(`${API_BASE_URL}/nutrition/analyze-meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: mealDescription,
          meal_type: mealType
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze meal.');
      }

      const data = await response.json();
      
      const caloriesVal = data.estimated_calories || 0;
      const proVal = parseInt(data.protein.replace(/\D/g, ''), 10) || 0;
      const carbVal = parseInt(data.carbs.replace(/\D/g, ''), 10) || 0;
      const fatVal = parseInt(data.fats.replace(/\D/g, ''), 10) || 0;
      const todayStr = getLocalDateString();

      // Save to history in backend SQL database
      const saveResponse = await fetch(`${API_BASE_URL}/history/meal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: profile.id,
          date: todayStr,
          name: data.name,
          meal_type: data.meal_type,
          calories: caloriesVal,
          protein: proVal,
          carbs: carbVal,
          fats: fatVal
        })
      });

      if (saveResponse.ok) {
        const newDbMeal = await saveResponse.json();
        const newMeal: Meal = {
          id: newDbMeal.id,
          name: newDbMeal.name,
          type: newDbMeal.meal_type,
          cal: newDbMeal.calories,
          pro: `${newDbMeal.protein}g`,
          carb: `${newDbMeal.carbs}g`,
          fat: `${newDbMeal.fats}g`
        };

        setMealHistory((prev) => [newMeal, ...prev]);
        setMealDescription('');
      } else {
        throw new Error('Failed to permanently save AI analyzed meal.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error communicating with AI Health Coach.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdateSleep = async (hours: number) => {
    setSleepHours(hours);
    if (profile && profile.id) {
      try {
        await fetch(`${API_BASE_URL}/history/daily-update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profile.id,
            date: getLocalDateString(),
            sleep_hours: hours
          })
        });
      } catch (err) {
        console.error('Failed to update sleep hours:', err);
      }
    }
  };

  const handleAddWater = async (amountLiters: number) => {
    const newAmount = parseFloat((waterLogged + amountLiters).toFixed(2));
    setWaterLogged(newAmount);
    
    if (profile && profile.id) {
      try {
        await fetch(`${API_BASE_URL}/history/daily-update`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: profile.id,
            date: getLocalDateString(),
            water_intake: newAmount
          })
        });
      } catch (err) {
        console.error('Failed to sync water intake with backend:', err);
      }
    }
  };

  const totalCaloriesLogged = mealHistory.reduce((sum, meal) => sum + meal.cal, 0);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px] gap-2">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs text-slate-500 font-semibold">Loading Nutrition Core...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative z-10 max-w-5xl mx-auto">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <BrainCircuit className="w-5.5 h-5.5 text-indigo-650" /> AI Smart Log
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">Log meals using natural language or select options to instantly estimate macro-nutrients.</p>
      </div>

      {/* QUICK LOG COMPONENT */}
      <Card className="bg-white border border-slate-200 shadow-md rounded-2xl relative overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" /> Natural Language AI Assistant
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Type what you ate in plain English (e.g. "I had a cup of Greek yogurt with a handful of blueberries and honey").
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          {(errorMsg || voiceError) && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-750">
              <Info className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMsg || voiceError}</span>
            </div>
          )}

          <div className="flex gap-2 p-1 bg-slate-100/85 rounded-lg border border-slate-200/50 max-w-[340px]">
            {['Breakfast', 'Lunch', 'Dinner', 'Snack'].map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMealType(type)}
                className={`py-1 px-3 text-[10px] font-bold rounded-md transition-all duration-200 cursor-pointer ${
                  mealType === type
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-950'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          <div className="relative">
            <textarea 
              rows={3}
              value={mealDescription}
              onChange={(e) => setMealDescription(e.target.value)}
              placeholder={`Describe your ${mealType.toLowerCase()} here... FitAI will estimate calories, protein, carbs, and fats instantly.`}
              className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 resize-none shadow-sm"
            />
            <div className="absolute bottom-3 right-3 flex items-center gap-2">
              <input 
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
              />
              
              <Button 
                onClick={() => fileInputRef.current?.click()}
                disabled={ocrUploading || recording}
                type="button"
                variant="outline"
                className="bg-white border-slate-200 hover:bg-slate-50 text-[10px] px-3 h-7 rounded-lg flex items-center gap-1.5 transition-transform duration-200 hover:scale-102 cursor-pointer shadow-sm text-slate-700 disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5 text-indigo-650" /> {ocrUploading ? 'Scanning...' : 'Upload Image'}
              </Button>
              {recording ? (
                <Button 
                  onClick={stopRecording}
                  type="button"
                  className="bg-rose-650 hover:bg-rose-700 text-white font-semibold text-[10px] px-3 h-7 rounded-lg flex items-center gap-1.5 transition-all duration-200 animate-pulse cursor-pointer shadow-sm border-0"
                >
                  <Square className="w-3.5 h-3.5 fill-white/10" /> Stop Recording
                </Button>
              ) : (
                <Button 
                  onClick={startRecording}
                  type="button"
                  variant="outline"
                  className="bg-white border-slate-200 hover:bg-slate-50 text-[10px] px-3 h-7 rounded-lg flex items-center gap-1.5 transition-transform duration-200 hover:scale-102 cursor-pointer shadow-sm text-slate-700"
                >
                  <Mic className="w-3.5 h-3.5 text-indigo-650" /> Record Meal
                </Button>
              )}
              <Button 
                onClick={() => setShowManualModal(true)}
                type="button"
                variant="outline"
                className="bg-white border-slate-200 hover:bg-slate-50 text-[10px] px-3 h-7 rounded-lg flex items-center gap-1.5 transition-transform duration-200 hover:scale-102 cursor-pointer shadow-sm text-slate-700"
              >
                Manual Log
              </Button>
              <Button 
                onClick={handleAnalyzeMeal}
                disabled={analyzing || !mealDescription.trim() || recording || ocrUploading}
                className="bg-indigo-650 hover:bg-indigo-755 text-white font-semibold text-[10px] px-3 h-7 rounded-lg flex items-center gap-1.5 transition-transform duration-200 hover:scale-102 cursor-pointer shadow-sm disabled:opacity-50 disabled:scale-100"
              >
                {analyzing ? 'Analyzing...' : 'Analyze Meal'} 
                <Sparkles className="w-3 h-3 text-white/80" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* MANUAL LOG OVERLAY MODAL */}
      {showManualModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-5 relative space-y-4 animate-in zoom-in-95 duration-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Manual Meal Entry</h2>
              <p className="text-[10px] text-slate-500">Log your nutrition statistics manually without using AI.</p>
            </div>

            <form onSubmit={handleManualLog} className="space-y-3">
              <div>
                <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Meal Name</label>
                <input 
                  type="text"
                  required
                  placeholder="e.g., Protein Oatmeal"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-950 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Meal Category</label>
                  <select 
                    value={manualCategory}
                    onChange={(e) => setManualCategory(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-950 focus:outline-none focus:border-indigo-500"
                  >
                    <option>Breakfast</option>
                    <option>Lunch</option>
                    <option>Dinner</option>
                    <option>Snack</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Calories (kcal)</label>
                  <input 
                    type="number"
                    required
                    min={0}
                    placeholder="350"
                    value={manualCal}
                    onChange={(e) => setManualCal(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-950 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Protein (g)</label>
                  <input 
                    type="number"
                    required
                    min={0}
                    placeholder="25"
                    value={manualPro}
                    onChange={(e) => setManualPro(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-950 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Carbs (g)</label>
                  <input 
                    type="number"
                    required
                    min={0}
                    placeholder="30"
                    value={manualCarb}
                    onChange={(e) => setManualCarb(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-950 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Fat (g)</label>
                  <input 
                    type="number"
                    required
                    min={0}
                    placeholder="10"
                    value={manualFat}
                    onChange={(e) => setManualFat(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-950 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button 
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all duration-150"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-semibold cursor-pointer transition-all duration-150 shadow-sm"
                >
                  Log Meal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* OCR CONFIRMATION MODAL */}
      {showOcrModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm shadow-xl p-5 relative space-y-4 animate-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Confirm OCR Scan
              </h3>
              <p className="text-[10px] text-slate-500">
                Verify and edit the nutrition information extracted from your image scan.
              </p>
            </div>
            
            <form onSubmit={handleOcrLogConfirm} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-650">Food Name</label>
                <input 
                  type="text"
                  required
                  value={ocrData.name}
                  onChange={(e) => setOcrData({...ocrData, name: e.target.value})}
                  className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Calories (kcal)</label>
                  <input 
                    type="number"
                    required
                    value={ocrData.estimated_calories}
                    onChange={(e) => setOcrData({...ocrData, estimated_calories: parseInt(e.target.value, 10) || 0})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Serving Size</label>
                  <input 
                    type="text"
                    value={ocrData.serving_size || ''}
                    onChange={(e) => setOcrData({...ocrData, serving_size: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Protein</label>
                  <input 
                    type="text"
                    required
                    value={ocrData.protein}
                    onChange={(e) => setOcrData({...ocrData, protein: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Carbs</label>
                  <input 
                    type="text"
                    required
                    value={ocrData.carbs}
                    onChange={(e) => setOcrData({...ocrData, carbs: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-650">Fats</label>
                  <input 
                    type="text"
                    required
                    value={ocrData.fats}
                    onChange={(e) => setOcrData({...ocrData, fats: e.target.value})}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 text-center focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {ocrData.raw_text_summary && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2 max-h-[80px] overflow-y-auto">
                  <p className="text-[9px] text-slate-500 font-medium">Detected Text / Vision Scan Summary:</p>
                  <p className="text-[9px] text-slate-600 mt-0.5 leading-relaxed">{ocrData.raw_text_summary}</p>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button 
                  onClick={() => setShowOcrModal(false)}
                  type="button"
                  variant="outline"
                  className="flex-1 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] h-8 rounded-lg cursor-pointer"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={analyzing}
                  className="flex-1 bg-indigo-650 hover:bg-indigo-755 text-white font-semibold text-[10px] h-8 rounded-lg cursor-pointer disabled:opacity-50"
                >
                  {analyzing ? 'Saving...' : 'Confirm & Log'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LOGGED MEALS HISTORY */}
        <Card className="lg:col-span-2 bg-white border border-slate-200 shadow-sm rounded-xl">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-sm font-bold text-slate-900">Today's Food Log</CardTitle>
              <CardDescription className="text-xs text-slate-500">Tracked meals for today</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-700 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5 font-bold shadow-sm">
                {totalCaloriesLogged.toLocaleString()} kcal logged
              </span>
              {gamificationStatus && (
                gamificationStatus.streak_secured_today ? (
                  <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-0.5 font-bold shadow-sm flex items-center gap-1.5 animate-in fade-in duration-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                    Streak Secured 🔥
                  </span>
                ) : (
                  <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-0.5 font-bold shadow-sm flex items-center gap-1.5 animate-in fade-in duration-300">
                    In Progress 🎯
                  </span>
                )
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2.5">
              {mealHistory.map((meal) => (
                <div key={meal.id} className="bg-slate-50/70 border border-slate-200/50 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-300">
                  <div className="space-y-1">
                    <span className="text-[9px] uppercase font-bold text-indigo-750 tracking-wider bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-full inline-block">
                      {meal.type}
                    </span>
                    <h3 className="text-xs font-bold text-slate-800">{meal.name}</h3>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-semibold justify-between md:justify-end">
                    <div className="text-right">
                      <p className="font-extrabold text-slate-950">{meal.cal} kcal</p>
                      <p className="text-[10px] text-slate-500">
                        P: {meal.pro} | C: {meal.carb} | F: {meal.fat}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 border-l border-slate-200 pl-3">
                      <button 
                        onClick={() => handleOpenEditMeal(meal)}
                        className="text-slate-500 hover:text-indigo-650 p-1 cursor-pointer transition-colors"
                        title="Edit meal entry"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                      </button>
                      <button 
                        onClick={() => setConfirmDeleteMealId(meal.id)}
                        className="text-slate-500 hover:text-rose-600 p-1 cursor-pointer transition-colors"
                        title="Delete meal entry"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* DELETE MEAL CONFIRMATION MODAL */}
        {confirmDeleteMealId !== null && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
            <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xs shadow-xl p-5 relative space-y-4 text-center animate-in zoom-in-95 duration-200">
              <div className="w-10 h-10 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
              </div>
              <div>
                <h2 className="text-xs font-bold text-slate-900">Delete meal entry?</h2>
                <p className="text-[10px] text-slate-500 mt-1">This action cannot be undone. Today's calorie metrics calculations will adapt accordingly.</p>
              </div>

              <div className="flex items-center justify-center gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setConfirmDeleteMealId(null)}
                  className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-[10px] px-3.5 py-1.5 rounded-md font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="button"
                  onClick={() => handleDeleteMeal(confirmDeleteMealId)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-3.5 py-1.5 rounded-md font-semibold cursor-pointer"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WATER TRACKER WIDGET */}
        <div className="space-y-6">
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold text-slate-900">Hydration Tracker</CardTitle>
              <CardDescription className="text-xs text-slate-500">Maintain water levels to regulate BMR output.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 text-center">
              <div className="relative inline-flex items-center justify-center">
                {/* Conceptual Water Progress Drop */}
                <div className="w-22 h-22 rounded-full bg-slate-50 border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden shadow-inner">
                  <div 
                    className="absolute bottom-0 left-0 w-full bg-indigo-50 border-t border-indigo-100 transition-all duration-500" 
                    style={{ height: `${Math.min((waterLogged / waterTarget) * 100, 100)}%` }}
                  />
                  <Droplets className="w-5 h-5 text-indigo-600 z-10" />
                  <span className="text-sm font-extrabold text-slate-850 z-10 mt-0.5">{waterLogged} L</span>
                  <span className="text-[9px] text-slate-550 z-10 font-bold">Target: {waterTarget} L</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 max-w-[190px] mx-auto">
                <Button 
                  onClick={() => handleAddWater(0.25)}
                  size="sm" 
                  variant="outline" 
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-[10px] h-8 font-semibold flex items-center justify-center gap-1 cursor-pointer rounded-lg shadow-sm"
                >
                  +250 ml <Plus className="w-3 h-3 text-indigo-650" />
                </Button>
                <Button 
                  onClick={() => handleAddWater(0.5)}
                  size="sm" 
                  variant="outline" 
                  className="border border-slate-200 bg-white hover:bg-slate-50 text-[10px] h-8 font-semibold flex items-center justify-center gap-1 cursor-pointer rounded-lg shadow-sm"
                >
                  +500 ml <Plus className="w-3 h-3 text-indigo-650" />
                </Button>
              </div>

              <div className="flex flex-col gap-3.5 border-t border-slate-100 pt-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-700">
                    Active Workout Day?
                  </span>
                  <input
                    type="checkbox"
                    checked={isWorkoutDay}
                    onChange={(e) => setIsWorkoutDay(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer size-4"
                  />
                </div>
                
                <div className="flex flex-col gap-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Activity Level
                  </span>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm animate-none"
                  >
                    <option value="Sedentary">Sedentary (Little/no exercise)</option>
                    <option value="Lightly Active">Lightly Active (1-3 days/wk)</option>
                    <option value="Moderately Active">Moderately Active (3-5 days/wk)</option>
                    <option value="Very Active">Very Active (6-7 days/wk)</option>
                  </select>
                </div>
                
                <div className="flex flex-col gap-1 border-t border-slate-100 pt-3 mt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Sleep Duration (hours)
                  </span>
                  <input 
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    value={sleepHours}
                    onChange={(e) => handleUpdateSleep(parseFloat(e.target.value) || 0.0)}
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-800 focus:outline-none focus:border-indigo-500 shadow-sm"
                  />
                </div>
              </div>

              {aiRecommendation && (
                <div className="p-3 bg-indigo-50/50 border border-indigo-100/60 rounded-xl text-left space-y-1.5 animate-in fade-in duration-300">
                  <div className="flex items-center gap-1.5 text-indigo-750 font-bold text-[9px] uppercase tracking-wider">
                    <Sparkles className="w-3 h-3 text-indigo-650 animate-pulse" /> AI Recommendation
                  </div>
                  <p className="text-[10.5px] text-slate-650 font-medium leading-relaxed">
                    {loadingRecommendation ? (
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 border-2 border-indigo-650 border-t-transparent rounded-full animate-spin"></span>
                        Recalculating...
                      </span>
                    ) : aiRecommendation}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI GROCERY LIST GENERATOR */}
          <Card className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardHeader className="pb-2.5">
              <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" /> Weekly Grocery List
              </CardTitle>
              <CardDescription className="text-xs text-slate-500">Auto-generate categorized items matching diet splits.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-1">
              {!groceryData ? (
                <button
                  onClick={handleGenerateGrocery}
                  disabled={loadingGrocery}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2 rounded-lg font-bold cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {loadingGrocery ? 'Generating list...' : 'Generate Grocery List'}
                  <Sparkles className="w-3.5 h-3.5 text-white/85" />
                </button>
              ) : (
                <div className="space-y-3.5 animate-in fade-in duration-300">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-650 bg-emerald-55/10 border border-emerald-100 px-2 py-0.5 rounded-full">
                      Ready to Shop
                    </span>
                    <button 
                      onClick={() => setGroceryData(null)}
                      className="text-[9px] text-slate-450 hover:text-rose-600 cursor-pointer font-bold transition-colors"
                    >
                      Clear List
                    </button>
                  </div>

                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {Object.entries(groceryData).map(([category, items]: any) => {
                      if (!items || items.length === 0) return null;
                      return (
                        <div key={category} className="space-y-1.5">
                          <h4 className="text-[9px] uppercase tracking-wider font-extrabold text-indigo-750 bg-indigo-50/50 px-2 py-0.5 rounded border border-indigo-100/30">
                            {category.replace('_', ' ')}
                          </h4>
                          <div className="space-y-1 pl-1">
                            {items.map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[11px] text-slate-700 font-medium">
                                <span className="flex items-center gap-1.5">
                                  <input type="checkbox" className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer size-3" />
                                  {item.name}
                                </span>
                                <span className="text-slate-450 text-[10px] font-bold">{item.quantity}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>


      </div>
    </div>
  );
}
