import { gsap } from 'gsap';
import { FILM_DURATION, FILM_SCENES, HEATMAP_LEVELS } from '@/lib/motion-film';

type Entrance = { x?: number; y?: number; scale?: number; duration?: number; alpha?: number; stagger?: number; ease?: string };

export function createFilmTimeline(
  root: HTMLElement,
  vertical: boolean,
  reduced: boolean,
  onUpdate: (seconds: number) => void,
  onComplete: () => void,
) {
  const q = (selector: string) => root.querySelectorAll<HTMLElement>(selector);
  const motion = (value: number) => reduced ? 0 : value;
  const scale = (value: number) => reduced ? 1 : value;

  // Resolve each click in its own camera's coordinate space, before any writes.
  const aim = (target: string, cursor: string, fraction = .65) => {
    const element = root.querySelector<HTMLElement>(target)!;
    const pointer = root.querySelector<HTMLElement>(cursor)!;
    const parent = pointer.offsetParent as HTMLElement;
    const box = element.getBoundingClientRect();
    const bounds = parent.getBoundingClientRect();
    const ratio = bounds.width / parent.offsetWidth || 1;
    return { x: (box.left - bounds.left + box.width * fraction) / ratio, y: (box.top - bounds.top + box.height * .58) / ratio };
  };
  const targets = {
    login: aim('.login-button', '.solution-cursor', .76),
    create: aim('.builder-browser .demo-create', '.create-cursor'),
    name: aim('.builder-name-input', '.builder-cursor', .53),
    search: aim('.builder-search .demo-input', '.builder-cursor', .34),
    result: aim('.selector-result', '.builder-cursor', .76),
    sets: aim('.sets-plus', '.builder-cursor', .5),
    weight: aim('.weight-plus', '.builder-cursor', .5),
    save: aim('.save-workout', '.builder-cursor', .7),
    complete: aim('.complete-set', '.active-cursor', .68),
  };

  const master = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } });
  master.to({}, { duration: FILM_DURATION }, 0);
  FILM_SCENES.forEach((scene) => master.addLabel(scene.id, scene.start));
  gsap.set(q('.film-scene'), { autoAlpha: 0 });
  gsap.set(q('.scene-hook'), { autoAlpha: 1 });

  const enter = (selector: string, at: number, options: Entrance = {}) => {
    const { x = 0, y = 30, scale: size = 1, duration = .55, alpha = 1, stagger = 0, ease = 'power3.out' } = options;
    gsap.set(q(selector), { autoAlpha: 0 });
    master.fromTo(q(selector),
      { autoAlpha: 0, x: motion(x), y: motion(y), scale: scale(size) },
      { autoAlpha: alpha, x: 0, y: 0, scale: 1, duration, stagger, ease, immediateRender: false }, at);
  };
  const out = (selector: string, at: number, vars: gsap.TweenVars = {}) => {
    master.to(q(selector), { autoAlpha: 0, duration: .3, ...vars }, at);
  };
  const click = (cursor: string, button: string, at: number) => {
    master.fromTo(q(`${cursor} .cursor-click`), { autoAlpha: .8, scale: .25 }, { autoAlpha: 0, scale: scale(1.4), duration: .42, immediateRender: false }, at);
    master.fromTo(q(button), { scale: 1 }, { scale: scale(.967), duration: .11, repeat: 1, yoyo: true, ease: 'power2.inOut', immediateRender: false }, at);
  };
  const pointerIn = (cursor: string, at: number, target: { x: number; y: number }) => {
    gsap.set(q(cursor), { autoAlpha: 0 });
    master.fromTo(q(cursor), { x: target.x + motion(120), y: target.y + motion(85), autoAlpha: 0 }, { x: target.x, y: target.y, autoAlpha: 1, duration: .65, ease: 'power2.inOut', immediateRender: false }, at);
  };
  const pointerTo = (cursor: string, target: { x: number; y: number }, at: number, duration = .35) => {
    master.to(q(cursor), { ...target, duration: reduced ? .05 : duration, ease: 'power2.inOut' }, at);
  };
  const wipe = (at: number) => {
    if (reduced) return;
    master.set(q('.film-transition-blade'), { autoAlpha: 1, xPercent: 0 }, at);
    master.to(q('.film-transition-blade'), { xPercent: 700, duration: .65, ease: 'power3.inOut' }, at);
    master.set(q('.film-transition-blade'), { autoAlpha: 0 }, at + .66);
  };

  // 00:00 — a deliberate first beat, then athletic masked typography.
  master.fromTo(q('.hook-gym'), { scale: scale(1.015) }, { scale: scale(1.1), duration: 5.2, ease: 'none' }, 0);
  enter('.hook-kicker', .08, { y: 16, duration: .45 });
  enter('.hook-type-1', .15, { y: 170, duration: .62, ease: 'power4.out' });
  enter('.hook-type-2', 1.15, { y: 140, duration: .45, ease: 'power4.out' });
  enter('.hook-type-3', 1.65, { y: 260, scale: 1.045, duration: .6, ease: 'power4.out' });
  enter('.hook-bottom-note', 2.5, { y: 8, duration: .7 });
  enter('.ghost-1', .8, { y: 30, alpha: .35, duration: .7 });
  enter('.ghost-2', 1.8, { y: 30, alpha: .5, duration: .7 });
  enter('.ghost-3', 2.8, { y: 30, alpha: .75, duration: .7 });
  out('.hook-copy', 4.64, { x: motion(-170), filter: reduced ? 'none' : 'blur(7px)', duration: .4 });
  out('.hook-data', 4.7, { y: motion(-35), duration: .35 });
  out('.scene-hook', 5.09, { duration: .1 });
  wipe(4.72);

  // 00:05 — login becomes the actual product's dashboard under one camera.
  master.set(q('.scene-solution'), { autoAlpha: 1 }, 4.88);
  enter('.solution-browser', 4.95, { x: 170, y: 48, scale: .9, duration: .85 });
  enter('.solution-kicker', 5.15, { y: 18 });
  enter('.solution-stop', 5.4, { y: 70, duration: .55 });
  gsap.set(q('.solution-dashboard'), { autoAlpha: 0 });
  pointerIn('.solution-cursor', 6.55, targets.login);
  click('.solution-cursor', '.login-button', 7.35);
  out('.solution-cursor', 7.72);
  out('.demo-login', 7.65, { scale: scale(.965), duration: .4 });
  master.fromTo(q('.solution-dashboard'), { autoAlpha: 0, scale: scale(.98) }, { autoAlpha: 1, scale: 1, duration: .6, immediateRender: false }, 7.8);
  master.to(q('.solution-browser'), { scale: scale(1.025), x: motion(-8), duration: 3.2, ease: 'sine.inOut' }, 8.4);
  enter('.film-feature', 8.65, { y: 32, scale: .96, duration: .5, stagger: .5 });
  out('.solution-stop', 10.25, { y: motion(-40), duration: .28 });
  enter('.solution-start', 10.52, { y: 65, duration: .55 });
  enter('.solution-proof', 11.1, { y: 12 });
  out('.film-feature', 13.9, { x: motion(-60), stagger: .07, duration: .35 });
  out('.solution-copy, .solution-proof', 14.2, { x: motion(-60), duration: .4 });
  master.to(q('.solution-browser'), { scale: scale(vertical ? 1.17 : 1.45), x: motion(vertical ? 0 : -360), y: motion(vertical ? -120 : 0), duration: 1, ease: 'power3.inOut' }, 14.1);
  out('.scene-solution', 15.14, { duration: .12 });

  // 00:15 — deterministic typed input, selector results, and tactile controls.
  master.set(q('.scene-builder'), { autoAlpha: 1 }, 14.82);
  enter('.builder-browser', 14.82, { scale: .94, duration: .65, y: 18 });
  pointerIn('.create-cursor', 15.55, targets.create);
  click('.create-cursor', '.builder-browser .demo-create', 16.2);
  out('.create-cursor', 16.5);
  enter('.builder-scrim', 16.25, { y: 0, duration: .3 });
  enter('.builder-panel', 16.32, { y: 60, scale: .93, duration: .6 });
  pointerIn('.builder-cursor', 16.6, targets.name);
  master.fromTo(q('.typing-caret'), { autoAlpha: 1 }, { autoAlpha: .05, duration: .2, repeat: 7, yoyo: true, immediateRender: false }, 17);
  out('.typing-caret', 18.65, { duration: .05 });
  pointerTo('.builder-cursor', targets.search, 18.5);
  enter('.exercise-selector', 19.36, { y: -9, duration: .22 });
  pointerTo('.builder-cursor', targets.result, 19.64, .4);
  click('.builder-cursor', '.selector-result', 20.1);
  out('.exercise-selector', 20.25, { duration: .15 });
  enter('.bench-config', 20.28, { y: 26, scale: .98, duration: .45 });
  pointerTo('.builder-cursor', targets.sets, 21.04);
  click('.builder-cursor', '.sets-plus', 21.4);
  pointerTo('.builder-cursor', targets.weight, 21.64, .3);
  click('.builder-cursor', '.weight-plus', 22);
  master.fromTo(q('.config-weight'), { borderColor: '#a3e635' }, { borderColor: '#33343a', duration: .65, immediateRender: false }, 22);
  [
    { start: 22.3, open: 22.55, click: 22.9, card: '.extra-02' },
    { start: 23.1, open: 23.34, click: 23.6, card: '.extra-03' },
    { start: 23.8, open: 24.02, click: 24.34, card: '.extra-04' },
  ].forEach((step) => {
    pointerTo('.builder-cursor', targets.search, step.start, .2);
    master.fromTo(q('.exercise-selector'), { autoAlpha: 0, y: motion(-9) }, { autoAlpha: 1, y: 0, duration: .18, immediateRender: false }, step.open);
    pointerTo('.builder-cursor', targets.result, step.open + .03, .23);
    click('.builder-cursor', '.selector-result', step.click);
    out('.exercise-selector', step.click + .06, { duration: .12 });
    enter(step.card, step.click + .1, { y: 22, scale: .985, duration: .35 });
  });
  pointerTo('.builder-cursor', targets.save, 25.06, .4);
  click('.builder-cursor', '.save-workout', 25.55);
  out('.builder-cursor', 25.85);
  out('.builder-scrim', 26.1, { duration: .4 });
  master.to(q('.builder-browser'), { autoAlpha: 0, scale: scale(.95), duration: .55 }, 26.1);
  master.to(q('.builder-panel'), { scale: vertical ? .6 : .76, x: vertical ? 0 : -391, y: vertical ? 480 : 17, autoAlpha: vertical ? .85 : 1, duration: reduced ? .01 : .7, ease: 'power3.inOut' }, 26.05);
  enter('.result-check', 26.42, { y: 0, scale: .6, duration: .45, ease: 'back.out(1.4)' });
  enter('.builder-result h2', 26.52, { y: 40, duration: .45 });
  gsap.set(q('.result-number'), { autoAlpha: 0 });
  master.fromTo(q('.result-number'), { autoAlpha: 0, scale: scale(.8) }, { autoAlpha: 1, scale: scale(1.1), duration: .33, ease: 'power3.out', immediateRender: false }, 26.9);
  master.to(q('.result-number'), { scale: 1, duration: .28, ease: 'power2.out' }, 27.23);
  enter('.builder-result > p', 27.48, { y: 14, duration: .5 });
  enter('.builder-annotation', 27.65, { y: 6, duration: .4 });
  out('.builder-result, .builder-annotation', 29.5, { y: motion(-35), duration: .3 });
  master.to(q('.builder-panel'), { scale: scale(vertical ? 2 : 2.8), x: motion(vertical ? 0 : -260), y: motion(-340), filter: reduced ? 'none' : 'blur(4px)', autoAlpha: 0, duration: .75, ease: 'power3.in' }, 29.4);
  out('.scene-builder', 30.18, { duration: .1 });

  // 00:30 — complete a set, recover, then pan into a growing history.
  master.set(q('.scene-active'), { autoAlpha: 1 }, 29.98);
  enter('.active-heading', 30.05, { y: 27, duration: .5 });
  enter('.active-card', 30.18, { y: 35, scale: .94, duration: .65 });
  gsap.set(q('.completed-label'), { autoAlpha: 0 });
  pointerIn('.active-cursor', 31.45, targets.complete);
  click('.active-cursor', '.complete-set', 32.5);
  out('.complete-label', 32.55, { duration: .12 });
  master.to(q('.completed-label'), { autoAlpha: 1, duration: .2 }, 32.68);
  out('.active-cursor', 32.9);
  master.to(q('.current-set'), { backgroundColor: '#a3e635', color: '#09090b', duration: .25 }, 32.55);
  enter('.rest-panel', 32.9, { y: 25, scale: .9, duration: .65 });
  master.to(q('.active-card'), { scale: vertical ? .86 : .96, x: vertical ? 0 : -24, y: vertical ? -112 : 0, autoAlpha: vertical ? .35 : .65, duration: reduced ? .01 : .75, ease: 'power2.inOut' }, 33.25);
  enter('.rest-compressed', 35.5, { y: 0, duration: .2 });
  if (!reduced) master.to(q('.rest-ring-wrap'), { scale: 1.016, duration: .23, repeat: 5, yoyo: true, ease: 'sine.inOut' }, 36.9);
  enter('.rest-ready', 38.08, { y: 10, duration: .3 });
  out('.rest-compressed', 38.08, { duration: .15 });
  out('.active-heading, .active-card, .rest-panel', 38.58, { x: motion(-130), duration: .45 });
  enter('.consistency-panel', 38.72, { x: 200, y: 0, duration: .6 });
  enter('.consistency-heading', 38.86, { y: 28, duration: .5 });
  enter('.consistency-card', 39.02, { y: 45, scale: .97, duration: .6 });
  const cells = q('.heatmap-animated .film-heatmap-cells i');
  gsap.set(cells, { backgroundColor: '#25252a', scale: scale(.8) });
  master.to(cells, { backgroundColor: (i: number) => HEATMAP_LEVELS[i] ? '#455e26' : '#25252a', scale: 1, stagger: .009, duration: .18, ease: 'power2.out' }, 39.18);
  master.to(cells, { backgroundColor: (i: number) => ['#25252a', '#3b521f', '#658d2b', '#a3e635'][HEATMAP_LEVELS[i]], stagger: .009, duration: .25 }, 39.39);
  master.to(q('.consistency-card'), { scale: scale(1.07), duration: .75, ease: 'power2.in' }, 41.35);
  out('.scene-active', 42.14, { duration: .1 });
  wipe(41.77);

  // 00:42 — the rising line and large counters own the image.
  master.set(q('.scene-progress'), { autoAlpha: 1 }, 41.98);
  enter('.progress-heading', 42.16, { y: 42, duration: .6 });
  enter('.progress-stat', 42.48, { y: 30, scale: .96, duration: .55 });
  enter('.progress-plot', 42.48, { y: 25, duration: .5 });
  master.fromTo(q('.chart-line'), { strokeDashoffset: 1 }, { strokeDashoffset: .5, duration: 2, ease: 'power2.inOut', immediateRender: false }, 42.85);
  master.to(q('.chart-line'), { strokeDashoffset: 0, duration: 2, ease: 'power2.inOut' }, 44.85);
  master.fromTo(q('.chart-area'), { clipPath: 'inset(0 100% 0 0)', autoAlpha: 0 }, { clipPath: 'inset(0 0% 0 0)', autoAlpha: 1, duration: 4, ease: 'none', immediateRender: false }, 42.85);
  enter('.milestone-0', 43.04, { y: 15, scale: .96, duration: .45 });
  enter('.milestone-1', 44.73, { y: 15, scale: .96, duration: .45 });
  enter('.milestone-2', 46.7, { y: 15, scale: .94, duration: .5 });
  enter('.strength-badge', 46.72, { y: 15, scale: .95, duration: .45 });
  enter('.overload-badge', 47.08, { y: 14, duration: .4 });
  enter('.rule-increase', 44.85, { y: 34, duration: .38 });
  out('.rule-increase', 46.65, { y: motion(-27), duration: .2 });
  enter('.rule-maintain', 46.86, { y: 30, duration: .38 });
  out('.rule-maintain', 48.05, { y: motion(-25), duration: .2 });
  enter('.rule-final', 48.28, { y: 30, scale: .96, duration: .4 });
  master.to(q('.progress-camera'), { scale: scale(.68), y: motion(-60), autoAlpha: 0, duration: .78, ease: 'power3.inOut' }, 51.8);
  out('.scene-progress', 52.59, { duration: .1 });

  // 00:52 — let the identity land, then give the CTA room to breathe.
  master.fromTo(q('.scene-cta'), { autoAlpha: 0 }, { autoAlpha: 1, duration: .48, immediateRender: false }, 52.12);
  enter('.cta-gym, .scene-cta .scene-grid', 52.12, { y: 0, duration: 1 });
  enter('.cta-mark', 52.45, { y: 20, scale: .7, duration: .6 });
  enter('.cta-brand > span', 52.85, { y: 55, duration: .6 });
  enter('.cta-brand > em', 53.1, { y: 60, duration: .65 });
  enter('.cta-tagline', 54.05, { y: 28, duration: .6 });
  enter('.film-cta-button', 55.15, { y: 28, scale: .92, duration: .55, ease: 'back.out(1.15)' });
  enter('.cta-support', 55.8, { y: 12, duration: .5 });
  enter('.cta-signoff', 56.3, { y: 8, duration: .5 });
  enter('.cta-orbit', 53, { y: 0, scale: .88, duration: 2.8, stagger: .3 });
  if (!reduced) master.to(q('.film-cta-button'), { scale: 1.012, boxShadow: '0 0 55px #a3e63530', duration: .25, repeat: 7, yoyo: true, ease: 'sine.inOut' }, 56);

  master.eventCallback('onUpdate', () => onUpdate(master.time()));
  master.eventCallback('onComplete', onComplete);
  return master;
}
