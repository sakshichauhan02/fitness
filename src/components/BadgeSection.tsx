'use client';

import React from 'react';
import { Flame, Medal, Trophy, Star, ShieldAlert, Sparkles, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface UnlockedBadge {
  badge_name: string;
  unlocked_at: string;
}

interface BadgeSectionProps {
  unlockedBadges: UnlockedBadge[];
  loading?: boolean;
}

interface BadgeDefinition {
  name: string;
  description: string;
  requirement: string;
  icon: React.ReactNode;
  colorClass: string;
  bgClass: string;
  borderClass: string;
}

export default function BadgeSection({ unlockedBadges, loading = false }: BadgeSectionProps) {
  const badgeDefinitions: BadgeDefinition[] = [
    {
      name: "7-Day Fire",
      description: "Nutrition consistency is ignited",
      requirement: "7 consecutive days of logging & meeting targets",
      icon: <Flame className="w-6 h-6" />,
      colorClass: "text-orange-500",
      bgClass: "bg-orange-50",
      borderClass: "border-orange-200"
    },
    {
      name: "30-Day Consistency",
      description: "Dedicated physical conditioning",
      requirement: "30 consecutive days of logging & meeting targets",
      icon: <Medal className="w-6 h-6" />,
      colorClass: "text-teal-500",
      bgClass: "bg-teal-50",
      borderClass: "border-teal-200"
    },
    {
      name: "50-Day Elite",
      description: "Elite metabolic progression",
      requirement: "50 consecutive days of logging & meeting targets",
      icon: <Trophy className="w-6 h-6" />,
      colorClass: "text-purple-500",
      bgClass: "bg-purple-50",
      borderClass: "border-purple-200"
    },
    {
      name: "100-Day Club",
      description: "Absolute athletic mastery",
      requirement: "100 consecutive days of logging & meeting targets",
      icon: <Star className="w-6 h-6" />,
      colorClass: "text-amber-500",
      bgClass: "bg-amber-50",
      borderClass: "border-amber-200"
    }
  ];

  if (loading) {
    return (
      <Card className="bg-white border border-slate-200 shadow-sm rounded-xl p-6 flex flex-col items-center justify-center min-h-[200px] gap-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-[10px] text-slate-500 font-semibold">Loading badges...</p>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200 shadow-sm rounded-xl">
      <CardHeader className="pb-2.5">
        <CardTitle className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
          <Trophy className="w-4.5 h-4.5 text-indigo-650" />
          Milestone Badges
        </CardTitle>
        <CardDescription className="text-[11px] text-slate-550">
          Unlock premium badges by securing consecutive streak days
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pt-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {badgeDefinitions.map((badge) => {
            const unlockedInfo = unlockedBadges.find(
              (b) => b.badge_name.toLowerCase() === badge.name.toLowerCase()
            );
            const isUnlocked = !!unlockedInfo;

            return (
              <div
                key={badge.name}
                className={`relative border rounded-xl p-3.5 flex flex-col items-center justify-center text-center transition-all duration-300 group cursor-default ${
                  isUnlocked
                    ? `${badge.bgClass} ${badge.borderClass} shadow-xs hover:scale-103`
                    : 'bg-slate-50/40 border-slate-200/60 opacity-60 hover:opacity-85'
                }`}
              >
                {/* Badge Icon */}
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center mb-2.5 shadow-inner transition-transform duration-300 group-hover:scale-105 ${
                    isUnlocked 
                      ? `bg-white ${badge.colorClass}` 
                      : 'bg-slate-100 text-slate-400'
                  }`}
                >
                  {badge.icon}
                </div>

                {/* Badge Details */}
                <h4 className="text-[10.5px] font-bold text-slate-900 leading-tight">
                  {badge.name}
                </h4>
                <p className="text-[9px] text-slate-500 font-semibold mt-0.5 line-clamp-1">
                  {badge.description}
                </p>

                {/* Unlock status mark */}
                {isUnlocked && (
                  <div className="absolute top-2 right-2 text-emerald-600" title={`Unlocked on ${new Date(unlockedInfo.unlocked_at).toLocaleDateString()}`}>
                    <CheckCircle2 className="w-3.5 h-3.5 fill-white" />
                  </div>
                )}

                {/* Tooltip on hover */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 p-2 bg-slate-900 text-white text-[9px] font-semibold rounded-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-200 shadow-lg text-center z-20">
                  <p className="font-bold border-b border-white/10 pb-0.5 mb-1 text-slate-200">{badge.name}</p>
                  <p className="text-white/80 leading-normal">{badge.requirement}</p>
                  {isUnlocked && (
                    <p className="text-emerald-400 font-bold mt-1 text-[8.5px]">
                      Unlocked: {new Date(unlockedInfo.unlocked_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
