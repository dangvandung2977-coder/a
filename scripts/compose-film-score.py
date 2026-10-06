"""Original 120-BPM commercial cue; Python stdlib + FFmpeg. See public/audio/README.md."""

import argparse
from array import array
from bisect import bisect_right
from functools import lru_cache
import hashlib
import json
import math
import os
from pathlib import Path
import random
import re
import subprocess
import sys
import tempfile
import wave

SR, BPM, SECONDS = 44100, 120, 60
AUDIO = Path(__file__).resolve().parents[1] / "public" / "audio"
IMPACT_SHA256 = "32158d26e252f743414ed94b9aa2eb0e1d27db95244e43538632ab1cb39c7fca"
CUTS = (5, 15, 30, 42, 52)
STARTS = (0.15, 6, 16, 30.8, 44.6, 53.1)
BUDGETS = (4.65, 5.5, 8, 7, 6.8, 5)
LINES = (
    "You train hard, but you're not getting stronger. The problem? No structured progression.",
    "Gym Progression calculates your next weight automatically.",
    "Build your workout, choose exercises, sets, reps, and starting weight in seconds.",
    "Stay on schedule with smart rest timers and track every workout automatically.",
    "Hit your reps? Increase the weight. Struggle? Keep it the same. No more guessing.",
    "Start your first workout with Gym Progression today.",
)
VOICE_ID = "TX3LPaxmHKxFdv7VOQHJ"
VOICE_NAME = "Liam - Energetic, Social Media Creator"
MODEL = "eleven_multilingual_v2"
# F# minor/add9, Dmaj9, Aadd9, Eadd9; original voicings and rhythmic motif.
ROOTS = (30, 26, 33, 28)
CHORDS = ((54, 57, 61, 68), (54, 57, 61, 64), (52, 57, 59, 64), (52, 56, 59, 66))
HARMONY = ((0, 0), (4, 1), (8, 2), (12, 3), (15, 0), (18, 1), (22, 2),
           (26, 3), (30, 0), (34, 1), (38, 3), (42, 0), (46, 1), (48, 2),
           (50, 3), (52, 1), (54, 2), (56, 3), (58, 0))


def ffmpeg(*args):
    result = subprocess.run(["ffmpeg", "-hide_banner", "-nostdin", "-nostats", "-y", *map(str, args)],
                            capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stderr.decode(errors="replace")[-3000:])
    return result


def probe(path):
    result = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                             "format=duration,size:stream=codec_name,sample_rate,channels,bit_rate",
                             "-of", "json", str(path)], capture_output=True, check=True)
    return json.loads(result.stdout)


def loudness(path, filters="anull", target=-18):
    result = ffmpeg("-i", path, "-af", f"{filters},loudnorm=I={target}:TP=-2:LRA=9:print_format=json",
                    "-f", "null", "-")
    text = result.stderr.decode()
    return json.loads(text[text.rfind("{"):text.rfind("}") + 1])


def master(source, dest, filters, target, channels):
    measured = loudness(source, filters, target)
    normalizer = (f"loudnorm=I={target}:TP=-2:LRA=9:linear=true:"
                  f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
                  f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
                  f"offset={measured['target_offset']}")
    ffmpeg("-i", source, "-af", f"{filters},{normalizer}", "-ar", SR, "-ac", channels,
           "-c:a", "libmp3lame", "-b:a", "192k" if channels == 2 else "128k",
           "-map_metadata", "-1", dest)


@lru_cache(maxsize=192)
def tone(kind, midi, duration):
    frequency = 440 * 2 ** ((midi - 69) / 12)
    output = array("f")
    for i in range(round(duration * SR)):
        t = i / SR
        p = math.tau * frequency * t
        if kind == "pad":
            env = min(1, t / 0.14, (duration - t) / 0.45)
            signal = (0.65 * math.sin(p) + 0.30 * math.sin(p * 1.003)
                      + 0.13 * math.sin(p * 2) + 0.045 * math.sin(p * 3))
            signal *= 0.88 + 0.12 * math.sin(math.tau * 0.31 * t)
        elif kind == "bass":
            env = min(1, t / 0.006, (duration - t) / 0.035) * math.exp(-t * 1.6)
            signal = math.tanh(math.sin(p) + 0.30 * math.sin(2 * p) + 0.10 * math.sin(3 * p))
        else:
            env = min(1, t / 0.003, (duration - t) / 0.045) * math.exp(-t * 8)
            signal = (math.sin(p) + 0.33 * math.sin(2 * p) * math.exp(-t * 7)
                      + 0.12 * math.sin(3 * p) * math.exp(-t * 12))
        output.append(signal * max(0, env))
    return output


