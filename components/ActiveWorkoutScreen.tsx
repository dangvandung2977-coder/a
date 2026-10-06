// components/ActiveWorkoutScreen.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDialogFocus } from '@/components/useDialogFocus';
import { supabase } from '@/lib/supabaseClient';
import {
  Play,
  FastForward,
  Check,
  X,
  Dumbbell,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Timer,
  Target,
  Weight,
  Minus,
  Plus,
  Loader2,
  ChevronRight,
  RotateCcw,
} from 'lucide-react';
import { calculateNextSession } from '@/types/progression';

interface ExerciseItem {
  id: string;
  name: string;
  targetWeight: number;
  targetReps: number[];
  minRep: number;
  maxRep: number;
  restSeconds: number;
  completed?: boolean;
}

export default function ActiveWorkoutScreen({
  routineId,
  routineName = 'Buổi tập',
  onBack
}: {
  routineId: string;
  routineName?: string;
  onBack: () => void;
}) {
  const [exercises, setExercises] = useState<ExerciseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentSet, setCurrentSet] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [timerLeft, setTimerLeft] = useState(0);

  // Modals
  const [showMachineCheck, setShowMachineCheck] = useState(true);
  const [showAlternativeModal, setShowAlternativeModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [actualReps, setActualReps] = useState<number[]>([]);
  const [isEditingReps, setIsEditingReps] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [progressMessage, setProgressMessage] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  useDialogFocus(!loading && !finished && (showMachineCheck ? 'machine' : showAlternativeModal ? 'alternative'
    : showSummaryModal ? 'summary' : isResting ? 'rest' : false));

  const loadWorkoutData = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoadError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'); return; }
      setLoading(true);
      setLoadError(null);

      const { data: routineExList, error: routineError } = await supabase
        .from('routine_exercises')
        .select('exercise_id, order_index')
        .eq('routine_id', routineId)
        .order('order_index', { ascending: true });
      if (routineError) throw routineError;

      if (!routineExList || routineExList.length === 0) {
        setLoadError('Lịch này chưa có bài tập. Quay lại và chỉnh sửa giáo án để thêm bài.');
        return;
      }

      const exIds = routineExList.map(r => r.exercise_id);

      const { data: libData, error: libraryError } = await supabase
        .from('exercises_library')
        .select('*')
        .in('id', exIds);
      if (libraryError) throw libraryError;

      const { data: states, error: statesError } = await supabase
        .from('user_exercise_state')
        .select('*')
        .eq('user_id', user.id)
        .in('exercise_id', exIds);
      if (statesError) throw statesError;

      const mapped: ExerciseItem[] = routineExList.map(item => {
        const ex = libData?.find(l => l.id === item.exercise_id);
        const state = states?.find(s => s.exercise_id === item.exercise_id);

        const setsCount = ex?.default_sets || 3;
        const minRep = ex?.default_min_rep ?? 8;
        const maxRep = ex?.default_max_rep ?? 12;

        return {
          id: item.exercise_id,
          name: ex?.name || 'Bài tập',
          targetWeight: state?.current_weight || 20,
          targetReps: state?.target_reps || Array(setsCount).fill(minRep),
          minRep: minRep,
          maxRep: maxRep,
          restSeconds: ex?.default_rest_seconds || 90,
          completed: false,
        };
      });

      setExercises(mapped);
    } catch {
      setLoadError('Không thể tải buổi tập. Kiểm tra kết nối và thử lại.');
    } finally { setLoading(false); }
  }, [routineId]);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) loadWorkoutData(); });
    return () => { cancelled = true; };
  }, [loadWorkoutData]);

  const currentExercise = exercises[currentIndex];
  const moveToNextSet = useCallback(() => {
    if (!currentExercise) return;
    if (currentSet < currentExercise.targetReps.length) {
      setCurrentSet((prev) => prev + 1);
    } else {
      setActualReps([...currentExercise.targetReps]);
      setShowSummaryModal(true);
    }
  }, [currentSet, currentExercise]);

  // Keep timer transitions in the timer callback rather than synchronous effects.
  useEffect(() => {
    if (!isResting) return;
    const timeout = setTimeout(() => {
      if (timerLeft <= 1) {
        setTimerLeft(0);
        setIsResting(false);
        if ('vibrate' in navigator) navigator.vibrate([200, 100, 200]);
        moveToNextSet();
      } else {
        setTimerLeft((prev) => prev - 1);
      }
    }, timerLeft > 0 ? 1000 : 0);
    return () => clearTimeout(timeout);
  }, [isResting, timerLeft, moveToNextSet]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-zinc-800" />
          <Loader2 className="absolute inset-0 m-auto text-lime-400 animate-spin" size={28} />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-zinc-200">Đang chuẩn bị buổi tập</p>
          <p className="text-xs text-zinc-500 mt-1">Đồng bộ dữ liệu từ hệ thống...</p>
        </div>
      </div>
    );
  }

  if (finished || loadError || !currentExercise) {
    return <main className="app-screen flex min-h-screen items-center justify-center p-5">
      <section className="w-full max-w-md rounded-3xl bg-zinc-900 border border-zinc-800 p-7 text-center">
        <div className="w-14 h-14 rounded-2xl bg-lime-400/10 text-lime-400 flex items-center justify-center mx-auto mb-5">
          {finished ? <Check size={28} aria-hidden="true" /> : <Dumbbell size={26} aria-hidden="true" />}
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{finished ? 'Buổi tập hoàn thành!' : 'Chưa thể bắt đầu buổi tập'}</h1>
        <p className="text-sm text-zinc-400 leading-relaxed mt-3" role="status">{finished ? 'Bạn đã hoàn thành toàn bộ giáo án. Kết quả đã được lưu — tiếp tục tiến bộ ở buổi tập tới.' : loadError || 'Chưa có bài tập trong giáo án này.'}</p>
        {finished && progressMessage && <p className="app-feedback is-success text-left">{progressMessage}</p>}
        <button type="button" className="auth-primary mt-6" onClick={onBack}><ArrowLeft size={17} aria-hidden="true" />Về giáo án của bạn</button>
        {!finished && <button type="button" className="auth-text-link mt-4" onClick={loadWorkoutData}>Thử tải lại</button>}
      </section>
    </main>;
  }

  const handleCompleteSet = () => {
    setTimerLeft(currentExercise.restSeconds);
    setIsResting(true);
  };

  const handleMachineBusy = () => {
    setShowMachineCheck(false);
    setShowAlternativeModal(true);
  };

  const handleSelectAlternativeExercise = (selectedId: string) => {
    const targetIdx = exercises.findIndex(ex => ex.id === selectedId);
    if (targetIdx !== -1) {
      setCurrentIndex(targetIdx);
      setCurrentSet(1);
      setShowAlternativeModal(false);
      setShowMachineCheck(false);
    }
  };

  // LƯU KẾT QUẢ VÀ TỰ ĐỘNG THẮP SÁNG Ô TÍM KHI XONG BUỔI
  const finalizeExercise = async (finalReps: number[]) => {
    if (saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaveError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'); return; }

      const { data: oldState } = await supabase
        .from('user_exercise_state')
        .select('*')
        .eq('user_id', user.id)
        .eq('exercise_id', currentExercise.id)
        .single();

      const calculation = calculateNextSession(
        {
          currentWeight: currentExercise.targetWeight,
          targetReps: currentExercise.targetReps,
          plateauCount: oldState?.plateau_count || 0,
          isCalibrating: oldState?.is_calibrating ?? true,
          lastReps: oldState?.last_reps || [],
        },
        finalReps,
        'upper_compound',
        true,
        currentExercise.minRep,
        currentExercise.maxRep
      );

      // Lưu trạng thái tạ
      const { error: stateError } = await supabase.from('user_exercise_state').upsert({
        user_id: user.id,
        exercise_id: currentExercise.id,
        current_weight: calculation.nextWeight,
        target_reps: calculation.nextTargetReps,
        plateau_count: calculation.nextPlateauCount,
        is_calibrating: calculation.isCalibrating,
        last_reps: finalReps,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id, exercise_id' });
      if (stateError) throw stateError;

      const updated = [...exercises];
      updated[currentIndex].completed = true;

      const nextUncompleted = updated.findIndex(ex => !ex.completed);
      if (nextUncompleted !== -1) {
        setProgressMessage(calculation.actionMessage);
        setShowSummaryModal(false);
        setIsEditingReps(false);
        setExercises(updated);
        setCurrentIndex(nextUncompleted);
        setCurrentSet(1);
        setShowMachineCheck(true);
      } else {
        // ĐÃ XONG TẤT CẢ CÁC BÀI -> GHI NHẬT KÝ VÀO BẢNG WORKOUT_LOGS ĐỂ THẮP SÁNG Ô TÍM TRÊN HEATMAP
        const todayStr = new Date().toISOString().split('T')[0];
        const { error: logError } = await supabase.from('workout_logs').insert({
          user_id: user.id,
          workout_date: todayStr,
          routine_name: routineName,
          level: 2, // Mức 2: Tím phát sáng
          summary: 'Đã hoàn thành toàn bộ các bài tập hôm nay!'
        });
        if (logError) throw logError;
        setProgressMessage(calculation.actionMessage);
        setShowSummaryModal(false);
        setFinished(true);
      }
    } catch {
      setSaveError('Không thể lưu kết quả. Vui lòng kiểm tra kết nối và thử lại.');
    } finally { setSaving(false); }
  };

  const remainingExercises = exercises.filter((ex, idx) => !ex.completed && idx !== currentIndex);

  // Derived values used only for display
  const totalSets = currentExercise.targetReps.length;
  const completedCount = exercises.filter(ex => ex.completed).length;
  const sessionProgress = exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0;
  const currentTargetRep = currentExercise.targetReps[currentSet - 1];
  const isLastSet = currentSet >= totalSets;
  const nextSetReps = !isLastSet ? currentExercise.targetReps[currentSet] : null;
  const formattedTimer = `${Math.floor(timerLeft / 60)}:${timerLeft % 60 < 10 ? `0${timerLeft % 60}` : timerLeft % 60}`;
  const restRatio = currentExercise.restSeconds > 0 ? timerLeft / currentExercise.restSeconds : 0;
  const RING_RADIUS = 120;
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
  const upNext = exercises
    .map((ex, idx) => ({ ...ex, idx }))
    .filter(ex => !ex.completed && ex.idx !== currentIndex)
    .slice(0, 3);

  return (
    <div className="app-screen workout-screen relative flex flex-col">
      {/* HEADER */}
      <header className="workout-header relative z-10">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            aria-label="Thoát buổi tập"
            className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white hover:border-zinc-700 transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="text-center min-w-0 px-3">
            <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Đang tập</p>
            <p className="text-sm font-semibold text-zinc-100 truncate">{routineName}</p>
          </div>
          <div className="h-10 px-3 rounded-full bg-zinc-900 border border-zinc-800 flex items-center gap-1.5 text-xs font-bold tabular-nums">
            <span className="text-lime-400">{completedCount}</span>
            <span className="text-zinc-600">/</span>
            <span className="text-zinc-400">{exercises.length}</span>
          </div>
        </div>

        {/* Session progress segments */}
        <div className="mt-5 flex gap-1" role="progressbar" aria-valuenow={Math.round(sessionProgress)} aria-valuemin={0} aria-valuemax={100} aria-label="Tiến độ buổi tập">
          {exercises.map((ex, idx) => (
            <div
              key={ex.id}
              className={`h-1 flex-1 rounded-full transition-colors ${
                ex.completed
                  ? 'bg-lime-400'
                  : idx === currentIndex
                    ? 'bg-zinc-300'
                    : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="workout-content relative z-10 flex-1 flex flex-col">
        {/* Exercise title */}
        <div className="workout-title anim-enter">
          <p className="text-[11px] font-bold tracking-[0.2em] text-lime-400 uppercase">
            Bài {currentIndex + 1} trên {exercises.length}
          </p>
          <h1 className="text-3xl font-black tracking-tight leading-tight mt-2 text-balance line-clamp-2">
            {currentExercise.name}
          </h1>
        </div>

        {/* Stats row */}
        <div className="workout-stats anim-enter grid grid-cols-3 gap-2" style={{ '--d': '70ms' } as React.CSSProperties}>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Weight size={13} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Khóa tạ</span>
            </div>
            <p className="mt-1.5 text-xl font-black tabular-nums">
              {currentExercise.targetWeight}
              <span className="text-xs font-semibold text-zinc-500 ml-0.5">kg</span>
            </p>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Target size={13} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Khoảng rep</span>
            </div>
            <p className="mt-1.5 text-xl font-black tabular-nums">
              {currentExercise.minRep}
              <span className="text-zinc-600">–</span>
              {currentExercise.maxRep}
            </p>
          </div>
          <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-3">
            <div className="flex items-center gap-1.5 text-zinc-500">
              <Timer size={13} />
              <span className="text-[10px] font-bold uppercase tracking-wider">Nghỉ</span>
            </div>
            <p className="mt-1.5 text-xl font-black tabular-nums">
              {currentExercise.restSeconds}
              <span className="text-xs font-semibold text-zinc-500 ml-0.5">s</span>
            </p>
          </div>
        </div>

        {/* Current set hero card */}
        <section
          aria-label="Hiệp đang tập"
          className="workout-hero anim-enter relative rounded-3xl border border-zinc-800 overflow-hidden"
          style={{ '--d': '140ms' } as React.CSSProperties}
        >

          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
              <span className="relative flex w-2 h-2">
                <span className="relative inline-flex w-2 h-2 rounded-full bg-lime-400" />
              </span>
              Hiệp đang tập
            </span>
            <span className="text-xs font-semibold text-zinc-500 tabular-nums">
              {currentSet} / {totalSets}
            </span>
          </div>

          <div className="flex items-end justify-between mt-5">
            <div>
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Set</p>
              <p className="text-8xl font-black leading-none tracking-tighter tabular-nums">
                {String(currentSet).padStart(2, '0')}
              </p>
            </div>
            <div className="text-right pb-1">
              <p className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Mục tiêu</p>
              <p className="text-5xl font-black leading-none text-lime-400 tabular-nums">
                {currentTargetRep}
              </p>
              <p className="text-xs font-semibold text-zinc-400 mt-1">reps × {currentExercise.targetWeight}kg</p>
            </div>
          </div>

          {/* Set pills */}
          <ol className="mt-6 grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(totalSets, 5)}, minmax(0, 1fr))` }}>
            {currentExercise.targetReps.map((rep, idx) => {
              const setNumber = idx + 1;
              const isDone = setNumber < currentSet;
              const isActive = setNumber === currentSet;
              return (
                <li
                  key={idx}
                  aria-current={isActive ? 'step' : undefined}
                  className={`rounded-xl py-2.5 text-center border transition-colors ${
                    isDone
                      ? 'bg-lime-400/10 border-lime-400/30 text-lime-400'
                      : isActive
                        ? 'bg-white text-zinc-950 border-white'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-500'
                  }`}
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider opacity-70">S{setNumber}</div>
                  <div className="text-sm font-black tabular-nums flex items-center justify-center gap-0.5">
                    {isDone ? <Check size={14} strokeWidth={3} /> : rep}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Up next */}
        {upNext.length > 0 && (
          <section aria-label="Bài tiếp theo" className="workout-upnext anim-enter" style={{ '--d': '200ms' } as React.CSSProperties}>
            <h2 className="text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase mb-3">Tiếp theo</h2>
            <ul className="space-y-2">
              {upNext.map((ex) => (
                <li
                  key={ex.id}
                  className="flex items-center gap-3 rounded-2xl bg-zinc-900/50 border border-zinc-800/80 px-4 py-3"
                >
                  <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-[11px] font-bold text-zinc-400 tabular-nums shrink-0">
                    {ex.idx + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-200 truncate">{ex.name}</p>
                    <p className="text-[11px] text-zinc-500 tabular-nums">
                      {ex.targetReps.length} set • {ex.targetWeight}kg
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-zinc-700 shrink-0" />
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      {/* PRIMARY CTA - sticky bottom */}
      <div className="workout-action fixed bottom-0 left-1/2 -translate-x-1/2 w-full z-20">
        <button
          onClick={handleCompleteSet}
          className="group w-full bg-lime-400 hover:bg-lime-300 active:scale-[0.98] transition-all text-zinc-950 font-black text-base py-5 rounded-2xl shadow-[0_10px_40px_-10px_rgba(163,230,53,0.6)] flex items-center justify-center gap-3"
        >
          <span className="w-8 h-8 rounded-full bg-zinc-950 flex items-center justify-center">
            <Play fill="currentColor" size={14} className="text-lime-400 ml-0.5" />
          </span>
          HOÀN THÀNH SET {currentSet}
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>

      {progressMessage && !showMachineCheck && <div className="app-feedback app-toast is-success" role="status">
        <Check size={17} aria-hidden="true" /><span>{progressMessage}</span>
        <button type="button" className="shrink-0 ml-1" aria-label="Ẩn thông báo" onClick={() => setProgressMessage(null)}><X size={16} /></button>
      </div>}
      {/* 1. MODAL CHECK MÁY CÓ TRỐNG KHÔNG */}
      {showMachineCheck && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="machine-check-title"
          className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center z-50"
        >
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-8 shadow-2xl animate-in slide-in-from-bottom duration-300">


            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-lime-400/10 border border-lime-400/20 text-lime-400 rounded-2xl flex items-center justify-center shrink-0">
                <Dumbbell size={26} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
                  Bài {currentIndex + 1} / {exercises.length}
                </p>
                <h3 id="machine-check-title" className="text-xl font-black leading-tight mt-1 line-clamp-2">
                  {currentExercise.name}
                </h3>
              </div>
            </div>

            <div className="workout-machine-chips mt-5 flex gap-2 text-xs">
              <span className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold tabular-nums">
                {currentExercise.targetWeight}kg
              </span>
              <span className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold tabular-nums">
                {totalSets} set
              </span>
              <span className="px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-300 font-semibold tabular-nums">
                {currentExercise.targetReps.join(' · ')} reps
              </span>
            </div>

            <p className="text-zinc-400 text-sm mt-6 mb-5">
              Máy / vị trí tập này hiện có đang <span className="text-white font-bold">trống</span> không?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => setShowMachineCheck(false)}
                className="w-full bg-lime-400 hover:bg-lime-300 py-4 rounded-2xl font-black text-zinc-950 active:scale-[0.98] transition-all text-sm flex items-center justify-center gap-2"
              >
                <Check size={18} strokeWidth={3} />
                MÁY TRỐNG — TẬP LUÔN
              </button>
              <button
                onClick={handleMachineBusy}
                className="w-full bg-zinc-800/80 hover:bg-zinc-800 border border-zinc-700/60 py-4 rounded-2xl font-bold text-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-sm"
              >
                <AlertTriangle size={18} className="text-amber-400" />
                ĐANG BẬN — CHỌN BÀI KHÁC
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. MODAL CHỌN BÀI THAY THẾ */}
      {showAlternativeModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="alternative-title"
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center z-50"
        >
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 max-h-[88vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-300">


            <div>
              <h3 id="alternative-title" className="text-xl font-black">Chọn bài thay thế</h3>
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-400/10 border border-amber-400/20 px-3 py-2.5">
                <AlertTriangle size={14} className="text-amber-400 shrink-0" />
                <p className="text-xs text-amber-200/90 leading-relaxed">
                  <span className="font-bold text-amber-400">{currentExercise.name}</span> sẽ được dời xuống sau.
                </p>
              </div>
            </div>

            <div className="space-y-2 overflow-y-auto flex-1 mt-5 -mx-1 px-1">
              {remainingExercises.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => handleSelectAlternativeExercise(ex.id)}
                  className="w-full text-left bg-zinc-950/60 hover:bg-zinc-800/60 border border-zinc-800 hover:border-lime-400/40 p-4 rounded-2xl active:scale-[0.98] transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="min-w-0">
                    <h4 className="font-bold text-white text-sm truncate">{ex.name}</h4>
                    <div className="flex items-center gap-3 mt-1.5 text-[11px] text-zinc-500 tabular-nums">
                      <span className="flex items-center gap-1"><Weight size={11} />{ex.targetWeight}kg</span>
                      <span className="flex items-center gap-1"><Target size={11} />{ex.minRep}–{ex.maxRep}</span>
                      <span className="flex items-center gap-1"><Timer size={11} />{ex.restSeconds}s</span>
                    </div>
                  </div>
                  <span className="w-9 h-9 bg-zinc-800 group-hover:bg-lime-400 group-hover:text-zinc-950 rounded-xl flex items-center justify-center text-zinc-400 shrink-0 transition-colors">
                    <ArrowRight size={16} />
                  </span>
                </button>
              ))}
              {remainingExercises.length === 0 && (
                <div className="text-center py-10 rounded-2xl border border-dashed border-zinc-800">
                  <Dumbbell size={22} className="mx-auto text-zinc-700 mb-2" />
                  <p className="text-zinc-500 text-xs">Không còn bài nào khác trong buổi hôm nay!</p>
                </div>
              )}
            </div>

            <button
              onClick={() => { setShowAlternativeModal(false); setShowMachineCheck(true); }}
              className="w-full bg-transparent hover:bg-zinc-800 border border-zinc-800 py-3.5 rounded-2xl font-semibold text-zinc-400 hover:text-zinc-200 text-sm mt-4 flex items-center justify-center gap-2 transition-colors"
            >
              <RotateCcw size={15} />
              Quay lại bài cũ
            </button>
          </div>
        </div>
      )}

      {/* 5. NGHỈ GIỮA HIỆP */}
      {isResting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Nghỉ giữa hiệp"
          className="rest-dialog fixed inset-0 flex flex-col items-center z-40"
        >

          <div className="rest-header relative text-center">
            <p className="text-[11px] font-bold tracking-[0.25em] text-zinc-500 uppercase">Nghỉ giữa hiệp</p>
            <p className="text-sm font-semibold text-zinc-300 mt-1 line-clamp-1">{currentExercise.name}</p>
          </div>

          <div className="rest-clock relative flex items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 260 260" aria-hidden="true">
              <circle cx="130" cy="130" r={RING_RADIUS} fill="none" stroke="currentColor" strokeWidth="6" className="text-zinc-900" />
              <circle
                cx="130"
                cy="130"
                r={RING_RADIUS}
                fill="none"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
                className="text-lime-400 transition-[stroke-dashoffset] duration-1000 ease-linear"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - restRatio)}
              />
            </svg>
            <div className="text-center" role="timer" aria-label="Thời gian nghỉ còn lại">
              <div className="text-7xl font-black tabular-nums tracking-tighter">{formattedTimer}</div>
              <p className="text-xs text-zinc-500 mt-2 font-semibold tabular-nums">
                / {currentExercise.restSeconds}s
              </p>
            </div>
          </div>

          <div className="rest-footer relative space-y-4">
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">Chuẩn bị</p>
                <p className="text-base font-black mt-0.5">
                  {nextSetReps !== null ? `Set ${currentSet + 1} / ${totalSets}` : 'Tổng kết bài tập'}
                </p>
              </div>
              {nextSetReps !== null ? (
                <div className="text-right">
                  <p className="text-2xl font-black text-lime-400 tabular-nums leading-none">{nextSetReps}</p>
                  <p className="text-[11px] text-zinc-500 font-semibold mt-1 tabular-nums">reps × {currentExercise.targetWeight}kg</p>
                </div>
              ) : (
                <Check size={22} className="text-lime-400" />
              )}
            </div>

            <button
              onClick={() => { setIsResting(false); moveToNextSet(); }}
              className="w-full flex items-center justify-center gap-2 bg-white hover:bg-zinc-200 text-zinc-950 py-4 rounded-2xl font-black text-sm active:scale-[0.98] transition-all"
            >
              <FastForward size={18} fill="currentColor" /> BỎ QUA — TẬP TIẾP
            </button>
          </div>
        </div>
      )}

      {/* 6. POPUP CHỐT ĐƠN */}
      {showSummaryModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="summary-title"
          className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center z-50"
        >
          <div className="bg-zinc-900 border border-zinc-800 w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] p-6 pb-8 max-h-[92vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-300">


            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-lime-400 text-zinc-950 flex items-center justify-center mx-auto shadow-[0_0_40px_-5px_rgba(163,230,53,0.6)]">
                <Check size={28} strokeWidth={3} />
              </div>
              <h2 id="summary-title" className="text-xl font-black mt-4">Xác nhận hoàn thành</h2>
              <p className="text-sm text-zinc-400 mt-1 line-clamp-2">{currentExercise.name}</p>
            </div>

            {saveError && <p className="app-feedback" role="alert">{saveError}</p>}
            {!isEditingReps ? (
              <>
                <div className="mt-6 rounded-2xl bg-zinc-950/60 border border-zinc-800 p-4">
                  <div className="flex items-center justify-between text-xs text-zinc-500 font-semibold mb-3">
                    <span>{totalSets} set × {currentExercise.targetWeight}kg</span>
                    <span>Mục tiêu</span>
                  </div>
                  <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(totalSets, 5)}, minmax(0, 1fr))` }}>
                    {currentExercise.targetReps.map((rep, idx) => (
                      <div key={idx} className="rounded-xl bg-zinc-900 border border-zinc-800 py-2.5 text-center">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">S{idx + 1}</div>
                        <div className="text-lg font-black text-lime-400 tabular-nums">{rep}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-center text-sm text-zinc-300 mt-6 mb-4">
                  Bạn có hoàn thành <span className="font-bold text-white">đủ tất cả</span> số rep không?
                </p>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    disabled={saving}
                    onClick={() => setIsEditingReps(true)}
                    className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 py-4 rounded-2xl font-bold text-zinc-200 flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-all"
                  >
                    <X size={18} /> KHÔNG
                  </button>
                  <button
                    disabled={saving}
                    onClick={() => finalizeExercise(currentExercise.targetReps)}
                    className="bg-lime-400 hover:bg-lime-300 py-4 rounded-2xl font-black text-zinc-950 flex items-center justify-center gap-2 text-sm active:scale-[0.98] transition-all"
                  >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Check size={18} strokeWidth={3} />} {saving ? 'ĐANG LƯU...' : 'CÓ, ĐỦ'}
                  </button>
                </div>
              </>
            ) : (
              <div className="mt-6">
                <div className="flex items-center justify-between rounded-xl bg-amber-400/10 border border-amber-400/20 px-3 py-2.5 mb-4">
                  <span className="text-xs text-amber-200/90 font-semibold">Nhập số rep thực tế</span>
                  <span className="text-[11px] text-amber-400 font-bold tabular-nums">
                    {currentExercise.targetWeight}kg • Sàn {currentExercise.minRep} rep
                  </span>
                </div>

                <ul className="space-y-2">
                  {actualReps.map((rep, idx) => {
                    const target = currentExercise.targetReps[idx];
                    const belowFloor = rep < currentExercise.minRep;
                    const hitTarget = rep >= target;
                    return (
                      <li key={idx} className="flex items-center justify-between bg-zinc-950/60 border border-zinc-800 p-3 rounded-2xl">
                        <div>
                          <p className="text-sm font-bold">Set {idx + 1}</p>
                          <p className="text-[11px] text-zinc-500 tabular-nums">Mục tiêu {target} reps</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              const copy = [...actualReps];
                              copy[idx] = Math.max(1, copy[idx] - 1);
                              setActualReps(copy);
                            }}
                            aria-label={`Giảm rep set ${idx + 1}`}
                            className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                          >
                            <Minus size={16} />
                          </button>
                          <span
                            className={`w-12 text-center font-black text-2xl tabular-nums ${
                              belowFloor ? 'text-amber-400' : hitTarget ? 'text-lime-400' : 'text-white'
                            }`}
                          >
                            {rep}
                          </span>
                          <button
                            onClick={() => {
                              const copy = [...actualReps];
                              copy[idx] = copy[idx] + 1;
                              setActualReps(copy);
                            }}
                            aria-label={`Tăng rep set ${idx + 1}`}
                            className="w-10 h-10 bg-zinc-800 hover:bg-zinc-700 rounded-xl flex items-center justify-center active:scale-90 transition-all"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <button
                  disabled={saving}
                  onClick={() => finalizeExercise(actualReps)}
                  className="w-full bg-lime-400 hover:bg-lime-300 py-4 rounded-2xl font-black mt-5 text-zinc-950 text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  <Check size={18} strokeWidth={3} />
                  {saving ? 'ĐANG LƯU...' : 'LƯU KẾT QUẢ THỰC TẾ'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
