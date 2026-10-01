// Opening scene Miranda asked for: Merani waits in the dark behind an engine
// start button. Press it and the starter cranks while the headlights flicker,
// the engine fires and the showroom lights up from the headlights outward,
// two throttle blips write her name, then a full pull drives the camera into
// a headlight and the flash opens onto the universe.
//
// The picture follows the engine: the sound (public/audio/merani-engine.mp3,
// a real recording, see tools/build_engine_audio.mjs) and this scene both read
// src/engine-timeline.js. Rendered with one WebGL shader over Miranda's render;
// a 2D canvas version covers browsers without WebGL.

import { BEATS, engineAt, IDLE_RPM, MAX_RPM } from './engine-timeline.js';

const BASE = import.meta.env.BASE_URL;
const EYES = [[0.4795, 0.121], [0.5585, 0.121]]; // the headlights in the image (uv)
const FOCUS = [0.52, 0.36]; // centre of the cover crop, keeps the head in frame
const FLASH = BEATS.release + 0.02;
const OUT = FLASH + 1.6;

const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, x) => a + (b - a) * x;
const smooth = (a, b, x) => { const k = clamp((x - a) / (b - a)); return k * k * (3 - 2 * k); };
const outCubic = (x) => 1 - (1 - clamp(x)) ** 3;
const hash = (n) => { const s = Math.sin(n * 127.1) * 43758.5453; return s - Math.floor(s); };
const decay = (t, t0, rate) => (t < t0 ? 0 : Math.exp(-(t - t0) * rate));

/* ---------------------------------------------------------------- the scene, as a function of time */
// t: seconds into the engine sound (negative while waiting at the button)
function scene(t, now, reduce) {
  const fired = t >= BEATS.fire;
  const rpm = fired ? engineAt(t)[0] : 0;
  const r = fired ? clamp((rpm - IDLE_RPM) / (MAX_RPM - IDLE_RPM)) : 0;
  const pullIn = clamp((t - BEATS.pull) / (FLASH - BEATS.pull)) ** 2.3; // the dive
  const pan = smooth(BEATS.pull, FLASH, t);
  const limiter = t > BEATS.limiter && t < BEATS.release ? 0.5 + 0.5 * Math.sin(t * 90) : 0;

  let flare;
  if (t < 0) flare = 0.06 + 0.05 * Math.sin(now * 1.8); // asleep, breathing
  else if (!fired) {
    const k = t < BEATS.crank ? 0 : hash(Math.floor(t * 26));
    flare = 0.06 + (k > 0.4 ? k : 0.05) * 0.9 * smooth(BEATS.crank, BEATS.fire, t + 0.25);
  } else flare = 1 + 1.7 * r + 2.8 * decay(t, BEATS.fire, 5) + 2 * pullIn + 0.6 * limiter;

  const reveal = fired ? outCubic((t - BEATS.fire) / 2.3) : 0;
  const exposure = (t < 0 ? 0 : 0.06 + 0.9 * reveal) * (1 + 0.3 * r + 0.6 * pullIn);
  // camera: close on the head when it fires, easing back to the whole sculpture, then into a headlight
  const back = fired ? outCubic((t - BEATS.fire) / (BEATS.pull - BEATS.fire)) : 0;
  const zoom = reduce ? 1.03 : lerp(lerp(1.5, 1.03, back), 4.6, pullIn);
  const amp = reduce ? 0 : !fired ? (t > BEATS.crank ? 0.0022 : 0)
    : 0.0006 + 0.005 * r * r + 0.016 * decay(t, BEATS.fire, 7) + 0.004 * pullIn;
  const shake = [
    amp * (Math.sin(now * 61.3) * 0.6 + Math.sin(now * 97.1 + 1.3) * 0.4),
    amp * (Math.sin(now * 73.7 + 0.7) * 0.6 + Math.sin(now * 113.9) * 0.4),
  ];
  const flash = clamp(0.5 * decay(t, BEATS.fire, 11) + smooth(FLASH - 0.32, FLASH, t) * (t < FLASH ? 1 : Math.exp(-(t - FLASH) * 0.9)));
  return {
    rpm, r, flare, reveal, exposure, zoom, pan: reduce ? 0 : pan, back, shake,
    blur: reduce ? 0 : 0.45 * pullIn,
    ca: reduce ? 0 : 0.0012 + 0.003 * r + 0.014 * pullIn,
    red: reveal * (0.15 + 0.85 * r),
    flash: reduce ? flash * 0.5 : flash,
    opacity: 1 - smooth(FLASH + 0.1, OUT, t),
  };
}

