// The home page emblem, drawn after Miranda's reference image: a K woven from
// fine threads (an hourglass stem, a dark arm with KUPRAVA climbing its
// staircase, a leg and a ribbon trailing off to the lower right), framed by
// construction lines, orbits and moons, with her ten planets as links.
// Coordinates are pixels of the reference image, 1672 × 941.
const NS = 'http://www.w3.org/2000/svg';
const W = 1672, H = 941;
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};
const lerp = (a, b, t) => a + (b - a) * t;
const mix = (p, q, t) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
const f1 = (n) => Math.round(n * 10) / 10;

/* ---------------------------------------------------------------- curves */
// a curve is [start, ...segments]; a segment is [c1, c2, end] (cubic) or [end] (line)
function sample(curve, n = 72) {
  const pts = [curve[0]];
  let p = curve[0];
  for (const seg of curve.slice(1)) {
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      if (seg.length === 1) pts.push(mix(p, seg[0], t));
      else {
        const u = 1 - t, [a, b, c] = seg;
        pts.push([
          u * u * u * p[0] + 3 * u * u * t * a[0] + 3 * u * t * t * b[0] + t * t * t * c[0],
          u * u * u * p[1] + 3 * u * u * t * a[1] + 3 * u * t * t * b[1] + t * t * t * c[1],
        ]);
      }
    }
    p = seg[seg.length - 1];
  }
  // resample evenly by length so two edges can be woven point for point
  const acc = [0];
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = acc[acc.length - 1], out = [];
  for (let k = 0, j = 0; k <= n; k++) {
    const d = (k / n) * total;
    while (j < acc.length - 2 && acc[j + 1] < d) j++;
    const t = (d - acc[j]) / (acc[j + 1] - acc[j] || 1);
    out.push(mix(pts[j], pts[j + 1], t));
  }
  return out;
}
const toD = (pts) => 'M' + pts.map((p) => `${f1(p[0])},${f1(p[1])}`).join('L');
const curveD = (c) => `M${c[0].join(',')}` + c.slice(1).map((s) => (s.length === 1 ? `L${s[0].join(',')}` : `C${s.map((q) => q.join(',')).join(' ')}`)).join('');

// threads strung between two edges; twist crosses them over from one edge to the other
function weave(parent, A, B, n, color, { twist = false, cls = '' } = {}) {
  const g = el('g', { class: `weave ${cls}` }, parent);
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const pts = A.map((a, k) => mix(a, B[k], twist ? lerp(t, 1 - t, k / (A.length - 1)) : t));
    const c = color(t); // [r, g, b, opacity], or [paint, opacity] for a gradient
    el('path', c.length === 2 ? { d: toD(pts), stroke: c[0], 'stroke-opacity': c[1] } : { d: toD(pts), stroke: `rgba(${c.join(',')})` }, g);
  }
  return g;
}

/* ---------------------------------------------------------------- the K */
const STEM_L = [[590, 185], [[660, 187], [690, 222], [690, 292]], [[690, 520]], [[690, 612], [662, 680], [604, 693]]];
const STEM_R = [[880, 185], [[806, 189], [790, 262], [790, 332]], [[790, 470]], [[772, 504], [754, 545], [754, 592]], [[755, 642], [768, 684], [792, 693]]];
const ARCH = [[754, 592], [[755, 532], [790, 494], [830, 492]]];
const LEG_IN = [[826, 494], [[872, 524], [918, 604], [948, 693]]];
const LEG_OUT = [[870, 456], [[924, 504], [980, 600], [1012, 693]]];
const TAIL_L = [[904, 426], [[928, 545], [966, 640], [1012, 693]], [[1090, 790], [1320, 862], [1560, 884]]];
const TAIL_R = [[966, 372], [[1032, 500], [1110, 598], [1190, 665]], [[1290, 750], [1430, 822], [1600, 850]]];

