---
name: App Image
description: Generate an image for the app via gpt-image-2.5-sunburst and save it to public/. Use when user needs an illustration, hero, icon, or any picture added to the app.
---

## Workflow

1. Derive a short English prompt from what the user asks for. Default square: `1024x1024`.
2. Pick output path under `public/`, e.g. `public/hero.png`. Reuse existing file if it already fits.
3. Run (key comes from env, never paste it in chat):
   `IMAGE_API_KEY=$env:IMAGE_API_KEY node .opencode/skills/app-image/scripts/gen-image.mjs --prompt "<prompt>" --out "<path>" [--size 1024x1024]`
4. Reference it in code as `/<path-without-public-prefix>` and verify with `node --check` / build.

Env: `IMAGE_API_KEY` required, `IMAGE_BASE_URL` defaults to `https://hhtechapi.net/v1`, model defaults to `gpt-image-2.5-sunburst`.