/* ---------------------------------------------------------------- camera framing */
// cover-crop the image to the screen, then pin frame point P to screen point A at a zoom
function frame(W, H, img, s) {
  const sa = W / H, ia = img.w / img.h;
  const sw = sa > ia ? 1 : sa / ia, sh = sa > ia ? ia / sa : 1;
  const crop = [clamp(FOCUS[0] - sw / 2, 0, 1 - sw), clamp(FOCUS[1] - sh / 2, 0, 1 - sh), sw, sh];
  const toFrame = ([x, y]) => [(x - crop[0]) / crop[2], (y - crop[1]) / crop[3]];
  const e0 = toFrame(EYES[0]), e1 = toFrame(EYES[1]);
  const mid = [(e0[0] + e1[0]) / 2, (e0[1] + e1[1]) / 2];
  // the start button is centred on screen: keep the headlights' midpoint on it,
  // zooming in just enough that the shift never shows past the image edge
  const z = Math.max(s.zoom, 0.5 / (1 - mid[0]), 0.5 / mid[0]);
  // settle from "head a little lower than it sits" to rest, then travel to the left headlight
  const P = [lerp(mid[0], e0[0], s.pan), lerp(mid[1], e0[1], s.pan)];
  let A = [0.5, lerp(P[1] + 0.12 * (1 - s.back), 0.5, s.pan)];
  // never show past the image edge more than the dark ceiling allows
  A = A.map((a, i) => clamp(a, 1 - (1 - P[i]) * z, P[i] * z + (i === 1 ? 0.06 : 0)));
  const toScreen = ([x, y]) => [A[0] + (x - P[0]) * z, A[1] + (y - P[1]) * z];
  return { crop, P, A, z, eyes: [toScreen(e0), toScreen(e1)] };
}