// the arm and its staircase
const ARM = { x0: 790, y0: 511, slope: 0.88 };
const armY = (x) => ARM.y0 - ARM.slope * (x - ARM.x0);
const STEPS = { x: 806, y: 458, w: 46, h: 40.5 };
const LETTERS = ['U', 'P', 'R', 'A', 'V', 'A'];

const WHITE = [236, 232, 232], RED = [255, 30, 22];
// threads are either the reference's saturated red or a neutral silver; where they overlap they blend on screen
const tone = (w, o) => [...(w > 0.5 ? WHITE : RED), o];

function drawK(svg) {
  const k = el('g', { class: 'k' }, svg);

  // tail ribbon, fading out toward the corner
  const tailL = sample(TAIL_L, 90), tailR = sample(TAIL_R, 90);
  const tail = weave(k, tailL, tailR, 60, (t) => ['url(#tailTone)', t < 0.08 ? 0.5 : 0.32], { cls: 'w-tail' });
  tail.setAttribute('mask', 'url(#tailFade)');

  // stem: threads fan out of the serifs into a narrow waist
  const sl = sample(STEM_L), sr = sample(STEM_R);
  // the left threads turn silver down the stem's body and stay red in the serifs
  const stem = weave(k, sl, sr, 84, (t) => (t < 0.16 ? ['url(#stemSilver)', 0.55] : t > 0.95 ? tone(1, 0.3) : tone(0, 0.24)), { cls: 'w-stem' });
  // a soft bloom of the same threads behind them, for the reference's glowing red
  stem.id = 'stemWeave';
  k.insertBefore(el('use', { href: '#stemWeave', class: 'k-bloom' }), stem);
  weave(k, sl, sr, 34, () => tone(0, 0.13), { twist: true, cls: 'w-stem w-twist' });

  // the web strung from the cap line into the stem's brackets
  const web = el('g', { class: 'weave w-web' }, k);
  for (let i = 0; i <= 44; i++) {
    const t = i / 44;
    const a = [lerp(700, 880, t), 185], b = sr[Math.round(lerp(26, 2, t))];
    el('line', { x1: a[0], y1: a[1], x2: f1(b[0]), y2: f1(b[1]) }, web);
    const c = [lerp(590, 680, t), 185], d = sl[Math.round(lerp(1, 20, t))];
    el('line', { x1: c[0], y1: c[1], x2: f1(d[0]), y2: f1(d[1]) }, web);
  }

  // leg
  const li = sample(LEG_IN, 48), lo = sample(LEG_OUT, 48);
  weave(k, li, lo, 44, (t) => (t > 0.95 ? tone(0, 0.45) : tone(1, 0.6)), { cls: 'w-leg' });

  // arm: a dark band that hides the threads behind it
  const x1 = STEPS.x + STEPS.w * LETTERS.length;
  el('path', { class: 'arm', d: `M${ARM.x0},${ARM.y0} L${x1},${f1(armY(x1))} L${x1 + 22},${f1(armY(x1))} L${x1 + 18},${f1(armY(x1) + 8)} L${ARM.x0 + 16},${ARM.y0 + 14} Z` }, k);
  el('path', { class: 'k-edge red arm-under', d: `M${ARM.x0 + 16},${ARM.y0 + 14} L${x1 + 18},${f1(armY(x1) + 8)}`, pathLength: 1 }, k);

  // glowing edges
  const edges = el('g', { class: 'k-edges' }, k);
  [[STEM_L, 'red stem-l'], [STEM_R, 'red stem-r'], [ARCH, 'red'], [LEG_IN, 'white'], [LEG_OUT, 'white'], [TAIL_L, 'red tail']].forEach(([c, cls]) => {
    const e = el('path', { d: curveD(c), class: `k-edge ${cls}`, pathLength: 1 }, edges);
    if (cls.includes('stem')) e.style.stroke = `url(#${cls.includes('stem-l') ? 'edgeL' : 'edgeR'})`;
    if (cls.includes('tail')) e.style.stroke = 'url(#tailEdge)';
  });

  // staircase: blocks, treads and the letters of KUPRAVA
  const stairs = el('g', { class: 'stairs' }, svg);
  let prof = '';
  LETTERS.forEach((ch, i) => {
    const xl = STEPS.x + STEPS.w * i, xr = xl + STEPS.w, y = STEPS.y - STEPS.h * i;
    el('path', { class: 'step-face', d: `M${xl},${y} L${xr},${y} L${xr},${f1(Math.max(y, armY(xr)))} L${xl},${f1(armY(xl))} Z` }, stairs);
    prof += `${i ? 'L' : `M${xl},${f1(armY(xl))} L`}${xl},${y} L${xr},${y} `;
    const g = el('g', { class: 'step', style: `--i:${i}` }, stairs);
    el('text', { class: 'step-letter', x: xl + STEPS.w * 0.47, y: y - 3, 'text-anchor': 'middle' }, g).textContent = ch;
    el('circle', { class: 'step-glint', cx: xl, cy: y, r: 2 }, g);
  });
  const yTop = STEPS.y - STEPS.h * (LETTERS.length - 1);
  prof += `L${x1 + 30},${f1(yTop)}`;
  el('path', { class: 'step-path', d: prof, pathLength: 1 }, stairs);
  el('circle', { class: 'step-spark', cx: x1 + 34, cy: f1(yTop + 1), r: 3 }, stairs);
}