@lru_cache(maxsize=4)
def drum(kind):
    rng = random.Random(120 + ("kick", "clap", "hat", "open").index(kind))
    duration = {"kick": 0.42, "clap": 0.22, "hat": 0.07, "open": 0.24}[kind]
    output, previous = array("f"), 0.0
    for i in range(round(duration * SR)):
        t = i / SR
        noise = rng.uniform(-1, 1)
        high = noise - 0.94 * previous
        previous = noise
        if kind == "kick":
            phase = math.tau * (46 * t + 92 * 0.017 * (1 - math.exp(-t / 0.017)))
            signal = ((math.sin(phase) + 0.10 * math.sin(2 * phase)) * math.exp(-t / 0.125)
                      + 0.075 * high * math.exp(-t / 0.004))
        elif kind == "clap":
            env = sum(math.exp(-(t - offset) * 34) for offset in (0, 0.011, 0.023) if t >= offset)
            signal = high * env * 0.36 + 0.13 * math.sin(math.tau * 185 * t) * math.exp(-t * 30)
        else:
            decay = 0.018 if kind == "hat" else 0.065
            signal = (high * 0.64 + 0.10 * math.sin(math.tau * 8311 * t)) * math.exp(-t / decay)
        output.append(signal * min(1, t / 0.0008, (duration - t) / 0.01))
    return output