/* ---------------------------------------------------------------- WebGL renderer */
const VERT = `attribute vec2 p; varying vec2 vUv; void main() { vUv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uRes;
uniform vec4 uCrop;
uniform vec2 uP, uA, uShake, uEye0, uEye1;
uniform float uZoom, uExposure, uReveal, uFlare, uBlur, uCA, uRed, uFlash, uTime, uHasTex;

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

vec3 img(vec2 s) {
  vec2 uv = uCrop.xy + (uP + (s - uA) / uZoom) * uCrop.zw;
  if (uHasTex < 0.5 || uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(0.0);
  return texture2D(uTex, uv).rgb;
}
vec3 split(vec2 s) {
  vec2 d = s - uA;
  return vec3(img(uA + d * (1.0 + uCA)).r, img(s).g, img(uA + d * (1.0 - uCA)).b);
}
vec3 headlight(vec2 q) {
  float r2 = dot(q, q);
  vec3 c = vec3(0.86, 0.93, 1.0) * (exp(-r2 * 2400.0) * 1.3 + 0.0018 / (r2 + 0.0018) * 0.33);
  c += vec3(0.5, 0.72, 1.0) * exp(-abs(q.y) * 150.0) * exp(-abs(q.x) * 2.4) * 0.4; // anamorphic streak
  return c;
}

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 s = vec2(vUv.x, 1.0 - vUv.y) + uShake;

  vec3 col;
  if (uBlur > 0.001) {
    vec3 acc = vec3(0.0);
    for (int i = 0; i < 16; i++) acc += split(mix(s, uA, float(i) / 15.0 * uBlur));
    col = acc / 16.0;
  } else {
    col = split(s);
  }

  vec2 q0 = (s - uEye0) * vec2(aspect, 1.0) / uZoom;
  vec2 q1 = (s - uEye1) * vec2(aspect, 1.0) / uZoom;
  float d = min(length(q0), length(q1));
  // the showroom comes on in a wave that starts at the headlights
  float rr = uReveal * 2.6;
  float wave = 1.0 - smoothstep(rr - 0.7, rr, d * uZoom);
  float spill = exp(-d * d * 16.0) * clamp(uFlare * 0.45, 0.0, 0.9);
  col *= max(wave, spill) * uExposure;
  col.r *= 1.0 + 0.35 * uRed;
  col += vec3(0.16, 0.0, 0.015) * uRed * wave * 0.3;

  col += (headlight(q0) + headlight(q1)) * uFlare;

  col = min(col, 0.85) + (1.0 - exp(-max(col - 0.85, 0.0) * 4.0)) * 0.15; // soft shoulder, keeps the render's own look
  float v = length((vUv - 0.5) * vec2(aspect, 1.0));
  col *= mix(1.0, 1.0 - smoothstep(0.35, 1.25, v), 0.8);
  col *= mix(0.62, 1.0, smoothstep(0.0, 0.42, vUv.y)); // quieter floor under the name
  col += (hash(gl_FragCoord.xy + fract(uTime) * 100.0) - 0.5) * 0.04;
  col = mix(col, vec3(1.0, 0.95, 0.93), uFlash);
  gl_FragColor = vec4(col, 1.0);
}`;

function glRenderer(canvas) {
  const gl = canvas.getContext('webgl', { antialias: false, alpha: false, premultipliedAlpha: false, powerPreference: 'high-performance' });
  if (!gl) return null;
  const sh = (type, src) => {
    const o = gl.createShader(type);
    gl.shaderSource(o, src);
    gl.compileShader(o);
    if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o));
    return o;
  };
  const prog = gl.createProgram();
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  gl.useProgram(prog);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = {};
  ['uTex', 'uRes', 'uCrop', 'uP', 'uA', 'uShake', 'uEye0', 'uEye1', 'uZoom', 'uExposure', 'uReveal', 'uFlare', 'uBlur', 'uCA', 'uRed', 'uFlash', 'uTime', 'uHasTex']
    .forEach((n) => (u[n] = gl.getUniformLocation(prog, n)));
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  let hasTex = 0;
  return {
    setImage(im) { gl.bindTexture(gl.TEXTURE_2D, tex); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im); hasTex = 1; },
    draw(W, H, f, s, now) {
      gl.viewport(0, 0, W, H);
      gl.uniform1i(u.uTex, 0);
      gl.uniform2f(u.uRes, W, H);
      gl.uniform4f(u.uCrop, ...f.crop);
      gl.uniform2f(u.uP, ...f.P);
      gl.uniform2f(u.uA, ...f.A);
      gl.uniform2f(u.uShake, ...s.shake);
      gl.uniform2f(u.uEye0, ...f.eyes[0]);
      gl.uniform2f(u.uEye1, ...f.eyes[1]);
      gl.uniform1f(u.uZoom, f.z);
      gl.uniform1f(u.uExposure, s.exposure);
      gl.uniform1f(u.uReveal, s.reveal);
      gl.uniform1f(u.uFlare, s.flare);
      gl.uniform1f(u.uBlur, s.blur);
      gl.uniform1f(u.uCA, s.ca);
      gl.uniform1f(u.uRed, s.red);
      gl.uniform1f(u.uFlash, s.flash);
      gl.uniform1f(u.uTime, now);
      gl.uniform1f(u.uHasTex, hasTex);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    },
    dispose() { gl.getExtension('WEBGL_lose_context')?.loseContext(); },
  };
}

