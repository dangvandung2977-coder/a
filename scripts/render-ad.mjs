import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const AUDIO = join(ROOT, 'public', 'audio');
const OUTPUT = join(ROOT, 'public', 'videos');
const FPS = 30;
const DURATION = 30;
const FORMATS = [{ name: 'portrait', width: 1080, height: 1920 }, { name: 'landscape', width: 1920, height: 1080 }];

// The ad is an authored edit of the existing, seekable GSAP film, not a second product demo.
const CUTS = [
  { start: 0, end: 4.5, from: .25, to: 4.65, voice: .15, text: "You train hard, but you're not getting stronger. The problem? No structured progression." },
  { start: 4.5, end: 9, from: 7.95, to: 13.95, voice: 4.8, text: 'Gym Progression calculates your next weight automatically.' },
  { start: 9, end: 15, from: 17.05, to: 29.25, voice: 9.3, text: 'Build your workout, choose exercises, sets, reps, and starting weight in seconds.' },
  { start: 15, end: 20, from: 30.12, to: 41.7, voice: 15.3, text: 'Stay on schedule with smart rest timers and track every workout automatically.' },
  { start: 20, end: 25.5, from: 42.1, to: 51.4, voice: 20.4, text: 'Hit your reps? Increase the weight. Struggle? Keep it the same. No more guessing.' },
  { start: 25.5, end: 30, from: 52.35, to: 59.9, voice: 26, text: 'Start your first workout with Gym Progression today.' },
];

function frameAt(value) {
  const time = Number.isFinite(value) ? Math.max(0, Math.min(DURATION, value)) : 0;
  const index = CUTS.findIndex((cut) => time < cut.end || cut.end === DURATION);
  const cut = CUTS[index];
  const progress = (time - cut.start) / (cut.end - cut.start);
  return { time, index, progress, source: cut.from + (cut.to - cut.from) * progress };
}

