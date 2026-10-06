// lib/exerciseImages.ts
// Public-domain exercise photos (yuhonas/free-exercise-db, Unlicense).
// Matched by normalized keywords so it works without touching the DB.
// ponytail: keyword fallback on purpose — exact names live in Supabase,
// a wrong photo is worse than the icon, so unknown names return null.
const BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises';

// Ordered specific -> generic. First match wins.
const RULES: Array<[string[], string]> = [
  [['incline dumbbell press'], 'Incline_Dumbbell_Press/0.jpg'],
  [['incline barbell', 'incline bench press', 'incline bench'], 'Barbell_Incline_Bench_Press_-_Medium_Grip/0.jpg'],
  [['decline'], 'Decline_Barbell_Bench_Press/0.jpg'],
  [['dumbbell bench', 'dumbbell press'], 'Dumbbell_Bench_Press/0.jpg'],
  [['close grip bench', 'close-grip bench'], 'Close-Grip_Barbell_Bench_Press/0.jpg'],
  [['bench press', 'bench'], 'Barbell_Bench_Press_-_Medium_Grip/0.jpg'],
  [['pec deck', 'pecdec', 'butterfly', 'pec fly'], 'Butterfly/0.jpg'],
  [['cable cross', 'crossover', 'cable fly'], 'Cable_Crossover/0.jpg'],
  [['rear delt fly', 'reverse fly', 'rear delt raise'], 'Cable_Rear_Delt_Fly/0.jpg'],
  [['incline fly', 'incline dumbbell fly'], 'Incline_Dumbbell_Flyes/0.jpg'],
  [['fly', 'flyes', 'pec'], 'Dumbbell_Flyes/0.jpg'],
  [['push-up', 'pushup', 'push up'], 'Pushups/0.jpg'],
  [['arnold'], 'Arnold_Dumbbell_Press/0.jpg'],
  [['barbell shoulder', 'barbell overhead', 'military press'], 'Barbell_Shoulder_Press/0.jpg'],
  [['shoulder press', 'overhead press', 'ohp'], 'Dumbbell_Shoulder_Press/0.jpg'],
  [['lateral raise', 'side raise', 'side lateral', 'side delt'], 'Side_Lateral_Raise/0.jpg'],
  [['front raise', 'front delt'], 'Front_Dumbbell_Raise/0.jpg'],
  [['upright row'], 'Upright_Barbell_Row/0.jpg'],
  [['shrug'], 'Barbell_Shrug/0.jpg'],
  [['chin-up', 'chinup', 'chin up'], 'Chin-Up/0.jpg'],
  [['pull-up', 'pullup', 'pull up'], 'Pullups/0.jpg'],
  [['straight arm pulldown', 'straight-arm'], 'Straight-Arm_Pulldown/0.jpg'],
  [['pulldown', 'lat pull', 'lat pulldown'], 'Wide-Grip_Lat_Pulldown/0.jpg'],
  [['t-bar', 'tbar', 't bar row'], 'T-Bar_Row_with_Handle/0.jpg'],
  [['barbell row', 'bent over row', 'bent-over row'], 'Bent_Over_Barbell_Row/0.jpg'],
  [['dumbbell row', 'one arm row', 'one-arm row', 'single arm row'], 'One-Arm_Dumbbell_Row/0.jpg'],
  [['seated row', 'seated cable', 'cable row'], 'Seated_Cable_Rows/0.jpg'],
  [['romanian deadlift', 'rdl'], 'Romanian_Deadlift/0.jpg'],
  [['deadlift'], 'Barbell_Deadlift/0.jpg'],
  [['back extension', 'hyperextension', 'hyper extension'], 'Hyperextensions_Back_Extensions/0.jpg'],
  [['hack squat'], 'Barbell_Hack_Squat/0.jpg'],
  [['box squat'], 'Box_Squat/0.jpg'],
  [['squat'], 'Barbell_Squat/0.jpg'],
  [['leg press'], 'Leg_Press/0.jpg'],
  [['lunge'], 'Barbell_Lunge/0.jpg'],
  [['leg extension'], 'Leg_Extensions/0.jpg'],
  [['seated leg curl'], 'Seated_Leg_Curl/0.jpg'],
  [['leg curl'], 'Lying_Leg_Curls/0.jpg'],
  [['calf press'], 'Calf_Press/0.jpg'],
  [['calf raise', 'calf'], 'Standing_Calf_Raises/0.jpg'],
  [['preacher'], 'Preacher_Curl/0.jpg'],
  [['concentration'], 'Concentration_Curls/0.jpg'],
  [['incline curl', 'incline dumbbell curl'], 'Incline_Dumbbell_Curl/0.jpg'],
  [['hammer'], 'Hammer_Curls/0.jpg'],
  [['barbell curl', 'bicep curl', 'biceps curl', 'dumbbell curl', 'curl'], 'Barbell_Curl/0.jpg'],
  [['skull', 'skullcrusher', 'skull crusher'], 'Decline_Close-Grip_Bench_To_Skull_Crusher/0.jpg'],
  [['overhead triceps', 'triceps extension', 'overhead extension'], 'Cable_Rope_Overhead_Triceps_Extension/0.jpg'],
  [['lying triceps'], 'Lying_Triceps_Press/0.jpg'],
  [['pushdown', 'pressdown'], 'Triceps_Pushdown/0.jpg'],
  [['bench dip', 'dip'], 'Bench_Dips/0.jpg'],
  [['plank'], 'Plank/0.jpg'],
  [['ab crunch machine', 'ab machine'], 'Ab_Crunch_Machine/0.jpg'],
  [['crunch'], 'Crunches/0.jpg'],
  [['hanging leg raise', 'leg raise', 'knee raise'], 'Hanging_Leg_Raise/0.jpg'],
  [['russian twist'], 'Russian_Twist/0.jpg'],
  [['ab roller', 'ab wheel'], 'Ab_Roller/0.jpg'],
];

function normalize(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getExerciseImageUrl(name: string): string | null {
  const n = ` ${normalize(name)} `;
  for (const [keywords, path] of RULES) {
    if (keywords.some((k) => n.includes(k))) return `${BASE}/${path}`;
  }
  return null;
}
