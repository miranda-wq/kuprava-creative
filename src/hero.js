// The home page, after Miranda's reference image: her K, framed by
// construction lines, orbits and moons, with her ten planets as links.
// Coordinates are pixels of the reference image, 1672 × 941.
import { drawThreads } from './k-threads.js';

const NS = 'http://www.w3.org/2000/svg';
const W = 1672, H = 941;
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const f1 = (n) => Math.round(n * 10) / 10;

/* ---------------------------------------------------------------- the K */
// The K's threads are traced from the reference (tools/trace_k.py) and drawn by
// k-threads.js; the arm and the KUPRAVA staircase are drawn here, on top of them.
// the arm and its staircase
const ARM = { x0: 808, y0: 497, slope: 0.88 }; // starts under the U, as in the reference
const armY = (x) => ARM.y0 - ARM.slope * (x - ARM.x0);
const STEPS = { x: 806, y: 458, w: 46, h: 40.5 };
const LETTERS = ['U', 'P', 'R', 'A', 'V', 'A'];

function drawArm(svg) {
  const k = el('g', { class: 'k' }, svg);

  // arm: translucent blood-red threads, with the white catchlights reserved for the K's edges
  const x1 = STEPS.x + STEPS.w * LETTERS.length;
  const arm = el('g', { class: 'arm' }, k);
  // wide enough to fill the dark band the reference leaves under the stairs; at the top,
  // under the last A, every thread bends, as in the reference, into the line out to the spark
  const N = 34, yTop = STEPS.y - STEPS.h * (LETTERS.length - 1);
  const xBend = x1 - 30, xEnd = x1 + 32; // the bend starts under the A and flattens out at the spark
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const off = (x) => t * (22 - 16 * (x - ARM.x0) / (xBend - ARM.x0)); // the sheet narrows towards the top
    const a = [ARM.x0 - 14 * t, armY(ARM.x0) + 22 * t];
    const s0 = [xBend, armY(xBend) + off(xBend)];
    const yH = yTop + 1.2 + 3.5 * t; // where the thread runs flat
    const xc = ARM.x0 + (armY(ARM.x0) + off(xBend) - yH) / ARM.slope; // the diagonal meets the flat line here
    const d = `M${f1(a[0])},${f1(a[1])} L${f1(s0[0])},${f1(s0[1])} Q${f1(xc)},${f1(yH)} ${f1(xEnd - 6 * t)},${f1(yH)}`;
    // silver along the top turning red, then fading into the threads below
    // no hard edge anywhere: the colour turns gradually and the light fades out smoothly
    const r = t ** 0.7;
    const c = [Math.round(205 + 35 * r), Math.round(9 + 12 * r), Math.round(14 + 14 * r)];
    const o = 0.5 * (1 - t) ** 1.8 + 0.02;
    el('path', { d, fill: 'none', stroke: `rgb(${c.join(',')})`, 'stroke-opacity': o.toFixed(2) }, arm);
  }
  // as in the reference: a thin red line runs under the stairs, parallel to them, from
  // where the arm crosses the K up to the spark, bending into the flat line at the top
  {
    const g = 10, a = [ARM.x0 - 26, armY(ARM.x0 - 26) + g], b = [xBend + 6, armY(xBend + 6) + g];
    const yH = yTop + 1.5 + g * 0.35, xc = ARM.x0 + (armY(ARM.x0) + g - yH) / ARM.slope;
    el('path', { class: 'arm-line', d: `M${f1(a[0])},${f1(a[1])} L${f1(b[0])},${f1(b[1])} Q${f1(xc)},${f1(yH)} ${xEnd + 2},${f1(yH)}` }, k);
    // and the stairs' own edge carries on down through the stem
    el('path', { class: 'arm-tail', d: `M${ARM.x0},${f1(armY(ARM.x0))} L${ARM.x0 - 90},${f1(armY(ARM.x0 - 90))}` }, k);
  }
  // the same sheet, blurred, for the glow
  arm.id = 'armSheet';
  k.insertBefore(el('use', { href: '#armSheet', class: 'arm-glow' }), arm);

  // staircase: blocks, treads and the letters of KUPRAVA
  const stairs = el('g', { class: 'stairs' }, svg);
  let prof = '';
  LETTERS.forEach((ch, i) => {
    const xl = STEPS.x + STEPS.w * i, xr = xl + STEPS.w, y = STEPS.y - STEPS.h * i;
    // the last block's underside follows the arm's bend instead of a straight diagonal
    const last = i === LETTERS.length - 1;
    const yH0 = yTop + 1.2, xc0 = ARM.x0 + (armY(ARM.x0) - yH0) / ARM.slope;
    const d = last
      ? `M${xl},${y} L${xEnd},${y} L${xEnd},${f1(yH0)} Q${f1(xc0)},${f1(yH0)} ${xBend},${f1(armY(xBend))} L${xl},${f1(armY(xl))} Z`
      : `M${xl},${y} L${xr},${y} L${xr},${f1(Math.max(y, armY(xr)))} L${xl},${f1(armY(xl))} Z`;
    el('path', { class: 'step-face', d }, stairs);
    prof += `${i ? 'L' : `M${xl},${f1(armY(xl))} L`}${xl},${y} L${xr},${y} `;
    const g = el('g', { class: 'step', style: `--i:${i}` }, stairs);
    el('text', { class: 'step-letter', x: xl + STEPS.w * 0.47, y: y - 3, 'text-anchor': 'middle' }, g).textContent = ch;
    el('circle', { class: 'step-glint', cx: xl, cy: y, r: 2 }, g);
  });

  prof += `L${x1 + 30},${f1(yTop)}`;
  el('path', { class: 'step-path', d: prof, pathLength: 1 }, stairs);
  el('circle', { class: 'step-spark', cx: x1 + 34, cy: f1(yTop + 1), r: 3 }, stairs);
}

