// components/DashboardView.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import {
  Plus,
  Dumbbell,
  Play,
  Search,
  X,
  Pencil,
  Trash2,
  LogOut,
  Flame,
  CalendarDays,
  Layers,
  Minus,
  Check,
  Loader2,
  Zap,
} from 'lucide-react';
import WorkoutHeatmap, { DayActivity } from '@/components/WorkoutHeatmap';

interface SelectedExerciseItem {
  exerciseId: string;
  name: string;
  default_sets: number;
  default_min_rep: number;
  default_max_rep: number;
  weight: number;
  target_reps: number[];
}

export default function DashboardView({ onStartWorkout }: { onStartWorkout: (routineId: string, routineName: string) => void }) {
  const [routines, setRoutines] = useState<any[]>([]);
  const [libraryExercises, setLibraryExercises] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<DayActivity[]>([]);

  // State Modal (Tạo & Sửa)
  const [showModal, setShowModal] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExercises, setSelectedExercises] = useState<SelectedExerciseItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadRoutinesAndLogs();
    loadLibrary();
  }, []);

  // TẢI LỊCH TẬP & NHẬT KÝ ĐỂ THẮP SÁNG HEATMAP
  const loadRoutinesAndLogs = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Tải danh sách lịch tập
    const { data } = await supabase
      .from('workout_routines')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setRoutines(data);

    // 2. Tải nhật ký các ngày đã tập từ Database
    const { data: logs } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', user.id);

    if (logs && logs.length > 0) {
      setActivityLogs(
        logs.map((l) => ({
          date: l.workout_date,
          level: l.level as 0 | 1 | 2,
          summary: l.summary,
          routineName: l.routine_name,
        }))
      );
    }
  };

  const loadLibrary = async () => {
    const { data } = await supabase.from('exercises_library').select('*');
    if (data) setLibraryExercises(data);
  };

  const handleOpenCreateModal = () => {
    setEditingRoutineId(null);
    setRoutineName('');
    setSelectedExercises([]);
    setSearchQuery('');
    setShowModal(true);
  };

  const handleOpenEditModal = async (routine: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    setEditingRoutineId(routine.id);
    setRoutineName(routine.name);
    setSearchQuery('');

    const { data: routineExList } = await supabase
      .from('routine_exercises')
      .select('exercise_id, order_index')
      .eq('routine_id', routine.id)
      .order('order_index', { ascending: true });

    if (routineExList && routineExList.length > 0) {
      const exerciseIds = routineExList.map((item) => item.exercise_id);

      const { data: exData } = await supabase.from('exercises_library').select('*').in('id', exerciseIds);
      const { data: stateData } = await supabase.from('user_exercise_state').select('*').eq('user_id', user.id).in('exercise_id', exerciseIds);

      const mapped: SelectedExerciseItem[] = routineExList.map((item) => {
        const ex = exData?.find((e) => e.id === item.exercise_id);
        const state = stateData?.find((s) => s.exercise_id === item.exercise_id);

        const setsCount = state?.target_reps?.length || ex?.default_sets || 3;
        const minRep = ex?.default_min_rep || 8;
        const currentTargetReps =
          state?.target_reps && state.target_reps.length > 0
            ? state.target_reps
            : Array(setsCount).fill(minRep);

        return {
          exerciseId: item.exercise_id,
          name: ex?.name || 'Bài tập',
          default_sets: setsCount,
          default_min_rep: minRep,
          default_max_rep: ex?.default_max_rep || 12,
          weight: state?.current_weight || 20,
          target_reps: currentTargetReps,
        };
      });

      setSelectedExercises(mapped);
    } else {
      setSelectedExercises([]);
    }

    setShowModal(true);
  };

  const handleDeleteRoutine = async (routineId: string, routineName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa lịch "${routineName}" không?`)) return;

    await supabase.from('routine_exercises').delete().eq('routine_id', routineId);
    const { error } = await supabase.from('workout_routines').delete().eq('id', routineId);

    if (error) alert(`Lỗi: ${error.message}`);
    else loadRoutinesAndLogs();
  };

  const handleAddExercise = (ex: any) => {
    if (selectedExercises.find((item) => item.exerciseId === ex.id)) return;

    const sets = ex.default_sets || 3;
    const minRep = ex.default_min_rep || 8;

    setSelectedExercises([
      ...selectedExercises,
      {
        exerciseId: ex.id,
        name: ex.name,
        default_sets: sets,
        default_min_rep: minRep,
        default_max_rep: ex.default_max_rep || 12,
        weight: 20,
        target_reps: Array(sets).fill(minRep),
      },
    ]);
    setSearchQuery('');
  };

  const handleRemoveExercise = (idx: number) => {
    const copy = [...selectedExercises];
    copy.splice(idx, 1);
    setSelectedExercises(copy);
  };

  const handleUpdateSetsCount = (exerciseIdx: number, newCount: number) => {
    if (newCount < 1 || newCount > 10) return;
    const copy = [...selectedExercises];
    const item = copy[exerciseIdx];
    const currentReps = [...item.target_reps];

    if (newCount > currentReps.length) {
      const lastVal = currentReps[currentReps.length - 1] || item.default_min_rep;
      item.target_reps = [...currentReps, lastVal];
    } else {
      item.target_reps = currentReps.slice(0, newCount);
    }
    item.default_sets = newCount;
    setSelectedExercises(copy);
  };

  const handleUpdateRepOfSet = (exerciseIdx: number, setIdx: number, newRep: number) => {
    const copy = [...selectedExercises];
    copy[exerciseIdx].target_reps[setIdx] = Math.max(1, newRep);
    setSelectedExercises(copy);
  };

  const handleSaveRoutine = async () => {
    if (!routineName.trim() || selectedExercises.length === 0) {
      alert('Vui lòng nhập tên lịch và thêm ít nhất 1 bài tập!');
      return;
    }

    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return alert('Chưa đăng nhập!');
    }

    let routineId = editingRoutineId;

    if (editingRoutineId) {
      await supabase.from('workout_routines').update({ name: routineName }).eq('id', editingRoutineId);
      await supabase.from('routine_exercises').delete().eq('routine_id', editingRoutineId);
    } else {
      const { data: newR, error: rError } = await supabase
        .from('workout_routines')
        .insert({ user_id: user.id, name: routineName })
        .select()
        .single();

      if (rError || !newR) {
        setSaving(false);
        return alert(`Lỗi: ${rError?.message}`);
      }
      routineId = newR.id;
    }

    for (let i = 0; i < selectedExercises.length; i++) {
      const item = selectedExercises[i];
      await supabase.from('routine_exercises').insert({
        routine_id: routineId,
        exercise_id: item.exerciseId,
        order_index: i + 1,
      });

      await supabase.from('user_exercise_state').upsert(
        {
          user_id: user.id,
          exercise_id: item.exerciseId,
          current_weight: item.weight,
          target_reps: item.target_reps,
          plateau_count: 0,
          is_calibrating: false,
        },
        { onConflict: 'user_id, exercise_id' }
      );
    }

    setSaving(false);
    setShowModal(false);
    loadRoutinesAndLogs();
  };

  // ===== Giá trị hiển thị (chỉ dùng cho UI, không ảnh hưởng logic) =====
  const todayLabel = new Date().toLocaleDateString('vi-VN', {
    weekday: 'long',
    day: '2-digit',
    month: '2-digit',
  });
  const now = new Date();
  const sessionsThisMonth = activityLogs.filter((l) => {
    const d = new Date(l.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear() && l.level > 0;
  }).length;
  const totalSessions = activityLogs.filter((l) => l.level > 0).length;
  const filteredLibrary = libraryExercises.filter((ex) =>
    ex.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <main className="relative min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[32rem] h-[32rem] rounded-full bg-lime-400/10 blur-3xl"
      />

      <div className="relative max-w-md mx-auto px-5 pt-6 pb-36">
        {/* HEADER */}
        <header className="flex items-start justify-between mb-7">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime-400 mb-1.5 capitalize">
              {todayLabel}
            </p>
            <h1 className="text-[28px] leading-[1.05] font-black tracking-tight text-balance">
              Hôm nay bạn
              <br />
              tập gì<span className="text-lime-400">?</span>
            </h1>
          </div>
          <button
            onClick={() => supabase.auth.signOut().then(() => window.location.reload())}
            className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700 flex items-center justify-center active:scale-95 transition-all"
            aria-label="Đăng xuất"
            title="Đăng xuất"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </header>

        {/* STATS */}
        <section aria-label="Thống kê" className="grid grid-cols-3 gap-2.5 mb-5">
          <StatTile icon={<Flame className="w-4 h-4" />} value={sessionsThisMonth} label="Buổi tháng này" highlight />
          <StatTile icon={<CalendarDays className="w-4 h-4" />} value={totalSessions} label="Tổng buổi" />
          <StatTile icon={<Layers className="w-4 h-4" />} value={routines.length} label="Lịch tập" />
        </section>

        {/* HEATMAP */}
        <section aria-labelledby="heatmap-title" className="bg-zinc-900/70 border border-zinc-800 rounded-3xl p-4 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 id="heatmap-title" className="text-xs font-bold uppercase tracking-[0.15em] text-zinc-400">
              Độ chăm chỉ
            </h2>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-lime-400">
              <Zap className="w-3 h-3" aria-hidden="true" /> Consistency
            </span>
          </div>
          <WorkoutHeatmap activityData={activityLogs} />
        </section>

        {/* DANH SÁCH LỊCH TẬP */}
        <section aria-labelledby="routines-title">
          <div className="flex items-end justify-between mb-3">
            <h2 id="routines-title" className="text-lg font-black tracking-tight">
              Giáo án của bạn
            </h2>
            <span className="text-xs font-semibold text-zinc-500 tabular-nums">
              {routines.length} lịch
            </span>
          </div>

          <ul className="flex flex-col gap-3">
            {routines.map((routine, i) => (
              <li
                key={routine.id}
                className="group relative bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-3xl p-4 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 shrink-0 rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 leading-none">Day</span>
                    <span className="text-lg font-black tabular-nums leading-none mt-0.5">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-[15px] text-white truncate">{routine.name}</h3>
                    <span className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-semibold text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-400" aria-hidden="true" />
                      Sẵn sàng giáo án
                    </span>
                  </div>

                  <button
                    onClick={() => onStartWorkout(routine.id, routine.name)}
                    className="w-12 h-12 shrink-0 rounded-2xl bg-lime-400 hover:bg-lime-300 text-zinc-950 flex items-center justify-center shadow-[0_8px_30px_-8px_rgba(163,230,53,0.7)] active:scale-95 transition-all"
                    aria-label={`Bắt đầu tập ${routine.name}`}
                  >
                    <Play className="w-5 h-5 ml-0.5" fill="currentColor" aria-hidden="true" />
                  </button>
                </div>

                <div className="flex items-center gap-2 mt-3.5 pt-3.5 border-t border-zinc-800/80">
                  <button
                    onClick={() => handleOpenEditModal(routine)}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs font-semibold text-zinc-300 hover:text-white hover:border-zinc-700 active:scale-[0.98] transition-all"
                  >
                    <Pencil className="w-3.5 h-3.5" aria-hidden="true" /> Sửa lịch & Reps
                  </button>
                  <button
                    onClick={() => handleDeleteRoutine(routine.id, routine.name)}
                    className="w-10 h-[34px] inline-flex items-center justify-center rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-500 hover:text-rose-400 hover:border-rose-500/40 active:scale-95 transition-all"
                    aria-label={`Xóa lịch ${routine.name}`}
                    title="Xóa lịch"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>

          {routines.length === 0 && (
            <div className="flex flex-col items-center text-center py-12 px-6 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-3xl">
              <div className="w-14 h-14 rounded-2xl bg-lime-400/10 border border-lime-400/20 text-lime-400 flex items-center justify-center mb-4">
                <Dumbbell className="w-6 h-6" aria-hidden="true" />
              </div>
              <p className="font-bold text-white mb-1">Chưa có lịch tập nào</p>
              <p className="text-sm text-zinc-500 text-pretty">
                Bấm nút bên dưới để tạo giáo án đầu tiên của bạn.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* NÚT TẠO LỊCH MỚI */}
      <div className="fixed bottom-0 inset-x-0 z-30 pointer-events-none">
        <div className="max-w-md mx-auto px-5 pb-6 pt-10 bg-gradient-to-t from-zinc-950 via-zinc-950/95 to-transparent">
          <button
            onClick={handleOpenCreateModal}
            className="pointer-events-auto w-full bg-lime-400 hover:bg-lime-300 text-zinc-950 py-4 rounded-2xl font-black tracking-wide flex items-center justify-center gap-2 shadow-[0_10px_40px_-10px_rgba(163,230,53,0.6)] active:scale-[0.98] transition-all"
          >
            <Plus className="w-5 h-5" strokeWidth={3} aria-hidden="true" /> TẠO LỊCH TẬP MỚI
          </button>
        </div>
      </div>

      {/* MODAL TẠO & SỬA LỊCH */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="routine-modal-title"
        >
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-t-[2rem] sm:rounded-[2rem] max-h-[92vh] flex flex-col shadow-2xl">
            {/* Modal header */}
            <div className="px-5 pt-3 pb-4 border-b border-zinc-900">
              <div className="w-10 h-1 rounded-full bg-zinc-800 mx-auto mb-4 sm:hidden" aria-hidden="true" />
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-lime-400 mb-1">
                    {editingRoutineId ? 'Chỉnh sửa' : 'Giáo án mới'}
                  </p>
                  <h3 id="routine-modal-title" className="text-xl font-black tracking-tight">
                    {editingRoutineId ? 'Lịch tập & Mục tiêu' : 'Tạo lịch tập'}
                  </h3>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="w-10 h-10 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center active:scale-95 transition-all"
                  aria-label="Đóng"
                >
                  <X className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <label htmlFor="routine-name" className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                Tên lịch
              </label>
              <input
                id="routine-name"
                type="text"
                placeholder="vd: Ngực - Vai - Tay sau, Chân..."
                value={routineName}
                onChange={(e) => setRoutineName(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl px-4 py-3.5 mb-5 text-white font-semibold placeholder:text-zinc-600 placeholder:font-normal focus:outline-none focus:border-lime-400/60 focus:ring-4 focus:ring-lime-400/10 transition-all"
              />

              <label htmlFor="exercise-search" className="block text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500 mb-2">
                Thêm bài tập
              </label>
              <div className="relative mb-6">
                <div className="group relative">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-lime-400 transition-colors"
                    aria-hidden="true"
                  />
                  <input
                    id="exercise-search"
                    type="text"
                    placeholder="Tìm bài (vd: Bench, Squat...)"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-lime-400/60 focus:ring-4 focus:ring-lime-400/10 transition-all"
                  />
                </div>

                {searchQuery && (
                  <div className="absolute top-full mt-2 left-0 right-0 bg-zinc-900 border border-zinc-800 rounded-2xl max-h-60 overflow-y-auto z-10 shadow-2xl shadow-black/60 p-1.5">
                    {filteredLibrary.map((ex) => {
                      const added = !!selectedExercises.find((item) => item.exerciseId === ex.id);
                      return (
                        <button
                          type="button"
                          key={ex.id}
                          onClick={() => handleAddExercise(ex)}
                          disabled={added}
                          className="w-full text-left flex items-center gap-3 p-3 rounded-xl hover:bg-zinc-800 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                        >
                          <span className="w-9 h-9 shrink-0 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 flex items-center justify-center">
                            <Dumbbell className="w-4 h-4" aria-hidden="true" />
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-semibold text-sm text-white truncate">{ex.name}</span>
                            <span className="block text-xs text-zinc-500 tabular-nums">
                              {ex.default_sets} sets × {ex.default_min_rep}–{ex.default_max_rep} reps
                            </span>
                          </span>
                          {added ? (
                            <Check className="w-4 h-4 text-lime-400" aria-label="Đã thêm" />
                          ) : (
                            <Plus className="w-4 h-4 text-zinc-500" aria-hidden="true" />
                          )}
                        </button>
                      );
                    })}
                    {filteredLibrary.length === 0 && (
                      <p className="p-4 text-center text-xs text-zinc-500">Không tìm thấy bài tập phù hợp.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-3">
                <h4 className="text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
                  Các bài trong lịch
                </h4>
                <span className="text-[11px] font-bold text-zinc-950 bg-lime-400 rounded-full px-2 py-0.5 tabular-nums">
                  {selectedExercises.length}
                </span>
              </div>

              <ol className="flex flex-col gap-3">
                {selectedExercises.map((item, idx) => (
                  <li key={idx} className="bg-zinc-900 border border-zinc-800 rounded-3xl p-4">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="w-7 h-7 shrink-0 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-black tabular-nums flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="flex-1 min-w-0 font-bold text-sm text-white leading-snug pt-1 line-clamp-2">
                        {item.name}
                      </span>
                      <button
                        onClick={() => handleRemoveExercise(idx)}
                        className="w-8 h-8 shrink-0 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 flex items-center justify-center transition-colors"
                        aria-label={`Xóa bài ${item.name}`}
                        title="Xóa bài này"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 mb-3">
                      {/* Weight */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2.5 focus-within:border-lime-400/60 transition-colors">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
                          Mức tạ
                        </span>
                        <div className="flex items-baseline gap-1">
                          <input
                            type="number"
                            inputMode="decimal"
                            aria-label={`Mức tạ ${item.name}`}
                            value={item.weight}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              const copy = [...selectedExercises];
                              copy[idx].weight = val;
                              setSelectedExercises(copy);
                            }}
                            className="w-full min-w-0 bg-transparent text-xl font-black text-lime-400 tabular-nums focus:outline-none"
                          />
                          <span className="text-xs font-bold text-zinc-500">kg</span>
                        </div>
                      </div>

                      {/* Sets stepper */}
                      <div className="bg-zinc-950 border border-zinc-800 rounded-2xl px-3 py-2.5">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-0.5">
                          Số set
                        </span>
                        <div className="flex items-center justify-between">
                          <button
                            onClick={() => handleUpdateSetsCount(idx, item.default_sets - 1)}
                            disabled={item.default_sets <= 1}
                            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 flex items-center justify-center active:scale-90 transition-all"
                            aria-label="Giảm số set"
                          >
                            <Minus className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                          <span className="text-xl font-black tabular-nums">{item.default_sets}</span>
                          <button
                            onClick={() => handleUpdateSetsCount(idx, item.default_sets + 1)}
                            disabled={item.default_sets >= 10}
                            className="w-7 h-7 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white disabled:opacity-30 flex items-center justify-center active:scale-90 transition-all"
                            aria-label="Tăng số set"
                          >
                            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Target reps per set */}
                    <div>
                      <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-2">
                        Rep mục tiêu từng set
                      </span>
                      <div className="grid grid-cols-5 gap-1.5">
                        {item.target_reps.map((rep, setIdx) => (
                          <label
                            key={setIdx}
                            className="flex flex-col items-center bg-zinc-950 border border-zinc-800 rounded-xl py-1.5 focus-within:border-lime-400/60 transition-colors"
                          >
                            <span className="text-[9px] font-bold text-zinc-500 uppercase">S{setIdx + 1}</span>
                            <input
                              type="number"
                              inputMode="numeric"
                              value={rep}
                              onChange={(e) => {
                                const val = parseInt(e.target.value) || 1;
                                handleUpdateRepOfSet(idx, setIdx, val);
                              }}
                              className="w-full bg-transparent text-center text-base font-black text-white tabular-nums focus:outline-none"
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>

              {selectedExercises.length === 0 && (
                <div className="flex flex-col items-center text-center py-8 border border-dashed border-zinc-800 rounded-3xl">
                  <Search className="w-5 h-5 text-zinc-600 mb-2" aria-hidden="true" />
                  <p className="text-xs text-zinc-500 px-6">
                    Chưa có bài tập nào. Hãy tìm bài ở trên để thêm vào!
                  </p>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 pt-3 pb-5 border-t border-zinc-900">
              <button
                onClick={handleSaveRoutine}
                disabled={saving}
                className="w-full bg-lime-400 hover:bg-lime-300 disabled:opacity-60 disabled:cursor-not-allowed text-zinc-950 py-4 rounded-2xl font-black tracking-wide flex items-center justify-center gap-2 shadow-[0_10px_40px_-10px_rgba(163,230,53,0.6)] active:scale-[0.98] transition-all"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> Đang lưu...
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" strokeWidth={3} aria-hidden="true" />
                    {editingRoutineId ? 'CẬP NHẬT LỊCH TẬP' : 'LƯU LỊCH TẬP NÀY'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function StatTile({
  icon,
  value,
  label,
  highlight = false,
}: {
  icon: React.ReactNode;
  value: number;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3 border ${
        highlight ? 'bg-lime-400 border-lime-400 text-zinc-950' : 'bg-zinc-900 border-zinc-800 text-white'
      }`}
    >
      <span className={highlight ? 'text-zinc-950/70' : 'text-lime-400'} aria-hidden="true">
        {icon}
      </span>
      <p className="text-2xl font-black tabular-nums leading-none mt-2">{value}</p>
      <p className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${highlight ? 'text-zinc-950/70' : 'text-zinc-500'}`}>
        {label}
      </p>
    </div>
  );
}
