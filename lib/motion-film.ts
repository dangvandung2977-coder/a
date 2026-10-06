export const FILM_DURATION = 60;
export const FILM_BPM = 120;

// Absolute times are shared by the picture, narration, captions, and transport.
export const FILM_SCENES = [
  {
    id: 'hook', name: 'The mindset', start: 0, end: 5,
    description: 'Every workout should move you forward.',
    voiceover: { start: 0.15, src: '/audio/voiceover-01.mp3', text: "You train hard, but you're not getting stronger. The problem? No structured progression." },
    captions: [{ start: 0.15, end: 4.2, text: "You train hard, but you're not getting stronger. The problem? No structured progression." }],
  },
  {
    id: 'solution', name: 'Meet your edge', start: 5, end: 15,
    description: 'Automatic weight progression, smart rest timers, and workout history.',
    voiceover: { start: 6, src: '/audio/voiceover-02.mp3', text: 'Gym Progression calculates your next weight automatically.' },
    captions: [{ start: 6, end: 8.9, text: 'Gym Progression calculates your next weight automatically.' }],
  },
  {
    id: 'builder', name: 'Build your plan', start: 15, end: 30,
    description: 'Create a chest, shoulders, and triceps workout with four sets of eight reps.',
    voiceover: { start: 16, src: '/audio/voiceover-03.mp3', text: 'Build your workout, choose exercises, sets, reps, and starting weight in seconds.' },
    captions: [{ start: 16, end: 20.95, text: 'Build your workout, choose exercises, sets, reps, and starting weight in seconds.' }],
  },
  {
    id: 'active', name: 'Put in the work', start: 30, end: 42,
    description: 'Complete your set, recover with a smart rest timer, and build consistency.',
    voiceover: { start: 30.8, src: '/audio/voiceover-04.mp3', text: 'Stay on schedule with smart rest timers and track every workout automatically.' },
    captions: [{ start: 30.8, end: 34.95, text: 'Stay on schedule with smart rest timers and track every workout automatically.' }],
  },
  {
    id: 'progress', name: 'See the progress', start: 42, end: 52,
    description: 'Bench press progression: 20, 22.5, then 25 kilograms. A 25 percent increase.',
    voiceover: { start: 44.6, src: '/audio/voiceover-05.mp3', text: 'Hit your reps? Increase the weight. Struggle? Keep it the same. No more guessing.' },
    captions: [{ start: 44.6, end: 49.15, text: 'Hit your reps? Increase the weight. Struggle? Keep it the same. No more guessing.' }],
  },
  {
    id: 'cta', name: 'Your next move', start: 52, end: 60,
    description: 'Gym Progression. Train smarter. Progress every day. Start for free.',
    voiceover: { start: 53.1, src: '/audio/voiceover-06.mp3', text: 'Start your first workout with Gym Progression today.' },
    captions: [{ start: 53.1, end: 55.7, text: 'Start your first workout with Gym Progression today.' }],
  },
] as const;

export const CAPTIONS = FILM_SCENES.flatMap((scene) => [...scene.captions]);
const WORKOUT_NAME = 'CHEST — SHOULDERS — TRICEPS';

export function clampTime(value: number) {
  return Number.isFinite(value) ? Math.max(0, Math.min(FILM_DURATION, value)) : 0;
}

export function formatTime(value: number) {
  const seconds = Math.floor(Math.max(0, value));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function sceneAt(value: number) {
  const time = clampTime(value);
  return FILM_SCENES.findIndex((scene) => time < scene.end || scene.end === FILM_DURATION);
}

export function captionAt(value: number) {
  return CAPTIONS.find((caption) => value >= caption.start && value < caption.end)?.text ?? '';
}

function progress(time: number, start: number, duration: number) {
  return Math.max(0, Math.min(1, (time - start) / duration));
}

function easeOut(value: number) {
  return 1 - (1 - value) ** 3;
}

export function restSecondsAt(time: number) {
  if (time < 33) return 90;
  if (time < 35.5) return 90 - Math.floor(time - 33);
  if (time < 37.5) return Math.ceil(88 - progress(time, 35.5, 2) * 85);
  return Math.ceil(3 * (1 - progress(time, 37.5, 1)));
}

export function frameAt(value: number) {
  const time = clampTime(value);
  const weight = 20 + 2.5 * easeOut(progress(time, 43.5, 1.25)) + 2.5 * easeOut(progress(time, 45.5, 1.25));
  const searchCue = time < 22.3 ? { name: 'Bench Press', start: 18.8, end: 20.3 }
    : time < 23.1 ? { name: 'Shoulder Press', start: 22.3, end: 23 }
    : time < 23.8 ? { name: 'Incline Press', start: 23.1, end: 23.7 }
    : { name: 'Triceps Extension', start: 23.8, end: 24.5 };
  return {
    time,
    scene: sceneAt(time),
    caption: captionAt(time),
    restSeconds: restSecondsAt(time),
    weight: Math.round(weight * 10) / 10,
    strength: Math.round((weight / 20 - 1) * 100),
    workoutName: WORKOUT_NAME.slice(0, Math.floor(progress(time, 17.15, 1.4) * WORKOUT_NAME.length)),
    search: time < searchCue.end ? searchCue.name.slice(0, Math.floor(progress(time, searchCue.start, 0.4) * searchCue.name.length)) : '',
    selectedExercise: searchCue.name,
    sets: time >= 21.4 ? 4 : 3,
    startingWeight: time >= 22 ? 20 : 15,
  };
}

export const HEATMAP_LEVELS = Array.from({ length: 140 }, (_, index) => {
  const week = Math.floor(index / 7);
  const day = index % 7;
  return day === 2 || day === 6 || (week + day) % 5 === 0 ? 0 : 1 + (week * 3 + day) % 3;
});
