import { memo, type ReactNode } from 'react';
import Link from 'next/link';
import {
  Activity, ArrowDown, ArrowRight, ArrowUpRight, CalendarDays, Check,
  ChevronRight, Dumbbell, Flame, Layers, LockKeyhole, Mail, Minus,
  MoreHorizontal, Plus, Search, ShieldCheck, Timer, TrendingUp, X, Zap,
} from 'lucide-react';
import AppBrand from '@/components/AppBrand';
import { HEATMAP_LEVELS } from '@/lib/motion-film';

function Browser({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`demo-browser ${className}`}>
    <div className="browser-bar">
      <span className="browser-dots"><i /><i /><i /></span>
      <span className="browser-address"><LockKeyhole size={13} /> gymprogression.app</span>
      <MoreHorizontal size={22} />
    </div>
    <div className="browser-body">{children}</div>
  </div>;
}

function Cursor({ className }: { className: string }) {
  return <div className={`film-cursor ${className}`} aria-hidden="true">
    <span className="cursor-click" />
    <svg width="38" height="45" viewBox="0 0 38 45"><path d="M5 3L6 34L14 27L21 41L28 37L21 24L32 23Z" fill="white" stroke="#09090b" strokeWidth="2.5" strokeLinejoin="round" /></svg>
  </div>;
}

function Heatmap({ animated = false }: { animated?: boolean }) {
  return <div className={`demo-heatmap ${animated ? 'heatmap-animated' : ''}`}>
    <div className="heatmap-months"><span>JUN</span><span>JUL</span><span>AUG</span><span>SEP</span><span>OCT</span></div>
    <div className="heatmap-body">
      <div className="heatmap-days"><span>M</span><span>W</span><span>F</span></div>
      <div className="film-heatmap-cells">{HEATMAP_LEVELS.map((level, i) => <i key={i} data-level={level} />)}</div>
    </div>
    <div className="heatmap-legend"><span>Every session counts.</span><div>Less <i /><i /><i /><i /> More</div></div>
  </div>;
}

function DemoDashboard() {
  return <div className="demo-dashboard">
    <div className="demo-topbar"><AppBrand /><span className="demo-avatar">JD</span></div>
    <div className="demo-dashboard-content">
      <div className="demo-heading">
        <div><p className="demo-date">MONDAY, OCTOBER 05</p><h3>What are we training today<span>?</span></h3><p>Every session is a step forward.</p></div>
        <div className="demo-button demo-create"><Plus size={18} /> Create Workout</div>
      </div>
      <div className="demo-stats">
        <div><Flame /><strong>12</strong><span>Sessions this month</span></div>
        <div><CalendarDays /><strong>36</strong><span>Total sessions</span></div>
        <div><Layers /><strong>3</strong><span>Workout plans</span></div>
      </div>
      <div className="demo-dashboard-grid">
        <div className="demo-activity"><div className="demo-section-label">CONSISTENCY <Zap size={14} /></div><Heatmap /><div className="demo-streak"><Flame size={19} /><strong>12-day streak</strong><span>Keep showing up.</span></div></div>
        <div className="demo-routines"><div className="demo-section-label">YOUR WORKOUTS <span>3 plans</span></div>
          {['Chest — Shoulders — Triceps', 'Back — Biceps', 'Legs — Core'].map((name, i) => <div className="demo-routine" key={name}>
            <div className="routine-number"><small>PLAN</small>0{i + 1}</div>
            <div><strong>{name}</strong><span><i /> Ready when you are</span></div>
            <span className="routine-go"><ArrowRight size={21} /></span>
          </div>)}
        </div>
      </div>
      <div className="demo-history"><span><CalendarDays size={17} /> RECENT WORKOUT</span><strong>Chest — Shoulders — Triceps</strong><span>Yesterday · 48 min</span><b><Check size={14} /> Completed</b></div>
    </div>
  </div>;
}

export function Scene01Hook() {
  return <section className="film-scene scene-hook" data-scene="hook" aria-label="Every workout should move you forward">
    <div className="hook-gym" />
    <div className="hook-shade" />
    <div className="hook-lines" />
    <div className="hook-copy">
      <div className="film-eyebrow hook-kicker"><i /> YOU VS. YESTERDAY.</div>
      <h2 className="hook-headline">
        <span className="type-mask"><span className="hook-type-1">EVERY WORKOUT.</span></span>
        <span className="type-mask"><span className="hook-type-2">SHOULD <em>MOVE</em> YOU</span></span>
        <span className="type-mask"><span className="hook-type-3">FORWARD.</span></span>
      </h2>
      <p className="hook-bottom-note">YOUR EFFORT DESERVES A DIRECTION.</p>
    </div>
    <div className="hook-data" aria-hidden="true">
      <div className="weight-ghost ghost-3"><span>YOUR NEXT LEVEL</span><strong>25 <small>KG</small></strong><ArrowUpRight /></div>
      <div className="weight-ghost ghost-2"><span>GETTING STRONGER</span><strong>22.5 <small>KG</small></strong></div>
      <div className="weight-ghost ghost-1"><span>WHERE YOU START</span><strong>20 <small>KG</small></strong></div>
      <svg className="ghost-path" viewBox="0 0 200 540"><path d="M20 480 L70 285 L125 80" /></svg>
    </div>
    <div className="hook-edge-label">BUILT FOR YOUR NEXT LEVEL — 001</div>
  </section>;
}

