# Gym Progression — 30-second ad

Watch and download both cuts at `/ads`.

| File | Canvas | Use |
| --- | --- | --- |
| `gym-progression-ad-portrait.mp4` | 1080 × 1920, 9:16 | Reels, Stories, Shorts |
| `gym-progression-ad-landscape.mp4` | 1920 × 1080, 16:9 | YouTube, websites, presentations |

Both exports are 30 seconds / 900 frames, H.264 at 30 fps, YUV 4:2:0, BT.709, with fast-start MP4 and 48-kHz stereo AAC. English narration captions are burned into the picture; `gym-progression-ad.en.vtt` is also available. Matching JPG files are preview posters.

## Edit and sound

The cut uses the existing GSAP product film in `components/motion/`, with an authored edit in `scripts/render-ad.mjs`: hook (0–4.5s), product (4.5–9s), workout builder (9–15s), active workout (15–20s), progression (20–25.5s), and call to action (25.5–30s).

`scripts/ad-export.css` supplies capture-only framing, portrait safe margins, caption placement, camera pushes, and lime wipe transitions. The 60-second interactive film retains its own styling and timing. The numeric progression is a product demonstration; the ad labels the increase as working weight.

The ad reuses the original narration and the final 30 seconds of the original score, with music ducking under speech. The new ElevenLabs sound `public/audio/ad-transition.mp3` accents each cut. The final mix is normalized to −16 LUFS with a −1.5 dBTP target before AAC encoding. Source audio provenance is in `public/audio/README.md`.

## Re-render and verify

Requirements: a running app, Chrome, an existing Playwright installation, `ffmpeg`, and `ffprobe`. No new application dependency is required. Set `PLAYWRIGHT_MODULE` to the installed Playwright package path if it is outside this project. `FILM_URL` defaults to `http://localhost:3100`.

```powershell
# Check the edit and capture six review frames per format.
node scripts/render-ad.mjs --preview

# Render both MP4s, posters, captions, and verification measurements.
node scripts/render-ad.mjs

# Independently re-check existing exports; no browser or API calls.
node scripts/render-ad.mjs --check
```

The check asserts narration fits each cut, source timing is monotonic, both videos contain exactly 900 frames with the expected codecs and dimensions, decoding succeeds, audio remains within 1 LU of −16 LUFS and below −1 dBTP, and the MP4 metadata supports fast-start playback. Results and SHA-256 hashes are recorded in `verification.json`.

Frames and WAV intermediates are created in a unique scratch directory and cleaned after successful rendering. A failed render retains its scratch files for diagnosis. Re-rendering uses the retained audio and makes no paid API calls.
