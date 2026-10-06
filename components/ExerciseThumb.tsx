// components/ExerciseThumb.tsx
'use client';

import { useState } from 'react';
import { Dumbbell } from 'lucide-react';
import { getExerciseImageUrl } from '@/lib/exerciseImages';

export default function ExerciseThumb({ name, size = 56 }: { name: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const url = getExerciseImageUrl(name);
  const box = { width: size, height: size } as const;
  if (!url || failed) {
    return (
      <span
        style={box}
        className="shrink-0 rounded-xl bg-zinc-950 border border-zinc-800 text-zinc-400 flex items-center justify-center"
        aria-hidden="true"
      >
        <Dumbbell className="w-4 h-4" />
      </span>
    );
  }
  return (
    <img
      src={url}
      alt=""
      aria-hidden="true"
      loading="lazy"
      width={size}
      height={size}
      style={box}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-xl border border-zinc-700 object-cover bg-zinc-950 brightness-[1.18] contrast-[1.06]"
    />
  );
}
