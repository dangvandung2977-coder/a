#!/usr/bin/env node
// Usage: node gen-image.mjs --prompt "..." --out public/hero.png [--size 1024x1024] [--model gpt-image-2.5-sunburst]
// Env: IMAGE_API_KEY (required), IMAGE_BASE_URL (default https://hhtechapi.net/v1)
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname } from "node:path";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, arr) => {
    if (v.startsWith("--")) a.push([v.slice(2), arr[i + 1]]);
    return a;
  }, [])
);
const prompt = args.prompt;
const out = args.out || "public/ai.png";
const size = args.size || "1024x1024";
const model = args.model || "gpt-image-2.5-sunburst";
const base = (process.env.IMAGE_BASE_URL || process.env.HAMTER_BASE_URL || "https://hhtechapi.net/v1").replace(/\/$/, "");
const key = process.env.IMAGE_API_KEY || process.env.HAMTER_IMAGE_API_KEY;
if (!prompt) { console.error('missing --prompt "..."'); process.exit(1); }
if (!key) { console.error("missing env IMAGE_API_KEY"); process.exit(1); }

const r = await fetch(`${base}/images/generations`, {
  method: "POST",
  headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
  body: JSON.stringify({ model, prompt, size }),
});
const t = await r.text();
if (!r.ok) { console.error(`HTTP ${r.status}: ${t.slice(0, 500)}`); process.exit(1); }
const j = JSON.parse(t);
const d = j?.data?.[0];
if (!d) { console.error("no data[0]: " + t.slice(0, 500)); process.exit(1); }
mkdirSync(dirname(out), { recursive: true });
if (d.b64_json) writeFileSync(out, Buffer.from(d.b64_json, "base64"));
else if (d.url) {
  const img = await fetch(d.url);
  writeFileSync(out, Buffer.from(await img.arrayBuffer()));
} else { console.error("no b64_json/url: " + t.slice(0, 500)); process.exit(1); }
console.log(out);
