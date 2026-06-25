'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient, isMock } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Flame, Mail, Lock, Dumbbell, AlertCircle, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Restore expired mock sessions on mount
  React.useEffect(() => {
    if (isMock) {
      try {
        const mockUser = localStorage.getItem('fitai_mock_user');
        if (mockUser) {
          document.cookie = "fitai-mock-session=true; path=/; max-age=86400; SameSite=Lax";
          const profile = localStorage.getItem('fitai_mock_profile');
          if (profile) {
            document.cookie = `fitai-mock-profile=${encodeURIComponent(profile)}; path=/; max-age=86400; SameSite=Lax`;
          }
          window.location.href = '/dashboard';
        }
      } catch (err) {
        console.error('Failed to restore mock session on mount:', err);
      }
    }
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // 1. Client-Side Email Format Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMsg('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    // 2. Client-Side Password Length Check (Supabase default minimum is 6 characters)
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      if (activeTab === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;
        
        window.location.href = '/dashboard';
      } else {
        // Sign up
        const { error, data } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              name: name || '',
            },
          },
        });

        if (error) throw error;

        if (data.session) {
          setSuccessMsg('Account created successfully! Redirecting...');
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 1500);
        } else {
          setSuccessMsg('Signup successful! Please check your email for a confirmation link.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-slate-50 p-4 md:p-8">
      <div className="relative w-full max-w-[440px] animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Logo and Brand Header */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-600/10">
            <Flame className="w-6 h-6 fill-white/10" />
          </div>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-900">
            FitAI
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            Premium AI-powered physical baseline & athletic engine.
          </p>
        </div>

        {/* Sandbox Mode indicator */}
        {isMock && (
          <div className="mb-4 flex items-center justify-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50/80 py-2 px-3.5 text-[10px] font-semibold text-amber-800 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
            Sandbox Mode active. Using local mock database.
          </div>
        )}

        {/* Card Component */}
        <Card className="border border-slate-200 bg-white shadow-md rounded-2xl">
          <CardHeader className="space-y-1 pb-4">
            <div className="grid grid-cols-2 p-1 bg-slate-100/80 rounded-lg border border-slate-200/50 mb-4">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('login');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-all duration-200 ${
                  activeTab === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('signup');
                  setErrorMsg(null);
                  setSuccessMsg(null);
                }}
                className={`py-1.5 px-3 text-xs font-semibold rounded-md transition-all duration-200 ${
                  activeTab === 'signup'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Create Account
              </button>
            </div>
            
            <CardTitle className="text-lg font-bold text-slate-900">
              {activeTab === 'login' ? 'Welcome Back' : 'Create an Account'}
            </CardTitle>
            <CardDescription className="text-slate-500 text-xs">
              {activeTab === 'login'
                ? 'Sign in to access your nutrition and workout logs.'
                : 'Enter your credentials to start your physical transformation.'}
            </CardDescription>
          </CardHeader>

          <form onSubmit={handleAuth}>
            <CardContent className="space-y-4 pt-1">
              {/* Error & Success Alerts */}
              {errorMsg && (
                <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-650 mt-0.5" />
                  <p className="font-medium leading-normal">{errorMsg}</p>
                </div>
              )}
              {successMsg && (
                <div className="flex items-start gap-2.5 rounded-lg border border-emerald-250 bg-emerald-50 p-3 text-xs text-emerald-800 animate-in fade-in duration-200">
                  <Sparkles className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
                  <p className="font-medium leading-normal">{successMsg}</p>
                </div>
              )}

              {/* Full Name input for Signup */}
              {activeTab === 'signup' && (
                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-xs font-semibold text-slate-700">
                    Full Name
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      type="text"
                      placeholder="Alex Mercer"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 h-9.5 text-xs rounded-lg"
                    />
                    <Dumbbell className="absolute left-3 top-3 h-4 w-4 text-slate-450" />
                  </div>
                </div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-9 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 h-9.5 text-xs rounded-lg"
                  />
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-455" />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-9 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 text-slate-900 placeholder-slate-400 h-9.5 text-xs rounded-lg"
                  />
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-455" />
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex flex-col gap-3 pt-3 pb-6">
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 hover:bg-indigo-750 text-white font-semibold shadow-sm h-9.5 text-xs rounded-lg transition-all duration-200 active:scale-[0.985] cursor-pointer"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>Processing...</span>
                  </div>
                ) : activeTab === 'login' ? (
                  'Sign In'
                ) : (
                  'Start My Transformation'
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
