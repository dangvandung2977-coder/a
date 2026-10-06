# Gym Progression commercial audio

Audio for the 60-second film. Narration is delivered separately from the music.

## Files and provenance

- `progression-score.mp3`: original, lyric-free 120-BPM electronic composition, authored in `scripts/compose-film-score.py`. All drums, sub-bass, harmonic pads, arpeggios, and musical pickups are synthesized with Python's standard library. No commercial music, third-party loops, artist imitation, or copied melody is used.
- `progression-impact.mp3`: a newly generated ElevenLabs custom sound effect. Prompt: “A premium fitness technology commercial transition: a tight cinematic sub bass impact followed by a fast clean airy whoosh, tactile metallic detail, powerful controlled energy, no voice, no melody, no distortion, short clean tail.” Generated with `eleven_text_to_sound_v2`, 1.4-second request, prompt influence 0.65. SHA-256: `32158d26e252f743414ed94b9aa2eb0e1d27db95244e43538632ab1cb39c7fca`.
- `voiceover-01.mp3` through `voiceover-06.mp3`: ElevenLabs TTS using the public, premade male voice **Liam - Energetic, Social Media Creator**, ID `TX3LPaxmHKxFdv7VOQHJ`, and `eleven_multilingual_v2`. No voice cloning. The built-in voice was discovered through the read-only public `GET https://api.elevenlabs.io/v1/voices` catalog.
- `source/voiceover-*.mp3`: retained original API takes, before silence trimming, timing adjustment, and mastering.
- `source/voiceover-production.json`: exact spoken text, synthesis settings/seeds, voice identity, timing budgets, actual durations, and local `atempo` factors.
- `verification.json`: measured durations, formats, SHA-256 hashes, integrated loudness, sample peaks, true peaks, and score section levels. Created by the runnable check below.

## Original arrangement

The cue runs at 120 BPM in 4/4, with F-sharp minor/add9, Dmaj9, Aadd9, and Eadd9 harmony. The sub-bass stays centered; high-frequency percussion and delayed plucks create stereo width.

| Film time | Arrangement |
| --- | --- |
| 0–5s | Restrained, half-density kick and bass; harmonic tension and sparse synth notes |
| 5–15s | Four-on-the-floor groove, offbeat hats, clap, and syncopated bass |
| 15–30s | Fuller arpeggios, brighter percussion, changing harmony |
| 30–42s | Reduced arrangement and half-time opening; space around the explanation |
| 42–52s | Peak energy, upper-register answering notes and denser hats |
| 52–60s | Closing harmonic turn, rhythmic reduction, final chord at 58s, two-second shaped fade |

The existing impact is mixed at **5, 15, 30, 42, and 52 seconds**, with a linear input gain of **0.16** (−15.9 dB) before score mastering. Brief musical pickups lead into those cuts. Kick-triggered gain reduction gives the bass and synths room to breathe.

## Narration schedule

Start each file at the following **global film time**, not consecutively. The full supplied copy is retained; pitch-preserving `atempo` is applied only when needed to meet the budget.

| File | Start | Verified duration | Maximum duration | Copy |
| --- | ---: | ---: | ---: | --- |
| `voiceover-01.mp3` | 0.15s | 3.964s | 4.65s | You train hard, but you're not getting stronger. The problem? No structured progression. |
| `voiceover-02.mp3` | 6.00s | 2.792s | 5.50s | Gym Progression calculates your next weight automatically. |
| `voiceover-03.mp3` | 16.00s | 4.845s | 8.00s | Build your workout, choose exercises, sets, reps, and starting weight in seconds. |
| `voiceover-04.mp3` | 30.80s | 4.020s | 7.00s | Stay on schedule with smart rest timers and track every workout automatically. |
| `voiceover-05.mp3` | 44.60s | 4.428s | 6.80s | Hit your reps? Increase the weight. Struggle? Keep it the same. No more guessing. |
| `voiceover-06.mp3` | 53.10s | 2.461s | 5.00s | Start your first workout with Gym Progression today. |

All six generated takes already fit their budgets; their recorded local `atempo` factor is 1.0.

Final cue positions and captions live in `lib/motion-film.ts`. The fifth cue was moved to 44.6s during the edit to let the graph establish itself before the progression rules. Captions cover the complete spoken line and end within 150ms of the measured recording. Raw production metadata retains the original recording brief.

For integration, a useful starting point is music gain around **0.4 under narration**, with smooth increases in the gaps. The score itself contains no narration.

## Format and mastering

- Score: MP3, **44.1 kHz, 192 kb/s, stereo**, target −18 LUFS integrated.
- Mastered voiceovers: MP3, **44.1 kHz, 128 kb/s, mono**, target −16 LUFS integrated.
- Supplied impact: MP3, **44.1 kHz, stereo**, retained at its original encoding.
- Local masters use two-pass FFmpeg loudness normalization with a −2 dBTP ceiling; the verification requires the decoded MP3 masters to stay at or below −1 dBTP.
- Score PCM duration is exactly **60.000 seconds**. MP3 container duration includes a small encoder/frame-padding allowance; the check separately verifies decoded sample count.
- Voiceover processing removes only edge silence, high-passes at 75 Hz, low-passes at 15.5 kHz, and preserves sentence pauses. A 3:1 compressor and a short lookahead limiter control peaks before loudness matching. The first line has the densest required delivery.

Verified master measurements: score **60.000s, −18.27 LUFS, −2.79 dBTP**, with a **5.0 LU** loudness range; narration **−16.40 to −16.44 LUFS**, highest true peak **−2.43 dBTP**. The unmodified impact source measures **1.360s, −11.53 LUFS, +0.80 dBTP**; its attenuated contribution is included in the verified score master. All duration, decoding, fade, dynamics, non-overlap, format, master-headroom, and source-preservation assertions pass.

## Regeneration

Requirements: Python 3.10+, `ffmpeg`, `ffprobe`; `curl.exe` and `ELEVENLABS_API_KEY` in the process environment for new TTS takes. No Python packages are required.

From the project root:

```powershell
# Rebuild the original score from synthesis and the existing impact.
python scripts/compose-film-score.py

# Generate missing TTS takes through curl.exe, then master all six.
python scripts/compose-film-score.py --tts

# Check every final file; write public/audio/verification.json. No API calls.
python scripts/compose-film-score.py --check
```

Raw takes are cached to avoid repeat API charges. To intentionally regenerate a particular line, remove only its `public/audio/source/voiceover-XX.mp3`, then run `--tts`. Existing raw takes allow local remastering without an API key. The API credential is supplied through curl's stdin configuration and is never written into request files or metadata.

The score is deterministic for the same source impact and Python/FFmpeg versions. Remote TTS can change with the provider's model, despite the recorded seed; the retained raw takes make local remastering repeatable. Checks cover decoding, timing, non-overlap, section dynamics, ending fade, loudness, peak headroom, and preservation of the supplied impact. They do not replace a listening pass in the final film mix.

## 30-second ad transition

`ad-transition.mp3` is a separate ElevenLabs `eleven_text_to_sound_v2` effect generated for the short ad: an accelerating stereo whoosh landing on a tight bass punch and tactile snap. The exact 0.9-second request is retained in `source/ad-transition-request.json`. It is mixed at an input gain of 0.15 around the five ad cuts; the complete mix receives separate loudness and peak normalization. The original 60-second score and narration files are reused without overwriting them. See `public/videos/README.md` for the ad exports and reproducible checks.