def compose():
    # ponytail: an authored 60-second arrangement, not a general sequencer; edit events for new cuts.
    count = SECONDS * SR
    left, right, music_l, music_r = (array("f", [0]) * count for _ in range(4))
    kicks = []

    def mix(sample, start, gain, pan=0, music=False):
        a, b = (music_l, music_r) if music else (left, right)
        gl = gain * math.cos((pan + 1) * math.pi / 4)
        gr = gain * math.sin((pan + 1) * math.pi / 4)
        start = round(start * SR)
        for j in range(min(len(sample), count - start)):
            a[start + j] += sample[j] * gl
            b[start + j] += sample[j] * gr

    def energy(t):
        return (0.53, 0.80, 0.94, 0.72, 1.0, 0.82)[bisect_right(CUTS, t)]

    def chord(t):
        return HARMONY[bisect_right([h[0] for h in HARMONY], t) - 1][1]

    def breath(t):
        return any(cut - 0.26 <= t < cut for cut in CUTS)

    for beat in range(117):
        t = beat * 60 / BPM
        sparse = t < 5 or 30 <= t < 34 or 56 <= t < 58
        if not breath(t) and (not sparse or beat % 2 == 0):
            mix(drum("kick"), t, 0.76 * energy(t))
            kicks.append(t)
        if t >= 5 and t < 58 and beat % 2 == 1 and not breath(t):
            if not (30 <= t < 34) or beat % 4 == 3:
                mix(drum("clap"), t + 0.008, 0.23 * energy(t), -0.08)
                mix(drum("clap"), t + 0.061, 0.037 * energy(t), 0.45)

    for step in range(464):
        t = step / 8
        if t < 3 or breath(t):
            continue
        busy = 15 <= t < 30 or 42 <= t < 52
        if step % 2 == 0 or (busy and step % 8 in (3, 7)):
            opened = step % 4 == 2 and t >= 5
            gain = (0.12 if opened else 0.055) * energy(t)
            mix(drum("open" if opened else "hat"), t + (0.007 if step % 2 else 0),
                gain * (0.72 if step % 2 else 1), 0.36 if step % 4 else -0.36)

    for i, (start, harmony) in enumerate(HARMONY):
        end = HARMONY[i + 1][0] if i + 1 < len(HARMONY) else SECONDS
        for note, pan in zip(CHORDS[harmony], (-0.65, -0.25, 0.25, 0.65)):
            mix(tone("pad", note, end - start + 0.4), start, 0.075 * energy(start), pan, True)

    motif = (0, 2, 1, 3, 2, 0, 3, 1)
    for step in range(232):
        t, slot = step / 4, step % 8
        e, harmony = energy(t), chord(t)
        if breath(t):
            continue
        if slot in (0, 3, 4, 6, 7) and (t >= 5 or slot == 0):
            if not (30 <= t < 34) or slot in (0, 4):
                note = ROOTS[harmony] + (12 if slot == 7 else 0)
                mix(tone("bass", note, 0.20 if slot in (3, 6, 7) else 0.32), t + 0.006,
                    0.36 * e * (0.78 if slot == 7 else 1), music=True)
        audible = ((t < 5 and slot == 4) or (5 <= t < 15 and slot in (0, 2, 3, 6))
                   or 15 <= t < 30 or (30 <= t < 42 and slot in (0, 4))
                   or 42 <= t < 56 or (56 <= t < 58 and slot == 0))
        if audible:
            note = CHORDS[harmony][motif[slot]] + 12
            sample = tone("pluck", note, 0.44)
            gain, pan = 0.115 * e * (1 if slot % 2 == 0 else 0.72), (-0.28 if slot < 4 else 0.28)
            mix(sample, t, gain, pan, True)
            mix(sample, t + 0.375, gain * 0.28, -pan * 2, True)
            mix(sample, t + 0.75, gain * 0.10, pan * 2, True)
            if 42 <= t < 52 and slot in (2, 6):
                mix(tone("pluck", note + 12, 0.30), t + 0.125, gain * 0.42, -pan, True)

    # Musical pickups accelerate into cuts; the supplied impact remains the only sampled SFX.
    for cut in CUTS:
        harmony = chord(cut)
        for j in range(4):
            mix(tone("pluck", CHORDS[harmony][j] + 12, 0.34), cut - 0.5 + j * 0.125,
                0.035 + j * 0.012, (j - 1.5) / 3, True)
        impact = array("f")
        impact.frombytes(ffmpeg("-i", AUDIO / "progression-impact.mp3", "-ar", SR, "-ac", 2,
                                "-f", "f32le", "pipe:1").stdout)
        if sys.byteorder != "little":
            impact.byteswap()
        for j in range(min(len(impact) // 2, count - round(cut * SR))):
            left[round(cut * SR) + j] += impact[2 * j] * 0.16
            right[round(cut * SR) + j] += impact[2 * j + 1] * 0.16

    mix(tone("bass", ROOTS[0], 1.25), 58, 0.26, music=True)
    for j, note in enumerate((66, 69, 73, 80)):
        mix(tone("pluck", note, 0.8), 58 + j * 0.0625, 0.085, (j - 1.5) / 3, True)
    kick_index = 0
    for i in range(count):
        t = i / SR
        while kick_index + 1 < len(kicks) and kicks[kick_index + 1] <= t:
            kick_index += 1
        duck = 1 - 0.65 * math.exp(-(t - kicks[kick_index]) / 0.095)
        fade = min(1, t / 0.025) * math.sin(math.pi / 2 * min(1, (SECONDS - t) / 2)) ** 1.6
        left[i] = (left[i] + music_l[i] * duck) * fade
        right[i] = (right[i] + music_r[i] * duck) * fade
    peak = max(max(map(abs, left)), max(map(abs, right)))
    assert peak > 0.1 and all(math.isfinite(x) for x in (min(left), max(left), min(right), max(right)))
    pcm = array("h", (round(channel[i] * 0.88 / peak * 32767)
                      for i in range(count) for channel in (left, right)))
    if sys.byteorder != "little":
        pcm.byteswap()
    with tempfile.TemporaryDirectory(prefix=".score-", dir=AUDIO) as tmp:
        wav_path = Path(tmp) / "original.wav"
        with wave.open(str(wav_path), "wb") as wav:
            wav.setparams((2, 2, SR, count, "NONE", "not compressed"))
            wav.writeframes(pcm.tobytes())
        master(wav_path, AUDIO / "progression-score.mp3", "highpass=f=25,lowpass=f=17000", -18, 2)
    print("Created progression-score.mp3: 60 seconds, 120 BPM, original arrangement.")


def voiceovers():
    source = AUDIO / "source"
    source.mkdir(exist_ok=True)
    records = []
    for i, (text, budget, start) in enumerate(zip(LINES, BUDGETS, STARTS), 1):
        name = f"voiceover-{i:02d}.mp3"
        raw = source / name
        payload = {"text": text, "model_id": MODEL, "seed": 260610 + i,
                   "voice_settings": {"stability": 0.53, "similarity_boost": 0.78, "style": 0.14,
                                      "use_speaker_boost": True, "speed": 1.2 if i == 1 else 1.08}}
        with tempfile.TemporaryDirectory(prefix=".voice-", dir=AUDIO) as tmp:
            tmp = Path(tmp)
            # ponytail: cache raw takes to avoid repeat API charges; remove one source MP3 to regenerate it.
            if not raw.exists():
                key = os.environ.get("ELEVENLABS_API_KEY")
                if not key:
                    raise RuntimeError("ELEVENLABS_API_KEY is missing; cached raw takes can still be mastered.")
                request, response = tmp / "request.json", tmp / "response.mp3"
                request.write_text(json.dumps(payload), encoding="utf-8")
                result = subprocess.run([
                    "curl.exe", "--silent", "--show-error", "--fail-with-body", "--config", "-",
                    "--max-time", "180", "--request", "POST",
                    f"https://api.elevenlabs.io/v1/text-to-speech/{VOICE_ID}?output_format=mp3_44100_128",
                    "-H", "Content-Type: application/json", "--data-binary", f"@{request}",
                    "--output", str(response)],
                    input=f'header = "xi-api-key: {key}"\n'.encode(), capture_output=True)
                if result.returncode:
                    detail = response.read_text(errors="replace") if response.exists() else ""
                    message = f"ElevenLabs {name}: {result.stderr.decode()} {detail}"
                    raise RuntimeError(message.replace(key, "[redacted]"))
                probe(response)
                response.replace(raw)
            clean = tmp / "clean.wav"
            trim = "silenceremove=start_periods=1:start_duration=0.015:start_threshold=-52dB:start_silence=0.035"
            ffmpeg("-i", raw, "-af", f"highpass=f=75,lowpass=f=15500,{trim},areverse,{trim},areverse",
                   "-ar", SR, "-ac", 1, clean)
            duration = float(probe(clean)["format"]["duration"])
            tempo = max(1, duration / (budget - 0.12))
            filters = (f"atempo={tempo:.8f},acompressor=threshold=0.05:ratio=3:attack=2:release=85:knee=4,"
                       "alimiter=limit=0.12:attack=3:release=60:level=false:latency=true,afade=t=in:d=0.006")
            master(clean, AUDIO / name, filters, -16, 1)
            final_duration = float(probe(AUDIO / name)["format"]["duration"])
            assert final_duration <= budget, (name, final_duration, budget)
            records.append({"file": name, "source": f"source/{name}", "global_start_s": start,
                            "budget_s": budget, "duration_s": final_duration, "atempo": round(tempo, 8),
                            "request": payload})
            print(f"{name}: {final_duration:.3f}s / {budget:.2f}s; atempo {tempo:.3f}", flush=True)
    (source / "voiceover-production.json").write_text(json.dumps({
        "provider": "ElevenLabs", "voice_id": VOICE_ID, "voice_name": VOICE_NAME,
        "voice_category": "premade", "discovery": "GET https://api.elevenlabs.io/v1/voices (public)",
        "output_format": "mp3_44100_128", "takes": records}, indent=2) + "\n", encoding="utf-8")


def verify():
    report = []
    for name in ("progression-score.mp3", *(f"voiceover-{i:02d}.mp3" for i in range(1, 7)),
                 "progression-impact.mp3"):
        path = AUDIO / name
        info, stats = probe(path), loudness(path)
        duration = float(info["format"]["duration"])
        vol = ffmpeg("-i", path, "-af", "volumedetect", "-f", "null", "-").stderr.decode()
        record = {"file": name, "duration_s": duration, "integrated_lufs": float(stats["input_i"]),
                  "true_peak_dbtp": float(stats["input_tp"]), "loudness_range_lu": float(stats["input_lra"]),
                  "sample_peak_dbfs": float(re.search(r"max_volume: ([-\d.]+) dB", vol)[1]),
                  "sha256": hashlib.sha256(path.read_bytes()).hexdigest(), **info["streams"][0]}
        assert record["codec_name"] == "mp3" and int(record["sample_rate"]) == SR
        if name == "progression-score.mp3":
            decoded = ffmpeg("-i", path, "-ar", SR, "-ac", 1, "-f", "s16le", "pipe:1").stdout
            samples = array("h")
            samples.frombytes(decoded)
            if sys.byteorder != "little":
                samples.byteswap()
            assert len(samples) == SECONDS * SR, "Score must decode to exactly 60 seconds."
            rms = lambda a: math.sqrt(sum(v * v for v in a) / len(a))
            assert rms(samples[-SR // 10:]) < rms(samples[-2 * SR:-SR]) * 0.15, "Ending must fade."
            record["decoded_duration_s"] = len(samples) / SR
            record["section_rms_dbfs"] = [round(20 * math.log10(max(rms(samples[a * SR:b * SR]), 1) / 32768), 2)
                                          for a, b in zip((0, *CUTS), (*CUTS, SECONDS))]
            assert max(record["section_rms_dbfs"]) - min(record["section_rms_dbfs"]) > 3, "Section dynamics missing."
            assert record["channels"] == 2 and abs(record["integrated_lufs"] + 18) < 1, record
        elif name.startswith("voiceover"):
            i = int(name[10:12]) - 1
            assert 0.5 < duration <= BUDGETS[i]
            assert STARTS[i] + duration < (STARTS[i + 1] if i < 5 else SECONDS)
            assert record["channels"] == 1 and abs(record["integrated_lufs"] + 16) < 1, record
        else:
            assert record["sha256"] == IMPACT_SHA256, "The supplied impact must remain byte-for-byte unchanged."
        if name != "progression-impact.mp3":
            assert record["true_peak_dbtp"] <= -1, f"Insufficient MP3 peak headroom: {name}"
        report.append(record)
    (AUDIO / "verification.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--tts", action="store_true", help="Generate/cache and master six ElevenLabs voiceovers.")
    parser.add_argument("--check", action="store_true", help="Verify all delivered audio without API calls.")
    args = parser.parse_args()
    if args.check:
        verify()
    elif args.tts:
        voiceovers()
    else:
        compose()
