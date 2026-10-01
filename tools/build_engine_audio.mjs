// Renders public/audio/merani-engine.mp3, the sound of the opening scene:
// start-up, two throttle blips, a full pull to the limiter, then it settles.
//
// Everything in it is a real recording: a Mercedes-AMG C63 (M156 6.2 V8) by
// Pole Position Production from the free Sonniss #GameAudioGDC 2020 bundle
// (royalty-free, commercial use allowed, no attribution required;
// https://sonniss.com/gdc-bundle-license/). Only the recorded parts of the
// processed sprite are used (start-up, idle, full-load and overrun loops from
// 3,700 rpm up); the rpm sweep is made by resampling those loops.
//
//   node tools/build_engine_audio.mjs <sprite.m4a> <sprite.json>
// Needs ffmpeg. The sprite is static/sounds/race/amg-c63-507.{m4a,json} in
// github.com/yassinsolim/personal-portfolio.

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BEATS, engineAt as at } from '../src/engine-timeline.js';

const [spritePath, mapPath] = process.argv.slice(2);
const out = fileURLToPath(new URL('../public/audio/merani-engine.mp3', import.meta.url));
const SR = 48000;

const tmp = mkdtempSync(join(tmpdir(), 'engine-'));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', spritePath, '-ac', '1', '-ar', String(SR), '-f', 'f32le', join(tmp, 'src.f32')]);
const buf = readFileSync(join(tmp, 'src.f32'));
const src = new Float32Array(buf.buffer, buf.byteOffset, buf.length / 4);
const map = JSON.parse(readFileSync(mapPath, 'utf8'));

const RECORDED_FROM = 3600; // loops below this (except idle) are synthesized in the sprite
const clip = (l) => ({ rpm: l.rpm, gain: 10 ** ((l.db || 0) / 20), data: src.subarray(Math.round(l.start * SR), Math.round((l.start + l.dur) * SR)) });
const idle = clip(map.loops.find((l) => l.kind === 'idle'));
const onLoops = [idle, ...map.loops.filter((l) => l.kind === 'on' && l.rpm >= RECORDED_FROM).map(clip)].sort((a, b) => a.rpm - b.rpm);
const offLoops = [idle, ...map.loops.filter((l) => l.kind === 'off' && l.rpm >= RECORDED_FROM).map(clip)].sort((a, b) => a.rpm - b.rpm);
const startShot = map.shots.find((s) => s.kind === 'start');
const start = src.subarray(Math.round(startShot.start * SR), Math.round((startShot.start + startShot.dur) * SR));

// ---------------------------------------------------------------- render
const total = BEATS.end;
const T0 = BEATS.idle;
const N = Math.round(total * SR);
const mix = new Float32Array(N);
const phases = new Map();
function readLoop(l, rate) {
  let p = phases.get(l) || 0;
  const d = l.data, n = d.length;
  const i = Math.floor(p), f = p - i;
  const v = d[i % n] * (1 - f) + d[(i + 1) % n] * f;
  p += rate;
  if (p >= n) p -= n;
  phases.set(l, p);
  return v * l.gain;
}
function blend(set, rpm) {
  // the two loops either side of rpm, equal-power crossfade, each resampled to rpm
  let hi = set.findIndex((l) => l.rpm >= rpm);
  if (hi === -1) hi = set.length - 1;
  const lo = Math.max(0, hi - 1);
  const a = set[lo], b = set[hi];
  const x = a === b ? 1 : Math.min(1, Math.max(0, (rpm - a.rpm) / (b.rpm - a.rpm)));
  let v = 0;
  for (const l of set) {
    const w = a === b ? (l === a ? 1 : 0) : l === a ? Math.cos(x * Math.PI / 2) : l === b ? Math.sin(x * Math.PI / 2) : 0;
    const s = readLoop(l, Math.min(2.2, rpm / l.rpm)); // keep every loop's phase running
    v += s * w;
  }
  return v;
}
let thr = 0;
for (let n = 0; n < N; n++) {
  const t = n / SR;
  const [rpm, target] = at(t);
  thr += (target - thr) * (1 - Math.exp(-1 / (SR * 0.025)));
  const on = blend(onLoops, rpm), off = blend(offLoops, rpm);
  const r = Math.min(1, Math.max(0, (rpm - 1100) / 5800));
  const load = (0.3 + 0.7 * r ** 1.3) * (0.75 + 0.25 * thr);
  let engine = (on * thr + off * (1 - thr) * 0.8) * load * 2.2;
  const inGain = Math.min(1, Math.max(0, (t - (T0 - 0.35)) / 0.35)); // idle fades in under the start-up tail
  const outGain = t > total - 0.9 ? Math.max(0, (total - t) / 0.9) : 1;
  engine *= inGain * outGain;
  const s = n < start.length ? start[n] * 0.55 : 0;
  mix[n] = s + engine;
}

// soft limit and normalize to -1 dBFS
let peak = 0;
for (let n = 0; n < N; n++) { mix[n] = Math.tanh(mix[n] * 1.3); peak = Math.max(peak, Math.abs(mix[n])); }
const g = 0.89 / peak;
for (let n = 0; n < N; n++) mix[n] *= g;

writeFileSync(join(tmp, 'mix.f32'), Buffer.from(mix.buffer));
execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'f32le', '-ar', String(SR), '-ac', '1', '-i', join(tmp, 'mix.f32'),
  '-af', 'highpass=f=28,aecho=0.9:0.9:38|61:0.16|0.1,volume=11.5dB,alimiter=limit=0.89:attack=2:release=60', '-ar', '44100', '-ac', '2', '-c:a', 'libmp3lame', '-b:a', '160k', out]);
console.log('wrote', out, `${total}s`);
