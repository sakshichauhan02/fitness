'use client';

import React, { useState, useEffect } from 'react';
import { Sparkles, X, Download, Share } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone mode (already installed)
    const checkStandalone = 
      window.matchMedia('(display-mode: standalone)').matches || 
      (window.navigator as any).standalone === true;
    
    setIsStandalone(checkStandalone);

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    const isSafari = /safari/.test(userAgent) && !/chrome|crios|fxios|opera|biubiu/.test(userAgent);
    setIsIOS(ios && isSafari);

    // If already running standalone, do not show prompt
    if (checkStandalone) return;

    // Check if user dismissed prompt in this session
    const dismissed = sessionStorage.getItem('fitai_pwa_dismissed');
    if (dismissed === 'true') return;

    // Listen for beforeinstallprompt for Android/Chrome/Windows
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e);
      // Show the install prompt banner
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // For iOS users, show the prompt automatically after 4 seconds (but only if on mobile viewport)
    if (ios && isSafari) {
      const timer = setTimeout(() => {
        // Double check viewport width to only prompt on mobile layout
        if (window.innerWidth < 768) {
          setShowPrompt(true);
        }
      }, 4000);
      return () => clearTimeout(timer);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the native install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // We've used the prompt, and can't use it again, discard it
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    sessionStorage.setItem('fitai_pwa_dismissed', 'true');
    setShowPrompt(false);
  };

  if (!showPrompt || isStandalone) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-md z-50 animate-in slide-in-from-bottom-5 duration-350 ease-out">
      <Card className="bg-white border border-indigo-100 shadow-xl rounded-2xl overflow-hidden">
        <CardContent className="p-4.5 relative">
          {/* Close button */}
          <button 
            onClick={handleDismiss}
            className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 transition-colors p-1"
            title="Dismiss installation guide"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex gap-3.5 items-start pr-6">
            {/* App Icon Mock */}
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-indigo-650 to-indigo-500 flex items-center justify-center text-white shadow-md shrink-0 border border-indigo-200/40">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-xs font-black text-slate-900 leading-tight">Install FitAI App</h3>
              <p className="text-[10.5px] text-slate-550 leading-relaxed font-medium">
                Add FitAI to your home screen for quick access, offline logging, and a distraction-free fullscreen training experience.
              </p>
            </div>
          </div>

          {isIOS ? (
            // iOS Specific installation instructions
            <div className="mt-4 pt-3.5 border-t border-slate-100/80">
              <div className="bg-indigo-50/70 border border-indigo-100/50 rounded-xl p-2.5 text-left flex items-start gap-2.5 animate-in fade-in duration-250">
                <Share className="w-4 h-4 text-indigo-650 shrink-0 mt-0.5" />
                <div className="text-[10px] text-indigo-950 leading-normal font-semibold">
                  To install, tap the <strong className="font-bold">Share</strong> button in Safari, scroll down and select <strong className="font-bold">"Add to Home Screen"</strong>.
                </div>
              </div>
            </div>
          ) : (
            // Standard native PWA installation prompt button
            <div className="mt-4 pt-3.5 border-t border-slate-100/80 flex items-center justify-end gap-2">
              <button 
                onClick={handleDismiss}
                className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Maybe Later
              </button>
              <Button 
                onClick={handleInstallClick}
                className="bg-indigo-600 hover:bg-indigo-755 text-white font-bold text-[10px] h-8 px-4 rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer transition-transform duration-200 hover:scale-102"
              >
                <Download className="w-3.5 h-3.5" /> Install Now
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
