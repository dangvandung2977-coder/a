import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = fs.readFileSync(new URL('../lib/motion-film.ts', import.meta.url), 'utf8');
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
const context = { exports: {} };
vm.runInNewContext(outputText, context);
const { FILM_SCENES, FILM_DURATION, CAPTIONS, clampTime, frameAt, sceneAt, restSecondsAt, captionAt, formatTime } = context.exports;

test('six scenes cover exactly sixty seconds without gaps or overlaps', () => {
  assert.equal(FILM_DURATION, 60);
  assert.deepEqual(Array.from(FILM_SCENES, (s) => s.start), [0, 5, 15, 30, 42, 52]);
  FILM_SCENES.forEach((scene, i) => {
    assert.equal(scene.end, FILM_SCENES[i + 1]?.start ?? 60);
    assert.equal(sceneAt(scene.start), i);
    assert.equal(sceneAt(scene.end - .001), i);
    assert.ok(scene.voiceover.start >= scene.start && scene.voiceover.start < scene.end);
    assert.ok(fs.existsSync(new URL(`../public${scene.voiceover.src}`, import.meta.url)));
  });
  assert.equal(sceneAt(60), 5);
  assert.equal(formatTime(60), '01:00');
});

test('direct and reverse seeks produce the same complete frame state', () => {
  const direct = JSON.stringify(frameAt(47));
  for (const time of [60, 0, 23.5, 42, 18, 58, 4, 39]) frameAt(time);
  assert.equal(JSON.stringify(frameAt(47)), direct);
  assert.equal(frameAt(47).scene, 4);
  assert.equal(frameAt(47).weight, 25);
  assert.equal(frameAt(47).strength, 25);
  assert.equal(frameAt(23).workoutName, 'CHEST — SHOULDERS — TRICEPS');
  assert.equal(frameAt(23).sets, 4);
  assert.equal(frameAt(23).startingWeight, 20);
  assert.equal(frameAt(19.3).search, 'Bench Press');
  assert.equal(frameAt(24.25).selectedExercise, 'Triceps Extension');
  assert.equal(frameAt(17).workoutName, '');
});

test('rest timer shows real opening seconds then a bounded compressed countdown', () => {
  assert.equal(restSecondsAt(33), 90);
  assert.equal(restSecondsAt(34), 89);
  assert.equal(restSecondsAt(35), 88);
  assert.equal(restSecondsAt(37.5), 3);
  assert.equal(restSecondsAt(38.5), 0);
  let previous = 90;
  for (let frame = 0; frame <= 60 * 60; frame++) {
    const remaining = restSecondsAt(frame / 60);
    assert.ok(remaining >= 0 && remaining <= previous);
    previous = remaining;
  }
});

test('weight progression remains monotonic and holds its final milestone', () => {
  let previous = 20;
  for (let frame = 42 * 60; frame <= 52 * 60; frame++) {
    const { weight, strength } = frameAt(frame / 60);
    assert.ok(weight >= previous && weight <= 25);
    assert.ok(strength >= 0 && strength <= 25);
    previous = weight;
  }
  assert.equal(frameAt(44.75).weight, 22.5);
  assert.equal(frameAt(46.75).weight, 25);
});

test('captions are non-overlapping, bounded and correct after seeking', () => {
  CAPTIONS.forEach((caption, i) => {
    assert.ok(caption.start < caption.end && caption.start >= 0 && caption.end <= 60);
    if (i) assert.ok(caption.start >= CAPTIONS[i - 1].end);
    assert.equal(captionAt(caption.start), caption.text);
  });
  assert.equal(captionAt(59), '');
  assert.equal(captionAt(47), FILM_SCENES[4].voiceover.text);
  assert.equal(captionAt(50), '');
});

test('transport sanitizes invalid and out-of-range seek values', () => {
  assert.equal(clampTime(-100), 0);
  assert.equal(clampTime(200), 60);
  assert.equal(clampTime(NaN), 0);
  assert.equal(clampTime(Infinity), 0);
  assert.equal(clampTime(47.25), 47.25);
});

test('captions cover the recorded voiceovers without trailing into later edits', () => {
  const audio = JSON.parse(fs.readFileSync(new URL('../public/audio/verification.json', import.meta.url), 'utf8'));
  FILM_SCENES.forEach((scene) => {
    const recording = audio.find((file) => scene.voiceover.src.endsWith(file.file));
    assert.ok(recording);
    assert.equal(scene.captions[0].start, scene.voiceover.start);
    const captionEnd = scene.captions.at(-1).end;
    const voiceEnd = scene.voiceover.start + recording.duration_s;
    assert.ok(captionEnd >= voiceEnd && captionEnd - voiceEnd < .15);
    assert.ok(voiceEnd < scene.end);
  });
});