function Scene02Solution() {
  return <section className="film-scene scene-solution" data-scene="solution" aria-label="Meet Gym Progression">
    <div className="scene-grid" />
    <div className="solution-copy">
      <div className="film-eyebrow solution-kicker"><span>01 /</span> MEET YOUR NEW TRAINING PARTNER</div>
      <h2 className="solution-stop">STOP<br />GUESSING.</h2>
      <h2 className="solution-start">START<br /><em>PROGRESSING.</em></h2>
    </div>
    <div className="feature-stack">
      <div className="film-feature"><span><TrendingUp /></span><div><strong>AUTOMATIC WEIGHT PROGRESSION</strong><p>Your next weight. Already calculated.</p></div></div>
      <div className="film-feature"><span><Timer /></span><div><strong>SMART REST TIMER</strong><p>Recover. Refocus. Go again.</p></div></div>
      <div className="film-feature"><span><CalendarDays /></span><div><strong>WORKOUT HISTORY</strong><p>Every rep. Every step forward.</p></div></div>
    </div>
    <Browser className="solution-browser">
      <div className="solution-dashboard"><DemoDashboard /></div>
      <div className="demo-login">
        <div className="login-intro"><span className="login-mark"><Activity size={42} /></span><h3>WELCOME<br /><em>BACK.</em></h3><p>Your next level is waiting.</p></div>
        <div className="login-form">
          <div className="login-tabs"><span className="selected">Login</span><span>Sign up</span></div>
          <label>EMAIL ADDRESS</label><div className="demo-input"><Mail size={18} /><span>james@train.com</span><Check size={17} /></div>
          <div className="login-password-label"><label>PASSWORD</label><span>Forgot password?</span></div><div className="demo-input"><LockKeyhole size={18} /><span className="password-dots">••••••••••••</span></div>
          <div className="demo-remember"><span><Check size={12} /></span> Remember me</div>
          <div className="demo-button login-button">LOGIN <ArrowRight size={21} /></div>
          <p className="login-secure"><ShieldCheck size={15} /> Your progress. Always yours.</p>
        </div>
      </div>
      <Cursor className="solution-cursor" />
    </Browser>
    <div className="solution-proof"><span className="live-dot" /> LESS ADMIN. MORE LIFTING.</div>
  </section>;
}

function BuilderPanel() {
  return <div className="builder-panel">
    <div className="builder-panel-heading"><div><span className="demo-date">YOUR NEXT SESSION</span><h3>Create Workout</h3></div><X size={23} /></div>
    <div className="builder-name-group"><label>WORKOUT NAME</label><div className="demo-input builder-name-input"><span className="builder-name-value" /><i className="typing-caret" /></div></div>
    <div className="builder-search"><div className="demo-input"><Search size={21} /><span className="builder-search-value" /><span className="search-hint">Search exercises...</span></div>
      <div className="exercise-selector">
        <div className="selector-label">EXERCISE LIBRARY <span>128 exercises</span></div>
        <div className="selector-result"><span className="exercise-symbol"><Dumbbell size={26} /></span><div><strong className="selector-exercise-name">Bench Press</strong><span>Strength · Free weights</span></div><Plus size={22} /></div>
        <div className="selector-result selector-secondary"><span className="exercise-symbol"><Dumbbell size={26} /></span><div><strong>Incline Bench Press</strong><span>Upper chest · Barbell</span></div><Plus size={22} /></div>
      </div>
    </div>
    <div className="builder-exercises">
      <div className="bench-config">
        <div className="exercise-card-heading"><span>01</span><Dumbbell size={23} /><strong>Bench Press</strong><span className="exercise-tag">CHEST</span><MoreHorizontal size={22} /></div>
        <div className="exercise-controls">
          <div className="config-sets"><label>SETS</label><div><span className="mini-step"><Minus size={15} /></span><strong className="builder-sets-value">3</strong><span className="mini-step sets-plus"><Plus size={15} /></span></div></div>
          <div><label>REPS PER SET</label><div><span className="mini-step"><Minus size={15} /></span><strong>8</strong><span className="mini-step"><Plus size={15} /></span></div></div>
          <div className="config-weight"><label>STARTING WEIGHT</label><div><strong><span className="builder-weight-value">15</span> <small>KG</small></strong><span className="mini-step weight-plus"><Plus size={15} /></span></div></div>
        </div>
      </div>
      {[
        ['02', 'Shoulder Press', '3 × 10', '12.5 KG'],
        ['03', 'Incline Press', '3 × 10', '15 KG'],
        ['04', 'Triceps Extension', '3 × 12', '10 KG'],
      ].map(([number, name, reps, weight]) => <div className={`builder-exercise extra-${number}`} key={number}><span>{number}</span><Dumbbell size={22} /><strong>{name}</strong><span>{reps}</span><b>{weight}</b><Check size={18} /></div>)}
    </div>
    <div className="demo-button save-workout"><Check size={20} /> SAVE WORKOUT <ArrowRight size={20} /></div>
    <Cursor className="builder-cursor" />
  </div>;
}