// KUPRAVA climbs its staircase: each letter appears just below the first step and hops
// up the stairs, one step at a time, to its own tread. The top A sets off first, the U last,
// so they all arrive at about the same moment.
function climb(svg) {
  const letters = [...svg.querySelectorAll('.step-letter')];
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const HOP = 330, GAP = 380; // ms per hop, ms between letters setting off
  letters.forEach((tx, i) => {
    if (reduce || !tx.animate) { tx.style.opacity = 1; return; }
    const hops = i + 1;
    const at = (back, lift = 0) => `translate(${-back * STEPS.w}px, ${back * STEPS.h - lift}px) scaleY(1.15)`;
    const frames = [{ transform: at(hops), opacity: 0, offset: 0 }];
    for (let k = 0; k < hops; k++) {
      const back = hops - k, apex = (k + 0.5) / hops;
      // up and over the riser in an arc, then land on the next tread
      frames.push({ transform: `translate(${-(back - 0.55) * STEPS.w}px, ${(back - 0.5) * STEPS.h - STEPS.h * 0.75}px) scaleY(1.2)`, opacity: 1, offset: apex, easing: 'cubic-bezier(0.4, 0, 1, 1)' });
      frames.push({ transform: at(back - 1), opacity: 1, offset: (k + 1) / hops, easing: 'cubic-bezier(0, 0, 0.6, 1)' });
    }
    frames[0].easing = 'cubic-bezier(0, 0, 0.6, 1)';
    tx.animate(frames, { duration: hops * HOP, delay: (letters.length - 1 - i) * GAP, fill: 'both' });
  });
}

