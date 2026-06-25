'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Calendar, Loader2 } from 'lucide-react';
import HistoryCalendar from '@/components/HistoryCalendar';

export default function HistoryPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.error('Error loading user in history page:', err);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-650" />
        <p className="text-xs font-semibold">Initializing history workspace...</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="text-center py-12 text-sm text-slate-550 font-semibold">
        Please sign in to access your historical logs.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative z-10">
      <div>
        <h1 className="text-xl md:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Calendar className="w-5.5 h-5.5 text-indigo-650" /> History Calendar
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Navigate and review your complete historical logs of meals, water intake, weight entries, and workout consistency.
        </p>
      </div>

      <HistoryCalendar userId={userId} />
    </div>
  );
}