/* ---------------------------------------------------------------- 2D fallback */
function canvasRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let im = null;
  return {
    setImage(i) { im = i; },
    draw(W, H, f, s) {
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      const ox = s.shake[0] * W, oy = s.shake[1] * H;
      if (im && s.exposure > 0) {
        const f0 = [-f.crop[0] / f.crop[2], -f.crop[1] / f.crop[3]];
        ctx.globalAlpha = clamp(s.exposure * s.reveal);
        ctx.drawImage(im, (f.A[0] + (f0[0] - f.P[0]) * f.z) * W - ox, (f.A[1] + (f0[1] - f.P[1]) * f.z) * H - oy, (f.z / f.crop[2]) * W, (f.z / f.crop[3]) * H);
      }
      ctx.globalCompositeOperation = 'lighter';
      f.eyes.forEach(([x, y]) => {
        const r = H * 0.09 * f.z;
        const g = ctx.createRadialGradient(x * W - ox, y * H - oy, 0, x * W - ox, y * H - oy, r);
        g.addColorStop(0, 'rgba(235,244,255,1)');
        g.addColorStop(0.12, 'rgba(200,225,255,0.55)');
        g.addColorStop(1, 'rgba(160,200,255,0)');
        ctx.globalAlpha = clamp(s.flare * 0.5);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      });
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = s.flash;
      ctx.fillStyle = '#fff3ee';
      ctx.fillRect(0, 0, W, H);
    },
    dispose() {},
  };
}