function Scene03WorkoutBuilder() {
  return <section className="film-scene scene-builder" data-scene="builder" aria-label="Build your workout in seconds">
    <div className="scene-grid" />
    <Browser className="builder-browser"><DemoDashboard /><Cursor className="create-cursor" /></Browser>
    <div className="builder-scrim" />
    <BuilderPanel />
    <div className="builder-result">
      <span className="result-check"><Check size={42} /></span>
      <h2>WORKOUT PLAN<br /><em>CREATED.</em></h2>
      <div className="result-number">30<span>SECONDS</span></div>
      <p>NO SPREADSHEETS.<br /><strong>NO GUESSING.</strong></p>
    </div>
    <div className="builder-annotation"><span /> YOUR PLAN. YOUR PACE. YOUR PROGRESS.</div>
  </section>;
}

function Scene04ActiveWorkout() {
  return <section className="film-scene scene-active" data-scene="active" aria-label="Active workout, rest timer and workout consistency">
    <div className="active-gym" />
    <div className="active-heading"><div className="film-eyebrow"><span>03 /</span> SHOW UP. WE HANDLE THE REST.</div><h2>ACTIVE <em>WORKOUT.</em></h2></div>
    <div className="active-card">
      <div className="active-card-label"><span className="live-dot" /> IN THE ZONE <span>EXERCISE 01 / 04</span></div>
      <h3>BENCH PRESS</h3><p>Chest — Shoulders — Triceps</p>
      <div className="active-metrics"><div><span>SET</span><strong>3<small> / 4</small></strong></div><div><span>REPS</span><strong>8</strong></div><div><span>WEIGHT</span><strong>22.5<small> KG</small></strong></div></div>
      <div className="active-sets"><span><Check size={20} /> SET 1</span><span><Check size={20} /> SET 2</span><span className="current-set">8 REPS</span><span>SET 4</span></div>
      <div className="demo-button complete-set"><span className="complete-label"><Check size={24} /> COMPLETE SET</span><span className="completed-label"><Check size={24} /> SET COMPLETED</span><ArrowRight size={26} /></div>
      <div className="active-next"><span>UP NEXT</span><strong>Shoulder Press</strong><ChevronRight size={20} /></div>
      <Cursor className="active-cursor" />
    </div>
    <div className="rest-panel">
      <div className="film-eyebrow"><Timer size={21} /> SMART REST TIMER</div>
      <div className="rest-ring-wrap">
        <svg className="film-rest-ring" viewBox="0 0 440 440"><circle cx="220" cy="220" r="195" className="ring-track" /><circle cx="220" cy="220" r="195" pathLength="1" className="ring-progress" /></svg>
        <div className="rest-ring-center"><span>RECOVER. REFOCUS.</span><strong className="rest-time-value">01:30</strong><p>NEXT UP · SET 4 / 4</p></div>
      </div>
      <div className="rest-compressed"><span>»</span> TIME COMPRESSED</div>
      <p className="rest-ready"><Check size={21} /> READY FOR YOUR NEXT REP.</p>
    </div>
    <div className="consistency-panel">
      <div className="consistency-heading"><div className="film-eyebrow"><span>EVERY SESSION ADDS UP</span></div><h2>CONSISTENCY<br /> BUILDS <em>STRENGTH.</em></h2></div>
      <div className="consistency-card"><div className="consistency-card-top"><span><CalendarDays size={24} /> WORKOUT HISTORY</span><span><Flame size={21} /> 12-DAY STREAK</span></div><Heatmap animated /><div className="consistency-footer"><strong>36 <span>WORKOUTS. ONE STRONGER YOU.</span></strong><span><Check size={18} /> Logged automatically</span></div></div>
    </div>
  </section>;
}

