'use client';

import React, { useState, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import AuthView from '@/components/AuthView';
import DashboardView from '@/components/DashboardView';
import ActiveWorkoutScreen from '@/components/ActiveWorkoutScreen';

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [authScreenActive, setAuthScreenActive] = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'WORKOUT'>('DASHBOARD');
  const [activeRoutineInfo, setActiveRoutineInfo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const initialRecovery = new URLSearchParams(window.location.search).get('auth') === 'recovery'
      || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery';
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthScreenActive(!session);
      if (initialRecovery && session) setPasswordRecovery(true);
    }).catch(() => {}).finally(() => setLoading(false));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      if (event === 'SIGNED_OUT') {
        setPasswordRecovery(false);
        setAuthScreenActive(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="app-loading" role="status"><Loader2 className="animate-spin" size={24} aria-hidden="true" />Đang tải ứng dụng...</div>;
  }

  // 1. Chưa đăng nhập
  if (!session || authScreenActive || passwordRecovery) {
    return <AuthView passwordRecovery={passwordRecovery && Boolean(session)} onAuthSuccess={() => {
      const url = new URL(window.location.href);
      url.searchParams.delete('auth');
      window.history.replaceState(null, '', url);
      window.location.reload();
    }} />;
  }

  // 2. Chế độ đang tập (Truyền ID lịch thật vào)
  if (currentView === 'WORKOUT' && activeRoutineInfo) {
    return (
      <div className="app-workout-page">
        <ActiveWorkoutScreen 
          routineId={activeRoutineInfo.id} 
          routineName={activeRoutineInfo.name}
          onBack={() => setCurrentView('DASHBOARD')} 
        />
      </div>
    );
  }

  // 3. Màn hình Dashboard chính
  return (
    <DashboardView 
      onStartWorkout={(routineId, routineName) => {
        setActiveRoutineInfo({ id: routineId, name: routineName });
        setCurrentView('WORKOUT');
      }} 
    />
  );
}