/* ---------------------------------------------------------------- orbits, construction, sparks */
const ORBITS = [
  { cx: 827.6, cy: 397.3, rx: 970.1, ry: 368.6, rot: -12.7, cls: '' },
  { cx: 824.5, cy: 517.7, rx: 776.6, ry: 158.3, rot: -7, cls: '' },
  { cx: 865.9, cy: 309, rx: 660.3, ry: 223.7, rot: -31.6, cls: 'red' },
  { cx: 840, cy: 472, rx: 433.2, ry: 154.9, rot: -8, cls: 'faint' },
  { cx: 830.6, cy: 447, rx: 1063.5, ry: 399.4, rot: -19, cls: 'faint' },
  { cx: 633.5, cy: 571.7, rx: 332.3, ry: 119.1, rot: -7.9, cls: 'faint' },
  { cx: 761.4, cy: 435.8, rx: 580.5, ry: 220.6, rot: -40.4, cls: 'faint' },
  { cx: 922.4, cy: 405.2, rx: 943.4, ry: 236, rot: 11.8, cls: 'faint' },
  { cx: 860.2, cy: 450.6, rx: 523.9, ry: 198.1, rot: 4, cls: 'faint' },
  { cx: 756.1, cy: 464.8, rx: 419.7, ry: 151.1, rot: -19, cls: 'faint' },
  { cx: 781.9, cy: 479.5, rx: 409, ry: 147.2, rot: -41.6, cls: 'faint' },
  { cx: 644, cy: 603.5, rx: 586.2, ry: 222.8, rot: 10.1, cls: 'faint' },
  { cx: 865.7, cy: 327.8, rx: 771.9, ry: 293.3, rot: 4, cls: 'faint' },
];

// Miranda's ten planets, placed as in the reference (the three she added later take its unlabelled moons)
const NODES = [
  { id: 'sculpture', x: 832, y: 70, d: 28, side: 'right', orbit: 2, tone: 'hot' },
  { id: 'kinetic', x: 1226, y: 137, d: 30, side: 'right', orbit: 6 },
  { id: 'christmas', x: 1358, y: 278, d: 42, side: 'right', orbit: 7, wrap: true, tone: 'grey' },
  { id: 'brand', x: 1467, y: 354, d: 24, side: 'right', orbit: 1, wrap: true, tone: 'red' },
  { id: 'functional', x: 1282, y: 641, d: 32, side: 'right', orbit: 0 },
  { id: 'public', x: 417, y: 185, d: 24, side: 'left', orbit: 4, tone: 'hot' },
  { id: 'spaces', x: 340, y: 400, d: 24, side: 'left', orbit: 8, wrap: true, tone: 'red' },
  { id: 'competitions', x: 483, y: 483, d: 34, side: 'left', orbit: 5, wrap: true },
  { id: 'contact', x: 378, y: 628, d: 40, side: 'left', orbit: 9 },
  { id: 'outdoor', x: 548, y: 772, d: 26, side: 'left', orbit: 10, wrap: true, tone: 'grey' },
];
const MOONS = [
  { id: 'melita', x: 1240, y: 480, d: 142, tone: 'big', side: 'right', orbit: 3, wrap: true },
  { x: 398, y: 362, d: 11, tone: 'grey', orbit: 11 },
  { x: 1582, y: 262, d: 6, tone: 'red', orbit: 12 },
];

function onEllipse(o, ang) {
  const r = (o.rot * Math.PI) / 180;
  const x = Math.cos(ang) * o.rx, y = Math.sin(ang) * o.ry;
  return { x: o.cx + x * Math.cos(r) - y * Math.sin(r), y: o.cy + x * Math.sin(r) + y * Math.cos(r) };
}
function angleFor(o, p) {
  const r = (-o.rot * Math.PI) / 180;
  const dx = p.x - o.cx, dy = p.y - o.cy;
  const x = dx * Math.cos(r) - dy * Math.sin(r), y = dx * Math.sin(r) + dy * Math.cos(r);
  return Math.atan2(y / o.ry, x / o.rx);
}

