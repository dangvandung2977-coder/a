'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AuthView from '@/components/AuthView';
import DashboardView from '@/components/DashboardView';
import ActiveWorkoutScreen from '@/components/ActiveWorkoutScreen';

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentView, setCurrentView] = useState<'DASHBOARD' | 'WORKOUT'>('DASHBOARD');
  const [activeRoutineInfo, setActiveRoutineInfo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white text-sm">Đang tải ứng dụng...</div>;
  }

  // 1. Chưa đăng nhập
  if (!session) {
    return <AuthView onAuthSuccess={() => window.location.reload()} />;
  }

  // 2. Chế độ đang tập (Truyền ID lịch thật vào)
  if (currentView === 'WORKOUT' && activeRoutineInfo) {
    return (
      <main className="bg-slate-950 min-h-screen">
        <ActiveWorkoutScreen 
          routineId={activeRoutineInfo.id} 
          onBack={() => setCurrentView('DASHBOARD')} 
        />
      </main>
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