function ProgressChart({ vertical }: { vertical: boolean }) {
  const points = vertical ? [[110, 690], [440, 450], [770, 170]] : [[120, 360], [770, 230], [1420, 85]];
  const path = vertical ? 'M110 690 C260 690 290 450 440 450 S620 170 770 170' : 'M120 360 C400 360 490 230 770 230 S1140 85 1420 85';
  const width = vertical ? 880 : 1540;
  const height = vertical ? 900 : 510;
  return <svg className="progress-chart-svg" viewBox={`0 0 ${width} ${height}`} aria-label="Bench press increases from 20 to 22.5 to 25 kilograms">
    <defs><linearGradient id="film-chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a3e635" stopOpacity=".2" /><stop offset="100%" stopColor="#a3e635" stopOpacity="0" /></linearGradient></defs>
    <g className="chart-grid">{[0.18, 0.4, 0.62, 0.84].map((v) => <line key={v} x1="35" x2={width - 30} y1={height * v} y2={height * v} />)}</g>
    <path className="chart-area" d={`${path} L${points[2][0]} ${height - 45} L110 ${height - 45} Z`} fill="url(#film-chart-fill)" />
    <path className="chart-line-under" d={path} />
    <path className="chart-line" d={path} pathLength="1" />
    {points.map(([x, y], i) => <g className={`chart-milestone milestone-${i}`} key={i}>
      <line className="milestone-guide" x1={x} x2={x} y1={y + 18} y2={height - 38} />
      <circle className="milestone-halo" cx={x} cy={y} r="23" />
      <circle className="milestone-dot" cx={x} cy={y} r="9" />
      <text className="milestone-weight" x={x} y={y - 52} textAnchor="middle">{['20', '22.5', '25'][i]}<tspan className="milestone-unit"> KG</tspan></text>
      <text className="milestone-week" x={x} y={height - 4} textAnchor="middle">{['THE START', 'THE WORK', 'THE PROGRESS'][i]}</text>
    </g>)}
  </svg>;
}

function Scene05Progress({ vertical }: { vertical: boolean }) {
  return <section className="film-scene scene-progress" data-scene="progress" aria-label="Automatic progressive overload">
    <div className="progress-ambient" />
    <div className="progress-camera">
      <div className="progress-heading"><div className="film-eyebrow"><span>04 /</span> THE NUMBERS DON’T LIE.</div><h2>YOUR EFFORT.<br /><em>MEASURABLE.</em></h2><div className="progress-exercise"><Dumbbell size={22} /> BENCH PRESS <span>4 SETS × 8 REPS</span></div></div>
      <div className="progress-stat"><span>YOUR WORKING WEIGHT</span><div><strong className="progress-weight-value">20</strong><b>KG</b></div><span className="strength-badge"><TrendingUp size={24} /> +<strong className="progress-strength-value">0</strong>% STRENGTH</span></div>
      <div className="progress-plot"><ProgressChart vertical={vertical} /></div>
      <div className="overload-badge"><TrendingUp size={21} /> PROGRESSIVE OVERLOAD <span>ON AUTOPILOT</span></div>
      <div className="progress-rules">
        <div className="rule-increase"><span>HIT YOUR REPS?</span><ArrowRight /><strong>INCREASE THE WEIGHT.</strong></div>
        <div className="rule-maintain"><span>MISS YOUR TARGET?</span><ArrowRight /><strong>KEEP THE WEIGHT.</strong></div>
        <div className="rule-final">NO MORE <em>GUESSING.</em></div>
      </div>
    </div>
  </section>;
}

function Scene06CTA() {
  return <section className="film-scene scene-cta" data-scene="cta" aria-label="Start for free with Gym Progression">
    <div className="cta-gym" /><div className="scene-grid" />
    <div className="cta-orbit orbit-one" /><div className="cta-orbit orbit-two" />
    <div className="cta-content">
      <div className="cta-mark"><Activity size={47} /></div>
      <h2 className="cta-brand"><span>GYM</span><em>PROGRESSION</em></h2>
      <p className="cta-tagline">TRAIN SMARTER.<br /><strong>PROGRESS EVERY DAY.</strong></p>
      <Link className="film-cta-button" href="/app">START FOR FREE <ArrowRight size={30} /></Link>
      <p className="cta-support">TRACK. PROGRESS. GET STRONGER.</p>
    </div>
    <span className="cta-signoff">THE NEXT CHAPTER IS YOURS.</span>
  </section>;
}

export const FilmScenes = memo(function FilmScenes({ vertical }: { vertical: boolean }) {
  return <><Scene01Hook /><Scene02Solution /><Scene03WorkoutBuilder /><Scene04ActiveWorkout /><Scene05Progress vertical={vertical} /><Scene06CTA /><div className="film-transition-blade" aria-hidden="true"><ArrowDown size={96} /></div></>;
});