/* ---------------------------------------------------------------- moons */
// each moon is painted once into a canvas: a cratered sphere lit red from the
// left (white from above for the grey ones), with a rim glow on the lit side
const GLOW = 0.45; // canvas margin around the disc, as a share of the radius
const LIGHTS = {
  hot: { key: [-0.82, 0.1, 0.4], keyC: [1, 0.26, 0.22], keyI: 2.6, fill: [-0.2, 0.6, 0.77], fillC: [1, 0.72, 0.7], fillI: 0.3, albedo: [0.62, 0.55, 0.54], glow: 1 },
  lit: { key: [-0.95, 0.08, -0.05], keyC: [1, 0.3, 0.26], keyI: 1.45, fill: [-0.3, 0.6, 0.74], fillC: [1, 0.85, 0.82], fillI: 0.26, albedo: [0.55, 0.5, 0.5], glow: 0.75 },
  red: { key: [-0.6, 0.35, 0.72], keyC: [1, 0.32, 0.28], keyI: 1.05, fill: [0.2, 0.6, 0.77], fillC: [1, 0.55, 0.5], fillI: 0.3, albedo: [0.8, 0.42, 0.38], glow: 1 },
  grey: { key: [-0.55, 0.62, 0.56], keyC: [1, 0.94, 0.92], keyI: 0.45, fill: [-0.95, -0.2, 0.25], fillC: [1, 0.25, 0.2], fillI: 0.38, albedo: [0.5, 0.46, 0.46], glow: 0.3 },
  big: { key: [-0.86, 0.04, -0.52], keyC: [1, 0.4, 0.35], keyI: 2, fill: [-0.45, 0.4, 0.8], fillC: [1, 0.85, 0.82], fillI: 0.2, albedo: [0.45, 0.41, 0.41], glow: 0.6 },
};
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };

function noise3(seed) {
  const h = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7 + seed * 19.3) * 43758.5453; return s - Math.floor(s); };
  const sm = (t) => t * t * (3 - 2 * t);
  const n = (x, y, z) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const xf = sm(x - xi), yf = sm(y - yi), zf = sm(z - zi);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(h(xi, yi, zi), h(xi + 1, yi, zi), xf), l(h(xi, yi + 1, zi), h(xi + 1, yi + 1, zi), xf), yf),
      l(l(h(xi, yi, zi + 1), h(xi + 1, yi, zi + 1), xf), l(h(xi, yi + 1, zi + 1), h(xi + 1, yi + 1, zi + 1), xf), yf), zf);
  };
  return (x, y, z) => n(x, y, z) * 0.5 + n(x * 2.1, y * 2.1, z * 2.1) * 0.27 + n(x * 4.3, y * 4.3, z * 4.3) * 0.15 + n(x * 9, y * 9, z * 9) * 0.08;
}