function run(command, args) {
  const result = spawnSync(command, args.map(String), { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, windowsHide: true });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${command}: ${result.stderr.slice(-4000)}`);
  return result;
}

const ffmpeg = (...args) => run('ffmpeg', ['-hide_banner', '-nostdin', '-nostats', '-y', ...args]);
const probe = (path) => JSON.parse(run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', path]).stdout);
const voiceFile = (index) => join(AUDIO, `voiceover-${String(index + 1).padStart(2, '0')}.mp3`);
const stem = (format) => `gym-progression-ad-${format.name}`;

function checkEdit() {
  assert.equal(CUTS[0].start, 0);
  assert.equal(CUTS.at(-1).end, DURATION);
  CUTS.forEach((cut, index) => {
    const duration = Number(probe(voiceFile(index)).format.duration);
    assert.equal(cut.end, CUTS[index + 1]?.start ?? DURATION);
    assert.ok(cut.from >= 0 && cut.to <= 60 && cut.to > cut.from);
    assert.ok(cut.voice >= cut.start && cut.voice + duration < cut.end, `Narration crosses cut ${index + 1}`);
    assert.equal(frameAt(cut.start).index, index);
    assert.equal(frameAt(cut.end - 1 / FPS).index, index);
  });
  assert.equal(frameAt(-1).time, 0);
  assert.equal(frameAt(NaN).time, 0);
  assert.equal(frameAt(31).time, DURATION);
  let previous = -1;
  for (let frame = 0; frame < FPS * DURATION; frame++) {
    const source = frameAt(frame / FPS).source;
    assert.ok(source > previous && source < 60, `Non-monotonic source frame ${frame}`);
    previous = source;
  }
}

function captions() {
  return CUTS.map((cut, index) => ({ start: cut.voice, end: Math.min(cut.end - .15, cut.voice + Number(probe(voiceFile(index)).format.duration)), text: cut.text }));
}

function mixAudio(scratch) {
  const input = ['-i', join(AUDIO, 'progression-score.mp3')];
  CUTS.forEach((_, index) => input.push('-i', voiceFile(index)));
  input.push('-i', join(AUDIO, 'ad-transition.mp3'));
  const filters = [
    '[0:a]atrim=start=30:end=60,asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.7[bed]',
    ...CUTS.map((cut, index) => `[${index + 1}:a]aformat=sample_rates=48000:channel_layouts=stereo,adelay=${Math.round(cut.voice * 1000)}:all=1[v${index}]`),
    `${CUTS.map((_, index) => `[v${index}]`).join('')}amix=inputs=6:normalize=0,apad=whole_dur=30,atrim=duration=30,asplit=2[voice][sidechain]`,
    '[bed][sidechain]sidechaincompress=threshold=0.025:ratio=5:attack=10:release=220[ducked]',
    '[7:a]aformat=sample_rates=48000:channel_layouts=stereo,volume=0.15,asplit=5[s0][s1][s2][s3][s4]',
    ...CUTS.slice(1).map((cut, index) => `[s${index}]adelay=${Math.round((cut.start - .24) * 1000)}:all=1[fx${index}]`),
    '[ducked][voice][fx0][fx1][fx2][fx3][fx4]amix=inputs=7:normalize=0,atrim=duration=30,afade=t=in:d=0.025,afade=t=out:st=29:d=1[mix]',
  ];
  const raw = join(scratch, 'mix.wav');
  const master = join(scratch, 'master.wav');
  ffmpeg(...input, '-filter_complex', filters.join(';'), '-map', '[mix]', '-ar', 48000, '-ac', 2, '-c:a', 'pcm_f32le', raw);
  const analysis = ffmpeg('-i', raw, '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-').stderr;
  const measured = JSON.parse(analysis.slice(analysis.lastIndexOf('{'), analysis.lastIndexOf('}') + 1));
  const normalization = `loudnorm=I=-16:TP=-1.5:LRA=9:linear=true:measured_I=${measured.input_i}:measured_TP=${measured.input_tp}:measured_LRA=${measured.input_lra}:measured_thresh=${measured.input_thresh}:offset=${measured.target_offset}`;
  ffmpeg('-i', raw, '-af', normalization, '-ar', 48000, '-ac', 2, '-c:a', 'pcm_s24le', master);
  return master;
}

async function preparePage(browser, format) {
  const page = await browser.newPage({ viewport: { width: format.width, height: format.height }, deviceScaleFactor: 1, reducedMotion: 'no-preference' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.FILM_URL || 'http://localhost:3100', { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('.film-stage[data-time]');
  if (format.name === 'portrait') await page.getByRole('button', { name: 'Portrait 9:16', exact: true }).click();
  await page.addStyleTag({ content: readFileSync(join(ROOT, 'scripts', 'ad-export.css'), 'utf8') });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(['/images/gym-interior.webp', '/images/gym-interior-mobile.webp', '/images/gym-weights.webp', '/images/gym-weights-mobile.webp'].map((src) => {
      const image = new Image();
      image.src = src;
      return image.decode();
    }));
    const input = document.querySelector('.film-seek');
    input.step = 'any';
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, '0.25');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await page.waitForSelector('.film-poster', { state: 'detached' });
  await page.waitForFunction(({ width, height }) => {
    const box = document.querySelector('.film-viewport').getBoundingClientRect();
    return Math.abs(box.width - width) < 1 && Math.abs(box.height - height) < 1;
  }, format);
  await page.evaluate(() => {
    const stage = document.querySelector('.film-stage');
    stage.classList.add('ad-artboard');
    for (const name of ['ad-caption', 'ad-wipe', 'ad-edge']) {
      const element = document.createElement('div');
      element.className = name;
      stage.append(element);
    }
    const badge = document.querySelector('.strength-badge');
    for (const node of badge.childNodes) if (node.nodeType === Node.TEXT_NODE) node.textContent = node.textContent.replace('STRENGTH', 'WORKING WEIGHT');
  });
  return { page, errors };
}

async function draw(page, seconds, cues, poster = false) {
  const frame = frameAt(seconds);
  const caption = poster ? '' : cues.find((cue) => seconds >= cue.start && seconds < cue.end);
  const cut = CUTS.slice(1).find((item) => Math.abs(seconds - item.start) < .24);
  await page.evaluate(({ frame, caption, wipe }) => {
    const input = document.querySelector('.film-seek');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, String(frame.source));
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const subtitle = document.querySelector('.ad-caption');
    subtitle.textContent = caption?.text || '';
    const arrival = caption ? Math.min(1, (frame.time - caption.start) / .18) : 0;
    subtitle.style.opacity = String(arrival);
    subtitle.style.transform = `translateY(${(1 - arrival) * 15}px)`;
    const blade = document.querySelector('.ad-wipe');
    blade.style.visibility = wipe === null ? 'hidden' : 'visible';
    blade.style.transform = `translateX(${((wipe ?? 0) - .5) * 260}%) skewX(-14deg)`;
    document.querySelector('.ad-edge').style.transform = `scaleX(${frame.time / 30})`;
    document.querySelector('.film-scenes').style.transform = `scale(${1 + frame.progress * .014})`;
  }, { frame, caption, wipe: cut ? (seconds - cut.start + .24) / .48 : null });
  await page.waitForFunction((time) => Math.abs(Number(document.querySelector('.film-stage').dataset.time) - time) < .002, frame.source);
}

async function render(browser, format, scratch, audio, cues, preview) {
  const { page, errors } = await preparePage(browser, format);
  const frames = join(scratch, format.name);
  mkdirSync(frames);
  const times = preview ? [2.7, 7, 12.5, 17.5, 23.5, 28.5] : Array.from({ length: FPS * DURATION }, (_, frame) => frame / FPS);
  try {
    for (const [index, seconds] of times.entries()) {
      await draw(page, seconds, cues);
      await page.screenshot({ path: join(frames, `${String(index).padStart(5, '0')}.jpg`), type: 'jpeg', quality: 96 });
      if (!preview && index % 150 === 0) console.log(`${format.name}: ${index / FPS}s / ${DURATION}s captured`);
    }
    assert.deepEqual(errors, [], 'Browser errors during frame capture');
    if (preview) {
      ffmpeg('-framerate', 1, '-i', join(frames, '%05d.jpg'), '-vf', `scale=${format.name === 'portrait' ? 450 : 640}:-1,tile=3x2:padding=12:margin=12:color=0x202024`, '-frames:v', 1, join(scratch, `${format.name}-contact.jpg`));
      return;
    }
    await draw(page, 2.7, cues, true);
    await page.screenshot({ path: join(OUTPUT, `${stem(format)}.jpg`), type: 'jpeg', quality: 96 });
    ffmpeg('-framerate', FPS, '-i', join(frames, '%05d.jpg'), '-i', audio, '-map', '0:v:0', '-map', '1:a:0', '-t', DURATION,
      '-c:v', 'libx264', '-preset', 'medium', '-crf', 18, '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-level:v', '4.1',
      '-vf', 'scale=in_range=full:out_range=limited:out_color_matrix=bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      '-c:a', 'aac', '-b:a', '192k', '-ar', 48000, '-ac', 2, '-movflags', '+faststart', '-map_metadata', '-1', join(OUTPUT, `${stem(format)}.mp4`));
    rmSync(frames, { recursive: true });
    console.log(`Exported ${stem(format)}.mp4`);
  } finally {
    await page.close();
  }
}

function checkExports() {
  const results = FORMATS.map((format) => {
    const path = join(OUTPUT, `${stem(format)}.mp4`);
    const info = probe(path);
    const video = info.streams.find((stream) => stream.codec_type === 'video');
    const audio = info.streams.find((stream) => stream.codec_type === 'audio');
    assert.equal(video?.codec_name, 'h264');
    assert.equal(video.width, format.width);
    assert.equal(video.height, format.height);
    assert.equal(video.pix_fmt, 'yuv420p');
    assert.equal(video.avg_frame_rate, '30/1');
    assert.equal(Number(video.nb_frames), FPS * DURATION);
    assert.equal(audio?.codec_name, 'aac');
    assert.equal(audio.channels, 2);
    assert.equal(Number(audio.sample_rate), 48000);
    assert.ok(Math.abs(Number(info.format.duration) - DURATION) < .05);
    ffmpeg('-v', 'error', '-xerror', '-i', path, '-f', 'null', '-');
    const analysis = ffmpeg('-i', path, '-vn', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=9:print_format=json', '-f', 'null', '-').stderr;
    const levels = JSON.parse(analysis.slice(analysis.lastIndexOf('{'), analysis.lastIndexOf('}') + 1));
    assert.ok(Number(levels.input_tp) <= -1, `Audio peak exceeds -1 dBTP: ${levels.input_tp}`);
    assert.ok(Math.abs(Number(levels.input_i) + 16) < 1, `Audio loudness is ${levels.input_i} LUFS`);
    const bytes = readFileSync(path);
    assert.ok(bytes.indexOf('moov') > 0 && bytes.indexOf('moov') < bytes.indexOf('mdat'), 'MP4 must support fast-start playback');
    return { file: `${stem(format)}.mp4`, width: video.width, height: video.height, fps: 30, frames: Number(video.nb_frames), duration: Number(info.format.duration), bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex'), loudness_lufs: Number(levels.input_i), true_peak_dbtp: Number(levels.input_tp) };
  });
  writeFileSync(join(OUTPUT, 'verification.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
}

async function main() {
  checkEdit();
  if (process.argv.includes('--check')) return checkExports();
  const require = createRequire(import.meta.url);
  const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
  const preview = process.argv.includes('--preview');
  const tempRoot = process.env.LOCALAPPDATA ? join(process.env.LOCALAPPDATA, 'Temp', 'opencode') : process.env.TMPDIR;
  assert.ok(tempRoot, 'Set TMPDIR to a scratch directory.');
  mkdirSync(tempRoot, { recursive: true });
  mkdirSync(OUTPUT, { recursive: true });
  const scratch = mkdtempSync(join(tempRoot, 'gym-ad-'));
  const cues = captions();
  const audio = preview ? null : mixAudio(scratch);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const format of FORMATS) await render(browser, format, scratch, audio, cues, preview);
  } finally {
    await browser.close();
  }
  if (preview) return console.log(`Preview sheets: ${scratch}`);
  const timestamp = (seconds) => new Date(seconds * 1000).toISOString().slice(11, 23);
  writeFileSync(join(OUTPUT, 'gym-progression-ad.en.vtt'), `WEBVTT\n\n${cues.map((cue) => `${timestamp(cue.start)} --> ${timestamp(cue.end)}\n${cue.text}\n`).join('\n')}`);
  checkExports();
  rmSync(scratch, { recursive: true });
}

await main().catch((error) => { console.error(error); process.exitCode = 1; });
