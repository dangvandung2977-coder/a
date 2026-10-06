import type { Metadata } from 'next';
import MotionVideo from '@/components/motion/MotionVideo';

export const metadata: Metadata = {
  title: 'The Progression Film — GYM PROGRESSION',
  description: 'Every workout should move you forward. Experience the 60-second GYM PROGRESSION film. Train smarter. Progress every day.',
};

export default function FilmPage() {
  return <MotionVideo />;
}