function paintMoon(d, tone, seed, radius, gain = 1) {
  const L = LIGHTS[tone] || LIGHTS.lit;
  const key = norm(L.key), fill = norm(L.fill);
  const R = Math.round(radius || Math.min(150, Math.max(14, d * 1.25)));
  const M = Math.round(R * GLOW);
  const S = (R + M) * 2;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  // glow on the lit side
  const gx = S / 2 + key[0] * R * 0.35, gy = S / 2 - key[1] * R * 0.35;
  // the glow must fade out before the canvas edge, or its square edge shows on big planets
  const reach = S / 2 - Math.max(Math.abs(gx - S / 2), Math.abs(gy - S / 2)) - 1;
  const g = x.createRadialGradient(gx, gy, Math.min(R * 0.7, reach * 0.6), gx, gy, reach);
  g.addColorStop(0, `rgba(255,40,30,${0.55 * L.glow})`);
  g.addColorStop(1, 'rgba(255,40,30,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);
  // the disc: height field first, then shade with its slopes
  const rnd = (() => { let s = seed * 9301 + 49297; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const craters = Array.from({ length: 34 }, () => {
    const v = norm([rnd() - 0.5, rnd() - 0.5, rnd() * 0.9 + 0.1]);
    const r = 0.03 + rnd() ** 2.5 * 0.22;
    return { v, r, k: 0.3 + rnd() * 0.5, near: Math.cos(Math.min(Math.PI, r * 1.4)) };
  });
  const nz = noise3(seed);
  const D = R * 2, hgt = new Float32Array(D * D), alb = new Float32Array(D * D), inside = new Uint8Array(D * D);
  for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
    const px = (i + 0.5 - R) / R, py = (j + 0.5 - R) / R, q = px * px + py * py;
    if (q > 1) continue;
    const pz = Math.sqrt(1 - q), n = [px, -py, pz], k = j * D + i;
    inside[k] = 1;
    let h = nz(n[0] * 5 + 5, n[1] * 5, n[2] * 5) * 0.9;
    let a = 0.7 + nz(n[0] * 1.6, n[1] * 1.6 + 9, n[2] * 1.6) * 0.6;
    for (const cr of craters) {
      const dot = n[0] * cr.v[0] + n[1] * cr.v[1] + n[2] * cr.v[2];
      if (dot < cr.near) continue; // too far from this crater to be touched by it
      const dist = Math.acos(Math.min(1, dot)) / cr.r;
      if (dist < 1.4) {
        h += dist < 1 ? -cr.k * 0.35 * (1 - dist * dist) : 0;
        h += cr.k * 0.22 * Math.exp(-(((dist - 1) / 0.18) ** 2));
        if (dist < 1) a *= 0.88 + dist * 0.1;
      }
    }
    hgt[k] = h; alb[k] = a;
  }
  const img = x.getImageData(M, M, D, D), px = img.data;
  const bump = R * 0.03;
  for (let j = 0; j < D; j++) for (let i = 0; i < D; i++) {
    const k = j * D + i;
    if (!inside[k]) continue;
    const hx = (inside[k + 1] ? hgt[k + 1] : hgt[k]) - (inside[k - 1] ? hgt[k - 1] : hgt[k]);
    const hy = (inside[k + D] ? hgt[k + D] : hgt[k]) - (inside[k - D] ? hgt[k - D] : hgt[k]);
    const sx = (i + 0.5 - R) / R, sy = (j + 0.5 - R) / R, sz = Math.sqrt(Math.max(0, 1 - sx * sx - sy * sy));
    const n = norm([sx - hx * bump * 0.5, -sy + hy * bump * 0.5, sz]);
    const dk = Math.max(0, n[0] * key[0] + n[1] * key[1] + n[2] * key[2]);
    const df = Math.max(0, n[0] * fill[0] + n[1] * fill[1] + n[2] * fill[2]);
    const rim = Math.pow(1 - sz, 3) * Math.max(0, -sx * 0.9 + 0.2) * 1.6;
    const edge = Math.min(1, (1 - Math.sqrt(sx * sx + sy * sy)) * R * 0.9); // antialias the limb
    for (let ch = 0; ch < 3; ch++) {
      const v = L.albedo[ch] * alb[k] * (dk * L.keyI * gain * L.keyC[ch] + df * L.fillI * gain * L.fillC[ch] + 0.025) + rim * L.keyC[ch];
      const o = k * 4 + ch;
      px[o] = px[o] * (1 - edge) + Math.min(255, v * 255) * edge;
    }
    px[k * 4 + 3] = Math.max(px[k * 4 + 3], edge * 255);
  }
  x.putImageData(img, M, M);
  return c;
}

function moonEl(d, tone, seed) {
  const c = paintMoon(d, tone, seed);
  c.className = `moon moon-${tone}`;
  c.style.setProperty('--d', d);
  c.setAttribute('aria-hidden', 'true');
  return c;
}

// two-line labels break where the reference breaks them: after the first word (or after a slash)
function labelHTML(text, wrap) {
  const w = text.split(' ');
  if (!wrap || w.length < 2) return text;
  const k = w[1] === '/' ? 2 : 1;
  return `${w.slice(0, k).join(' ')}<br>${w.slice(k).join(' ')}`;
}

/* ---------------------------------------------------------------- build */
export function buildHero({ svg, nodesBox, onNavigate, onHover, labels }) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  // Every planet has its own ellipse, fitted through its starting center.
  const planets = [...NODES, ...MOONS];
  const orbits = ORBITS.map((o, i) => {
    const n = planets.find((n) => n.orbit === i);
    const p = onEllipse(o, angleFor(o, n));
    const scale = Math.hypot(n.x - o.cx, n.y - o.cy) / Math.hypot(p.x - o.cx, p.y - o.cy);
    return { ...o, rx: o.rx * scale, ry: o.ry * scale };
  });
  const orbitG = el('g', { class: 'orbits' }, svg);
  const orbitEls = orbits.map((o, i) => el('ellipse', { cx: o.cx, cy: o.cy, rx: o.rx, ry: o.ry, transform: `rotate(${o.rot} ${o.cx} ${o.cy})`, class: `orbit orbit-${i} ${o.cls}`, pathLength: 1000 }, orbitG));

  const cons = el('g', { class: 'construct' }, svg);
  [[669, 58, 669, 700], [405, 185, 520, 185], [560, 693, 1080, 693], [793, 252, 793, 697]].forEach(([a, b, c, d]) => {
    el('line', { x1: a, y1: b, x2: c, y2: d, pathLength: 1000 }, cons);
  });
  // the K's cap line: bright white across the serifs, fading out at both ends, as in the reference
  el('defs', {}, svg).innerHTML = `<linearGradient id="capFade" gradientUnits="userSpaceOnUse" x1="500" y1="0" x2="1020" y2="0">
    <stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.2" stop-color="#fff" stop-opacity="0.75"/>
    <stop offset="0.75" stop-color="#fff" stop-opacity="0.85"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>`;
  el('line', { x1: 500, y1: 185.5, x2: 1020, y2: 185.5, class: 'cap-line', pathLength: 1000 }, cons);
  [[669, 512], [669, 592], [793, 470]].forEach(([cx, cy]) => el('circle', { cx, cy, r: 2.6, class: 'node-dot' }, cons));

  // the traced K, then the arm, the staircase and the cap-line glint on top of it
  const stage = svg.parentElement;
  stage.querySelectorAll('.k-layer, .hero-top').forEach((n) => n.remove());
  const layer = document.createElement('div');
  layer.className = 'k-layer';
  layer.setAttribute('aria-hidden', 'true');
  layer.innerHTML = '<canvas class="k-glow k-glow-wide"></canvas><canvas class="k-glow"></canvas><canvas class="k-lines"></canvas>';
  svg.after(layer);
  const top = el('svg', { class: 'hero-svg hero-top', viewBox: `0 0 ${W} ${H}`, 'aria-hidden': 'true' });
  layer.after(top);
  el('defs', {}, top).innerHTML = `
    <linearGradient id="stepFace" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f02b36" stop-opacity="0.7"/>
      <stop offset="0.55" stop-color="#ca1723" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#8a1015" stop-opacity="0.6"/>
    </linearGradient>`;
  drawArm(top);
  drawThreads(layer);

  const glint = el('g', { class: 'glint', transform: 'translate(669 185)' }, top);
  el('path', { d: 'M-26,0 L26,0 M0,-26 L0,26' }, glint);
  el('circle', { r: 3.2 }, glint);

  const sparks = el('g', { class: 'sparks' }, svg);
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 560;
    el('circle', { cx: f1(835 + Math.cos(a) * r * 1.3), cy: f1(470 + Math.sin(a) * r * 0.5), r: f1(Math.random() * 1.5 + 0.4), style: `--d:${(Math.random() * 6).toFixed(2)}s;--t:${(3 + Math.random() * 5).toFixed(2)}s` }, sparks);
  }

  // planets and labels
  nodesBox.innerHTML = '';
  const pos = (x, y) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });
  const moonLinks = [];
  MOONS.forEach((m, i) => {
    const c = moonEl(m.d, m.tone, i + 3);
    const o = orbits[m.orbit];
    const p = onEllipse(o, angleFor(o, m));
    if (!m.id) {
      Object.assign(c.style, pos(p.x, p.y));
      nodesBox.appendChild(c);
      return;
    }
    const a = document.createElement('a');
    a.className = `node node-${m.side}${m.wrap ? ' node-wrap' : ''}`;
    a.href = `#${m.id}`;
    a.style.setProperty('--d', m.d);
    a.style.setProperty('--i', i);
    Object.assign(a.style, pos(p.x, p.y));
    a.innerHTML = `<span class="label"><b>${labelHTML(labels[m.id], m.wrap)}</b><i></i></span>`;
    a.prepend(c);
    a.addEventListener('click', (e) => { e.preventDefault(); orbitEls[m.orbit].classList.remove('highlighted'); onNavigate(m.id, c); });
    a.addEventListener('pointerenter', () => { orbitEls[m.orbit].classList.add('highlighted'); onHover?.(m.id); });
    a.addEventListener('pointerleave', () => orbitEls[m.orbit].classList.remove('highlighted'));
    nodesBox.appendChild(a);
    moonLinks.push({ a, id: m.id, wrap: m.wrap, el: c, moon: m, index: i });
  });
  const live = NODES.map((n, i) => {
    const o = orbits[n.orbit];
    const base = angleFor(o, n);
    const a = document.createElement('a');
    a.className = `node node-${n.side}${n.wrap ? ' node-wrap' : ''}`;
    a.href = `#${n.id}`;
    a.style.setProperty('--d', n.d);
    a.style.setProperty('--i', i);
    a.innerHTML = `<span class="label"><b>${labelHTML(labels[n.id], n.wrap)}</b><i></i></span>`;
    a.prepend(moonEl(n.d, n.tone || 'lit', i + 11));
    a.addEventListener('click', (e) => {
      e.preventDefault();
      orbitEls[n.orbit].classList.remove('highlighted');
      onNavigate(n.id, a.querySelector('.moon'));
    });
    a.addEventListener('pointerenter', () => { orbitEls[n.orbit].classList.add('highlighted'); onHover?.(n.id); });
    a.addEventListener('pointerleave', () => orbitEls[n.orbit].classList.remove('highlighted'));
    nodesBox.appendChild(a);
    return { ...n, o, base, a, phase: Math.random() * 6.28 };
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf;
  const t0 = performance.now();
  function tick(now) {
    const t = (now - t0) / 1000;
    live.forEach((n) => {
      const p = onEllipse(n.o, n.base + (reduce ? 0 : Math.sin(t * 0.16 + n.phase) * 0.012));
      Object.assign(n.a.style, pos(p.x, p.y));
    });
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    setLabels(lb) {
      [...live.map((n) => ({ a: n.a, id: n.id, wrap: n.wrap })), ...moonLinks].forEach(({ a, id, wrap }) => {
        a.querySelector('b').innerHTML = labelHTML(lb[id], wrap);
      });
    },
    relayout() {},
    climb: () => climb(top),
    // a planet's node, and a painter for a bigger copy of its moon (same surface and light)
    planet(id) {
      const moon = moonLinks.find((n) => n.id === id);
      if (moon) return { el: moon.el, paint: (radius) => paintMoon(moon.moon.d, moon.moon.tone, moon.index + 3, radius) };
      const i = NODES.findIndex((n) => n.id === id);
      if (i < 0) return null;
      const n = live[i];
      // close up, the brightly lit planets are toned down so their surface doesn't wash out
      const gain = { hot: 0.62, red: 0.72 }[n.tone] || 1;
      return { el: n.a.querySelector('.moon'), paint: (radius) => paintMoon(n.d, n.tone || 'lit', i + 11, radius, gain) };
    },
    stop() { cancelAnimationFrame(raf); },
  };
}
