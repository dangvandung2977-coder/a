'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react';
import { gsap } from 'gsap';
import Link from 'next/link';
import { ArrowUpRight, FileText, Maximize, Minimize, Monitor, Pause, Play, RotateCcw, Smartphone, Volume2, VolumeX, X } from 'lucide-react';
import AppBrand from '@/components/AppBrand';
import { FILM_BPM, FILM_DURATION, FILM_SCENES, clampTime, formatTime, frameAt } from '@/lib/motion-film';
import { FilmScenes, Scene01Hook } from './Scenes';
import { createFilmTimeline } from './timeline';
import './motion.css';

const reducedQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(callback: () => void) {
  const media = window.matchMedia(reducedQuery);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
const getReducedMotion = () => window.matchMedia(reducedQuery).matches;
const serverReducedMotion = () => false;

export default function MotionVideo() {
  const [vertical, setVertical] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [started, setStarted] = useState(false);
  const [currentSecond, setCurrentSecond] = useState(0);
  const [activeScene, setActiveScene] = useState(0);
  const [captions, setCaptions] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(.85);
  const [fullscreen, setFullscreen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const reduced = useSyncExternalStore(subscribeMotion, getReducedMotion, serverReducedMotion);
  const playerRef = useRef<HTMLDivElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const sceneRootRef = useRef<HTMLDivElement>(null);
  const rangeRef = useRef<HTMLInputElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLSpanElement>(null);
  const transcriptRef = useRef<HTMLDialogElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const playback = useRef({ time: 0, playing: false, muted: false, volume: .85 });
  const lastUi = useRef({ second: -1, scene: -1 });
  const resumeAfterScrub = useRef(false);
  const audioRef = useRef<{ music: HTMLAudioElement; voices: HTMLAudioElement[] } | null>(null);
  const pendingAudio = useRef(new Set<HTMLAudioElement>());
  const failedAudio = useRef(new Set<HTMLAudioElement>());

  const syncAudio = useCallback((time: number, force = false) => {
    const audio = audioRef.current;
    if (!audio) return;
    const state = playback.current;
    const run = (media: HTMLAudioElement, offset: number, active: boolean, gain: number) => {
      media.muted = state.muted;
      media.volume = state.volume * gain;
      if (active && media.readyState >= 1 && (force || Math.abs(media.currentTime - offset) > .2)) {
        media.currentTime = Math.min(Math.max(0, offset), Number.isFinite(media.duration) ? media.duration : FILM_DURATION);
      }
      if (!active || !state.playing || state.muted || time >= FILM_DURATION) {
        if (!media.paused) media.pause();
        return;
      }
      if (!media.paused || pendingAudio.current.has(media) || failedAudio.current.has(media)) return;
      pendingAudio.current.add(media);
      void media.play().catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        failedAudio.current.add(media);
        setAudioError(true);
      }).finally(() => pendingAudio.current.delete(media));
    };
    run(audio.music, time, true, .42);
    audio.voices.forEach((voice, index) => {
      const scene = FILM_SCENES[index];
      const offset = time - scene.voiceover.start;
      const duration = Number.isFinite(voice.duration) ? voice.duration : scene.end - scene.voiceover.start;
      run(voice, offset, offset >= 0 && offset < duration && time < scene.end, 1);
    });
  }, []);

  const pause = useCallback(() => {
    playback.current.playing = false;
    timelineRef.current?.pause();
    setPlaying(false);
    syncAudio(playback.current.time);
  }, [syncAudio]);

  const play = useCallback(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;
    if (playback.current.time >= FILM_DURATION) timeline.time(0, false);
    playback.current.playing = true;
    setStarted(true);
    setPlaying(true);
    // Start on the user's gesture; every subsequent cue follows master time.
    syncAudio(playback.current.time, true);
    timeline.play();
  }, [syncAudio]);

  const togglePlay = useCallback(() => playback.current.playing ? pause() : play(), [pause, play]);

  const seek = useCallback((value: number) => {
    const time = clampTime(value);
    setStarted(true);
    timelineRef.current?.time(time, false);
    playback.current.time = time;
    if (time >= FILM_DURATION) pause();
    syncAudio(time, true);
  }, [pause, syncAudio]);

  const restart = useCallback(() => {
    seek(0);
    play();
  }, [seek, play]);

  const toggleMute = useCallback(() => {
    const next = !playback.current.muted;
    playback.current.muted = next;
    if (!next && playback.current.volume === 0) {
      playback.current.volume = .85;
      setVolume(.85);
    }
    setMuted(next);
    syncAudio(playback.current.time, true);
  }, [syncAudio]);

  const toggleFullscreen = useCallback(async () => {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
    } else if (expanded) {
      setExpanded(false);
    } else {
      try {
        if (!playerRef.current?.requestFullscreen) { setExpanded(true); return; }
        await playerRef.current.requestFullscreen();
      } catch {
        // iOS browsers without element fullscreen use the same fitted artboard.
        setExpanded(true);
      }
    }
  }, [expanded]);

  useEffect(() => {
    const query = new URLSearchParams(window.location.search);
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    if (query.get('auth') === 'recovery' || query.has('code') || fragment.has('access_token') || fragment.has('error_description')) {
      window.location.replace(`/app${window.location.search}${window.location.hash}`);
    }
    const music = new Audio('/audio/progression-score.mp3');
    const voices = FILM_SCENES.map((scene) => new Audio(scene.voiceover.src));
    const all = [music, ...voices];
    all.forEach((audio) => { audio.preload = 'auto'; });
    audioRef.current = { music, voices };
    return () => {
      all.forEach((audio) => { audio.pause(); audio.removeAttribute('src'); audio.load(); });
      audioRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const root = sceneRootRef.current!;
    const screen = screenRef.current!;
    const viewport = viewportRef.current!;
    const stage = stageRef.current!;
    const width = vertical ? 1080 : 1920;
    const height = vertical ? 1920 : 1080;
    const fit = () => {
      const ratio = Math.min(screen.clientWidth / width, screen.clientHeight / height);
      viewport.style.width = `${width * ratio}px`;
      viewport.style.height = `${height * ratio}px`;
      stage.style.transform = `scale(${ratio})`;
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(screen);
    const find = (selector: string) => root.querySelector<HTMLElement>(selector)!;
    const nodes = {
      name: find('.builder-name-value'), search: find('.builder-search-value'), hint: find('.search-hint'),
      selection: find('.selector-exercise-name'), sets: find('.builder-sets-value'), startingWeight: find('.builder-weight-value'),
      rest: find('.rest-time-value'), ring: find('.ring-progress'), weight: find('.progress-weight-value'), strength: find('.progress-strength-value'),
    };
    const sections = root.querySelectorAll<HTMLElement>('[data-scene]');
    const text = (element: HTMLElement, value: string) => { if (element.textContent !== value) element.textContent = value; };
    const render = (seconds: number) => {
      const frame = frameAt(seconds);
      playback.current.time = frame.time;
      text(nodes.name, frame.workoutName);
      text(nodes.search, frame.search);
      nodes.hint.style.opacity = frame.search ? '0' : '1';
      text(nodes.selection, frame.selectedExercise);
      text(nodes.sets, String(frame.sets));
      text(nodes.startingWeight, String(frame.startingWeight));
      text(nodes.rest, formatTime(frame.restSeconds));
      nodes.ring.style.strokeDashoffset = String(1 - frame.restSeconds / 90);
      text(nodes.weight, String(frame.weight));
      text(nodes.strength, String(frame.strength));
      if (rangeRef.current) rangeRef.current.value = String(frame.time);
      trackRef.current?.style.setProperty('--progress', String(frame.time / FILM_DURATION));
      stage.dataset.time = frame.time.toFixed(3);
      stage.dataset.scene = FILM_SCENES[frame.scene].id;
      if (captionRef.current) {
        text(captionRef.current, frame.caption);
        captionRef.current.hidden = !frame.caption;
      }
      const second = Math.floor(frame.time);
      if (lastUi.current.second !== second) {
        lastUi.current.second = second;
        setCurrentSecond(second);
        rangeRef.current?.setAttribute('aria-valuetext', `${formatTime(frame.time)} of 01:00`);
      }
      if (lastUi.current.scene !== frame.scene) {
        lastUi.current.scene = frame.scene;
        setActiveScene(frame.scene);
        sections.forEach((section, index) => section.setAttribute('aria-hidden', String(index !== frame.scene)));
      }
      syncAudio(frame.time);
    };
    const position = playback.current.time;
    const wasPlaying = playback.current.playing;
    let master: gsap.core.Timeline;
    const context = gsap.context(() => {
      master = createFilmTimeline(root, vertical, reduced, render, pause);
      timelineRef.current = master;
      master.time(position, false);
      render(position);
      if (wasPlaying && position < FILM_DURATION) master.play();
    }, root);
    return () => {
      observer.disconnect();
      master.eventCallback('onUpdate', null);
      master.eventCallback('onComplete', null);
      context.revert();
      timelineRef.current = null;
    };
  }, [vertical, reduced, pause, syncAudio]);

  useEffect(() => {
    const change = () => setFullscreen(Boolean(document.fullscreenElement));
    const visibility = () => { if (document.hidden) pause(); };
    document.addEventListener('fullscreenchange', change);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      document.removeEventListener('fullscreenchange', change);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [pause]);

  useEffect(() => {
    if (!expanded) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [expanded]);

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && expanded) { setExpanded(false); return; }
      if (event.ctrlKey || event.metaKey || event.altKey || transcriptRef.current?.open) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.code === 'Space' && target.closest('button, a')) return;
      if (event.code === 'Space' || event.key.toLowerCase() === 'k') { event.preventDefault(); togglePlay(); }
      else if (event.key === 'ArrowLeft') { event.preventDefault(); seek(playback.current.time - 5); }
      else if (event.key === 'ArrowRight') { event.preventDefault(); seek(playback.current.time + 5); }
      else if (event.key.toLowerCase() === 'm') toggleMute();
      else if (event.key.toLowerCase() === 'f') { event.preventDefault(); void toggleFullscreen(); }
      else if (event.key.toLowerCase() === 'r') restart();
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [expanded, restart, seek, toggleFullscreen, toggleMute, togglePlay]);

  const isFullscreen = fullscreen || expanded;
  return <main className="motion-page" lang="en">
    <div className="motion-shell">
      <header className="film-masthead">
        <Link href="/" aria-label="Gym Progression film"><AppBrand /></Link>
        <span className="masthead-caption">BUILT FOR YOUR NEXT LEVEL.</span>
        <Link href="/app" className="open-app-link">OPEN THE APP <ArrowUpRight size={17} aria-hidden="true" /></Link>
      </header>
      <Link href="/ads" className="film-ad-link"><span><small>NEW · 30-SECOND AD CUT</small>Ready to share. Built to move.</span><strong>WATCH & DOWNLOAD <ArrowUpRight size={18} aria-hidden="true" /></strong></Link>
      <div className="film-heading">
        <h1><span>01 /</span> THE PROGRESSION FILM</h1>
        <p><span className="status-dot" /> 60 seconds. A stronger you.</p>
      </div>
      <div className={`film-player${expanded ? ' is-expanded' : ''}`} ref={playerRef} role="region" aria-label="Gym Progression film player">
        <div className="player-toolbar">
          <div className="film-edition"><span>●</span> THE NEXT REP CHANGES EVERYTHING.</div>
          <div className="format-controls">
            <span className="format-resolution">{vertical ? '1080 × 1920' : '1920 × 1080'}</span>
            <div className="format-switch" role="group" aria-label="Video format">
              <button type="button" aria-label="Landscape 16:9" aria-pressed={!vertical} onClick={() => setVertical(false)}><Monitor size={13} aria-hidden="true" />16:9</button>
              <button type="button" aria-label="Portrait 9:16" aria-pressed={vertical} onClick={() => setVertical(true)}><Smartphone size={13} aria-hidden="true" />9:16</button>
            </div>
          </div>
        </div>
        <div className="film-screen" data-format={vertical ? 'portrait' : 'landscape'} ref={screenRef}>
          <div className="film-viewport" ref={viewportRef}>
            <div className={`film-stage${vertical ? ' is-portrait' : ''}`} ref={stageRef} aria-label={FILM_SCENES[activeScene].description}>
              <div className="film-scenes" ref={sceneRootRef} aria-hidden={!started}><FilmScenes vertical={vertical} /></div>
              {!started && <div className="film-poster">
                <Scene01Hook />
                <button className="poster-play" type="button" onClick={play} aria-label="Play the 60-second film"><span><Play size={23} fill="currentColor" aria-hidden="true" /></span><span><strong>PLAY THE FILM</strong><small>60 SECONDS. ZERO GUESSWORK.</small></span></button>
                <span className="poster-runtime">SOUND ON. WORLD OFF.</span>
              </div>}
              <div className="film-stage-brand"><AppBrand /></div>
              <div className="film-stage-label"><i>●</i> {started ? `${String(activeScene + 1).padStart(2, '0')} / 06` : 'A FILM ABOUT PROGRESS'}</div>
              <div className="film-caption" hidden={!captions || !started}><span ref={captionRef} hidden /></div>
            </div>
          </div>
        </div>
        <div className="film-transport">
          <div className="seek-lane">
            <div className="seek-track" ref={trackRef}><span className="seek-fill" />{FILM_SCENES.slice(1).map((scene) => <i className="seek-marker" key={scene.id} style={{ left: `${scene.start / FILM_DURATION * 100}%` }} />)}</div>
            <input className="film-seek" ref={rangeRef} type="range" min="0" max={FILM_DURATION} step="0.01" defaultValue="0" aria-label="Film timeline" aria-valuetext="00:00 of 01:00"
              onChange={(event) => seek(Number(event.target.value))}
              onPointerDown={() => { resumeAfterScrub.current = playback.current.playing; if (playback.current.playing) pause(); }}
              onPointerUp={() => { if (resumeAfterScrub.current && playback.current.time < FILM_DURATION) play(); resumeAfterScrub.current = false; }}
              onPointerCancel={() => { resumeAfterScrub.current = false; }}
              onKeyDown={(event) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); seek(playback.current.time + (event.key === 'ArrowLeft' ? -1 : 1)); } }} />
          </div>
          <div className="transport-row">
            <div className="transport-left">
              <button type="button" className="transport-play" onClick={togglePlay} aria-label={playing ? 'Pause film' : currentSecond === FILM_DURATION ? 'Replay film' : 'Play film'} title={playing ? 'Pause (Space)' : 'Play (Space)'}>{playing ? <Pause size={16} fill="currentColor" aria-hidden="true" /> : <Play size={16} fill="currentColor" aria-hidden="true" />}</button>
              <button type="button" className="transport-icon" onClick={restart} aria-label="Restart film" title="Restart (R)"><RotateCcw size={16} aria-hidden="true" /></button>
              <div className="transport-time"><time>{formatTime(currentSecond)}</time><span>/</span><small>01:00</small></div>
              <span className="transport-divider" />
              <div className="soundtrack-info"><div className="audio-bars" aria-hidden="true" style={{ opacity: playing && !muted ? 1 : .35 }}><i /><i /><i /><i /></div><span>ORIGINAL SCORE · {FILM_BPM} BPM</span></div>
            </div>
            <div className="transport-right">
              <button type="button" className="transport-icon" onClick={() => setCaptions(!captions)} aria-label={captions ? 'Hide captions' : 'Show captions'} aria-pressed={captions} title="Closed captions"><span className="transport-caption-label" aria-hidden="true">CC</span></button>
              <button type="button" className="transport-icon" onClick={toggleMute} aria-label={muted ? 'Unmute sound' : 'Mute sound'} title={muted ? 'Unmute (M)' : 'Mute (M)'}>{muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}</button>
              <input className="volume-input" type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} aria-label="Volume" onChange={(event) => {
                const next = Number(event.target.value);
                playback.current.volume = next;
                playback.current.muted = next === 0;
                setVolume(next); setMuted(next === 0);
                syncAudio(playback.current.time, true);
              }} />
              <span className="transport-divider" />
              <button type="button" className="transport-icon" onClick={() => void toggleFullscreen()} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} title="Fullscreen (F)">{isFullscreen ? <Minimize size={17} aria-hidden="true" /> : <Maximize size={17} aria-hidden="true" />}</button>
            </div>
          </div>
        </div>
      </div>
      {audioError && <p className="film-status" role="status">Sound could not be played. <button type="button" onClick={() => { failedAudio.current.clear(); setAudioError(false); syncAudio(playback.current.time, true); }}>Retry sound</button></p>}
      <nav className="chapter-nav" aria-label="Film chapters">
        {FILM_SCENES.map((scene, index) => <button type="button" className="chapter-button" key={scene.id} aria-current={index === activeScene ? 'step' : undefined} onClick={() => seek(scene.start)} aria-label={`Seek to ${scene.name}, ${formatTime(scene.start)}`}>
          <span>{String(index + 1).padStart(2, '0')}<i>{formatTime(scene.start)}</i></span><strong>{scene.name}</strong>
        </button>)}
      </nav>
      <footer className="film-page-footer">
        <div className="keyboard-hint"><kbd>SPACE</kbd> play / pause <kbd>←</kbd><kbd>→</kbd> skip 5s <kbd>F</kbd> fullscreen</div>
        <div className="film-footer-links"><span>TRAIN. TRACK. EVOLVE.</span><button type="button" onClick={() => { pause(); transcriptRef.current?.showModal(); }}><FileText size={13} aria-hidden="true" /> View transcript</button></div>
      </footer>
      <dialog ref={transcriptRef} className="film-transcript" aria-labelledby="transcript-title" onClick={(event) => { if (event.target === event.currentTarget) transcriptRef.current?.close(); }}>
        <div className="transcript-heading"><h2 id="transcript-title">THE PROGRESSION FILM</h2><button type="button" aria-label="Close transcript" onClick={() => transcriptRef.current?.close()}><X size={19} aria-hidden="true" /></button></div>
        <ol>{FILM_SCENES.map((scene) => <li key={scene.id}><button type="button" onClick={() => { transcriptRef.current?.close(); seek(scene.start); }}><time>{formatTime(scene.start)}</time> {scene.name}<ArrowUpRight size={13} aria-hidden="true" /></button><p>{scene.voiceover.text}</p></li>)}</ol>
      </dialog>
    </div>
  </main>;
}