/* ---------------------------------------------------------------- orbits, construction, sparks */
const ORBITS = [
  { cx: 835, cy: 415, rx: 495, ry: 470, rot: 0, cls: '' },
  { cx: 830, cy: 522, rx: 795, ry: 150, rot: -6, cls: '' },
  { cx: 880, cy: 330, rx: 612, ry: 285, rot: -8, cls: 'red' },
  { cx: 840, cy: 472, rx: 425, ry: 152, rot: -8, cls: 'faint' },
  { cx: 820, cy: 440, rx: 990, ry: 470, rot: -14, cls: 'faint' },
  { cx: 640, cy: 600, rx: 300, ry: 290, rot: 0, cls: 'faint' },
];

// Miranda's ten planets, placed as in the reference (the three she added later take its unlabelled moons)
const NODES = [
  { id: 'sculpture', x: 832, y: 70, d: 28, side: 'right', orbit: 2, line: true, dy: -4, tone: 'hot' },
  { id: 'kinetic', x: 1226, y: 137, d: 30, side: 'right', orbit: 0, line: true, dy: -10 },
  { id: 'christmas', x: 1358, y: 278, d: 42, side: 'right', orbit: 0, wrap: true, line: true, dy: 4, tone: 'grey' },
  { id: 'brand', x: 1467, y: 354, d: 24, side: 'right', orbit: 2, wrap: true, line: true, dy: 8, tone: 'red' },
  { id: 'functional', x: 1282, y: 641, d: 32, side: 'right', orbit: 0, line: true, dash: true },
  { id: 'public', x: 417, y: 185, d: 24, side: 'left', orbit: 2, line: true, tone: 'hot' },
  { id: 'spaces', x: 340, y: 400, d: 24, side: 'left', orbit: 0, wrap: true, dash: true, dy: 10, tone: 'red' },
  { id: 'competitions', x: 483, y: 483, d: 34, side: 'left', orbit: 3, wrap: true, dy: 10 },
  { id: 'melita', x: 378, y: 628, d: 40, side: 'left', orbit: 0, wrap: true, dy: 24 },
  { id: 'outdoor', x: 548, y: 772, d: 26, side: 'left', orbit: 1, wrap: true, dy: 8, tone: 'grey' },
];
const MOONS = [
  { x: 1240, y: 480, d: 142, tone: 'big' },
  { x: 398, y: 362, d: 11, tone: 'grey' },
  { x: 1582, y: 262, d: 6, tone: 'red' },
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

function paintMoon(d, tone, seed) {
  const L = LIGHTS[tone] || LIGHTS.lit;
  const key = norm(L.key), fill = norm(L.fill);
  const R = Math.round(Math.min(150, Math.max(14, d * 1.25)));
  const M = Math.round(R * GLOW);
  const S = (R + M) * 2;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  // glow on the lit side
  const gx = S / 2 + key[0] * R * 0.35, gy = S / 2 - key[1] * R * 0.35;
  const g = x.createRadialGradient(gx, gy, R * 0.7, gx, gy, R + M);
  g.addColorStop(0, `rgba(255,40,30,${0.55 * L.glow})`);
  g.addColorStop(1, 'rgba(255,40,30,0)');
  x.fillStyle = g;
  x.fillRect(0, 0, S, S);
  // the disc: height field first, then shade with its slopes
  const rnd = (() => { let s = seed * 9301 + 49297; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  const craters = Array.from({ length: 34 }, () => {
    const v = norm([rnd() - 0.5, rnd() - 0.5, rnd() * 0.9 + 0.1]);
    return { v, r: 0.03 + rnd() ** 2.5 * 0.22, k: 0.3 + rnd() * 0.5 };
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
      const dist = Math.acos(Math.min(1, n[0] * cr.v[0] + n[1] * cr.v[1] + n[2] * cr.v[2])) / cr.r;
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
      const v = L.albedo[ch] * alb[k] * (dk * L.keyI * L.keyC[ch] + df * L.fillI * L.fillC[ch] + 0.025) + rim * L.keyC[ch];
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
export function buildHero({ svg, nodesBox, onNavigate, labels }) {
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.innerHTML = '';
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <linearGradient id="stepFace" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f0ecec" stop-opacity="0.6"/>
      <stop offset="0.45" stop-color="#ff6656" stop-opacity="0.3"/>
      <stop offset="1" stop-color="#ff1e14" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="stemSilver" gradientUnits="userSpaceOnUse" x1="0" y1="185" x2="0" y2="693">
      <stop offset="0" stop-color="#ff2a1e"/><stop offset="0.15" stop-color="#ff2a1e"/><stop offset="0.27" stop-color="#ece8e8"/>
      <stop offset="0.76" stop-color="#ece8e8"/><stop offset="0.9" stop-color="#ff8a7c"/><stop offset="1" stop-color="#ff5a4c"/>
    </linearGradient>
    <linearGradient id="tailTone" gradientUnits="userSpaceOnUse" x1="930" y1="480" x2="1250" y2="760">
      <stop offset="0" stop-color="#ff1e16"/>
      <stop offset="0.3" stop-color="#ff3a2e"/>
      <stop offset="0.65" stop-color="#e6e2e2"/>
    </linearGradient>
    <linearGradient id="tailEdge" gradientUnits="userSpaceOnUse" x1="900" y1="430" x2="1200" y2="760">
      <stop offset="0" stop-color="#ff2418"/>
      <stop offset="0.6" stop-color="#ff2418" stop-opacity="0.6"/>
      <stop offset="1" stop-color="#ff2418" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="tailGrad" gradientUnits="userSpaceOnUse" x1="960" y1="560" x2="1580" y2="880">
      <stop offset="0" stop-color="#fff"/>
      <stop offset="0.3" stop-color="#fff" stop-opacity="0.85"/>
      <stop offset="0.7" stop-color="#fff" stop-opacity="0.3"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="edgeL" gradientUnits="userSpaceOnUse" x1="0" y1="185" x2="0" y2="693">
      <stop offset="0" stop-color="#ff4a3c"/><stop offset="0.24" stop-color="#ff4a3c"/><stop offset="0.36" stop-color="#fff2ee" stop-opacity="0.75"/>
      <stop offset="0.7" stop-color="#fff2ee" stop-opacity="0.75"/><stop offset="0.84" stop-color="#ff4a3c"/><stop offset="1" stop-color="#ff4a3c"/>
    </linearGradient>
    <linearGradient id="edgeR" gradientUnits="userSpaceOnUse" x1="0" y1="185" x2="0" y2="693">
      <stop offset="0" stop-color="#ff4a3c"/><stop offset="0.3" stop-color="#ff4a3c"/><stop offset="0.42" stop-color="#fff2ee" stop-opacity="0.45"/>
      <stop offset="0.58" stop-color="#fff2ee" stop-opacity="0.45"/><stop offset="0.72" stop-color="#ff4a3c"/><stop offset="1" stop-color="#ff4a3c"/>
    </linearGradient>
    <mask id="tailFade" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="url(#tailGrad)"/></mask>`;

  const orbitG = el('g', { class: 'orbits' }, svg);
  ORBITS.forEach((o, i) => {
    el('ellipse', { cx: o.cx, cy: o.cy, rx: o.rx, ry: o.ry, transform: `rotate(${o.rot} ${o.cx} ${o.cy})`, class: `orbit orbit-${i} ${o.cls}`, pathLength: 1000 }, orbitG);
  });

  const cons = el('g', { class: 'construct' }, svg);
  [[669, 58, 669, 700], [405, 185, 885, 185], [560, 693, 1080, 693], [790, 300, 790, 470]].forEach(([a, b, c, d]) => {
    el('line', { x1: a, y1: b, x2: c, y2: d, pathLength: 1000 }, cons);
  });
  [[669, 512], [669, 592], [790, 470]].forEach(([cx, cy]) => el('circle', { cx, cy, r: 2.6, class: 'node-dot' }, cons));

  drawK(svg);

  const glint = el('g', { class: 'glint', transform: 'translate(669 185)' }, svg);
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
  MOONS.forEach((m, i) => {
    const c = moonEl(m.d, m.tone, i + 3);
    Object.assign(c.style, pos(m.x, m.y));
    nodesBox.appendChild(c);
  });
  const live = NODES.map((n, i) => {
    const o = ORBITS[n.orbit];
    const base = angleFor(o, n);
    const p0 = onEllipse(o, base);
    const off = { x: n.x - p0.x, y: n.y - p0.y };
    const a = document.createElement('a');
    a.className = `node node-${n.side}${n.wrap ? ' node-wrap' : ''}${n.line ? ' has-line' : ''}${n.dash ? ' has-dash' : ''}`;
    a.href = `#${n.id}`;
    a.style.setProperty('--d', n.d);
    a.style.setProperty('--dy', n.dy || 0);
    a.style.setProperty('--i', i);
    a.innerHTML = `<span class="label"><b>${labelHTML(labels[n.id], n.wrap)}</b><i></i></span>`;
    a.prepend(moonEl(n.d, n.tone || 'lit', i + 11));
    a.addEventListener('click', (e) => { e.preventDefault(); onNavigate(n.id); });
    a.addEventListener('pointerenter', () => svg.classList.add(`hl-${n.orbit}`));
    a.addEventListener('pointerleave', () => svg.classList.remove(`hl-${n.orbit}`));
    nodesBox.appendChild(a);
    return { ...n, o, base, off, a, phase: Math.random() * 6.28 };
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf;
  const t0 = performance.now();
  function tick(now) {
    const t = (now - t0) / 1000;
    live.forEach((n) => {
      const p = onEllipse(n.o, n.base + (reduce ? 0 : Math.sin(t * 0.16 + n.phase) * 0.012));
      Object.assign(n.a.style, pos(p.x + n.off.x, p.y + n.off.y));
    });
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    setLabels(lb) { live.forEach((n) => { n.a.querySelector('b').innerHTML = labelHTML(lb[n.id], n.wrap); }); },
    relayout() {},
    stop() { cancelAnimationFrame(raf); },
  };
}