/* ---------------------------------------------------------------- the overlay */
export function runIntro({ image, t, onDone }) {
  let seen = false;
  try { seen = sessionStorage.getItem('kc-intro') === '1'; } catch {}
  if (seen || !image) { onDone(); return; }
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const letters = (w, cls) => `<span class="${cls}">${[...w].map((c, i) => `<span class="l" style="--i:${i}">${c}</span>`).join('')}</span>`;
  const el = document.createElement('div');
  el.className = 'intro';
  el.innerHTML = `
    <canvas class="intro-gl" aria-hidden="true"></canvas>
    <div class="intro-gate">
      <button class="intro-start" aria-label="${t.enter} · ${t.sound}">
        <svg viewBox="0 0 200 200" aria-hidden="true">
          <defs><path id="introRing" d="M100,100 m-80,0 a80,80 0 1,1 160,0 a80,80 0 1,1 -160,0"/></defs>
          <circle class="is-track" cx="100" cy="100" r="64"/>
          <circle class="is-load" cx="100" cy="100" r="64" pathLength="1"/>
          <g class="is-spin"><text><textPath href="#introRing" textLength="498" lengthAdjust="spacing">PRESS TO START · KUPRAVA CREATIVE · MERANI ·</textPath></text></g>
        </svg>
        <span class="is-core"><small>ENGINE</small><b>START</b><small>STOP</small></span>
      </button>
      <div class="intro-hint"><span class="eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span>${t.sound}</div>
    </div>
    <div class="intro-title" aria-hidden="true">
      <div class="it-name">${letters('MIRANDA', 'w w1')}${letters('KUPRAVA', 'w w2')}</div>
      <div class="it-role">${t.artistRole}</div>
    </div>
    <div class="intro-hud" aria-hidden="true"><span class="ih-work">Merani <em>— Miranda Kuprava</em></span><span class="ih-rpm"><b>0</b> rpm</span></div>
    <i class="intro-bar" aria-hidden="true"></i>
    <button class="intro-skip">${t.skip}</button>`;
  document.body.appendChild(el);
  document.body.classList.add('locked');

  const canvas = el.querySelector('.intro-gl');
  let R = null;
  try { R = glRenderer(canvas); } catch {}
  if (!R) R = canvasRenderer(canvas);

  const dims = { w: image.w, h: image.h };
  let W = 0, H = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, innerWidth < 760 ? 1.5 : 1.25);
    W = Math.round(innerWidth * dpr); H = Math.round(innerHeight * dpr);
    canvas.width = W; canvas.height = H;
  };
  resize();
  addEventListener('resize', resize);

  // assets: the render and the engine
  const gate = el.querySelector('.intro-gate');
  const startBtn = el.querySelector('.intro-start');
  let loaded = 0;
  const progress = () => {
    loaded++;
    gate.style.setProperty('--load', loaded / 2);
    if (loaded >= 2) gate.classList.add('ready');
  };
  const im = new Image();
  im.decoding = 'async';
  // iOS won't buffer audio before a tap, so the button only waits briefly for it after the image
  im.onload = () => { R.setImage(im); progress(); setTimeout(() => audioReady(), 1200); };
  im.onerror = () => { progress(); setTimeout(() => audioReady(), 1200); };
  im.src = `${BASE}${image.src}`;
  const audio = new Audio(`${BASE}audio/merani-engine.mp3`);
  audio.preload = 'auto';
  let audioCounted = false;
  const audioReady = () => { if (!audioCounted) { audioCounted = true; progress(); } };
  audio.addEventListener('canplaythrough', audioReady, { once: true });
  audio.addEventListener('error', audioReady, { once: true });
  audio.load();

  // clock: performance time, gently pulled onto the audio's own clock while it plays
  let t0 = null, offset = 0;
  const clock = () => {
    if (t0 === null) return -1;
    const pt = (performance.now() - t0) / 1000;
    if (!audio.paused && audio.currentTime > 0 && !audio.ended) offset += (audio.currentTime - pt - offset) * 0.08;
    return pt + offset;
  };

  const title = el.querySelector('.intro-title');
  const w1 = el.querySelector('.w1'), w2 = el.querySelector('.w2');
  const rpmOut = el.querySelector('.ih-rpm b');
  const bar = el.querySelector('.intro-bar');
  let lastRpm = -1, handedOver = false, raf = 0, ended = false;

  const handOver = () => {
    if (handedOver) return;
    handedOver = true;
    try { sessionStorage.setItem('kc-intro', '1'); } catch {}
    document.body.classList.remove('locked');
    onDone();
  };
  const cleanup = () => {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(raf);
    removeEventListener('resize', resize);
    el.remove();
    R.dispose();
  };

  const loop = (ms) => {
    const now = ms / 1000;
    const tt = clock();
    const s = scene(tt, now, reduce);
    R.draw(W, H, frame(W, H, dims, s), s, now);
    if (tt >= 0) {
      el.style.opacity = s.opacity;
      w1.classList.toggle('on', tt > BEATS.blips[0] - 0.12);
      w2.classList.toggle('on', tt > BEATS.blips[1] - 0.12);
      title.classList.toggle('role', tt > BEATS.blips[1] + 0.35);
      title.classList.toggle('go', tt > BEATS.pull + 0.5);
      el.classList.toggle('running', tt > BEATS.fire && tt < BEATS.release);
      const shown = Math.round(s.rpm / 10) * 10;
      if (shown !== lastRpm) { rpmOut.textContent = shown; lastRpm = shown; }
      bar.style.transform = `scaleX(${s.r.toFixed(3)})`;
      if (tt >= FLASH) handOver();
      if (tt >= OUT) { cleanup(); return; }
    }
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  const begin = (withSound) => {
    if (t0 !== null || !gate.classList.contains('ready')) return;
    gate.classList.add('pressed');
    el.classList.add('started');
    let go = false;
    const start = () => { if (!go) { go = true; t0 = performance.now(); } };
    if (withSound) {
      audio.currentTime = 0;
      audio.play().then(start, start);
      setTimeout(start, 1500);
    } else start();
  };
  startBtn.addEventListener('click', () => begin(true));
  el.querySelector('.intro-skip').addEventListener('click', () => {
    if (!audio.paused) {
      const fade = setInterval(() => { audio.volume = Math.max(0, audio.volume - 0.08); if (audio.volume <= 0) { clearInterval(fade); audio.pause(); } }, 40);
    }
    el.classList.add('out');
    handOver();
    setTimeout(cleanup, 900);
  });
  startBtn.focus({ preventScroll: true });
}
