// The hero emblem: a glowing serif K woven from fine threads, KUPRAVA climbing
// its diagonal like a staircase, and the seven sections as orbiting nodes.
const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}, parent) => {
  const n = document.createElementNS(NS, tag);
  for (const k in attrs) n.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(n);
  return n;
};

// Orbits the nodes travel along (viewBox 1600×900)
const ORBITS = [
  { cx: 800, cy: 400, rx: 520, ry: 335, rot: -6 },
  { cx: 805, cy: 395, rx: 690, ry: 250, rot: 9 },
  { cx: 800, cy: 430, rx: 600, ry: 330, rot: 4 },
];

// Resting spots for Miranda's ten planets around the K
const NODES = [
  { id: 'sculpture', x: 792, y: 66, orbit: 0, side: 'right', size: 16 },
  { id: 'kinetic', x: 1172, y: 128, orbit: 1, side: 'right', size: 14 },
  { id: 'brand', x: 1365, y: 290, orbit: 1, side: 'right', size: 12, wrap: true },
  { id: 'functional', x: 1300, y: 455, orbit: 2, side: 'right', size: 13 },
  { id: 'christmas', x: 1226, y: 625, orbit: 0, side: 'right', size: 15 },
  { id: 'public', x: 400, y: 176, orbit: 1, side: 'left', size: 12 },
  { id: 'spaces', x: 335, y: 320, orbit: 1, side: 'left', size: 11, wrap: true },
  { id: 'competitions', x: 300, y: 485, orbit: 2, side: 'left', size: 12, wrap: true, w: 13 },
  { id: 'melita', x: 370, y: 630, orbit: 0, side: 'left', size: 17, wrap: true },
  { id: 'outdoor', x: 440, y: 735, orbit: 2, side: 'left', size: 12, wrap: true },
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

export function buildHero({ svg, nodesBox, onNavigate, labels }) {
  svg.innerHTML = '';
  const defs = el('defs', {}, svg);
  defs.innerHTML = `
    <linearGradient id="kFill" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1c0000"/>
      <stop offset="0.3" stop-color="#9e0b0b"/>
      <stop offset="0.44" stop-color="#ff3b3b"/>
      <stop offset="0.5" stop-color="#ffece7"/>
      <stop offset="0.57" stop-color="#ff3030"/>
      <stop offset="0.76" stop-color="#5e0404"/>
      <stop offset="1" stop-color="#160000"/>
      <animateTransform attributeName="gradientTransform" type="translate" values="-0.25 -0.25; 0.25 0.25; -0.25 -0.25" dur="14s" repeatCount="indefinite"/>
    </linearGradient>
    <linearGradient id="thread" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="1" stop-color="#ff2b2b" stop-opacity="0.65"/>
    </linearGradient>
    <radialGradient id="planet" cx="0.35" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#ffb3a6"/>
      <stop offset="0.35" stop-color="#ff2b2b"/>
      <stop offset="1" stop-color="#2a0000"/>
    </radialGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="9" result="b"/>
      <feColorMatrix in="b" type="matrix" values="1 0 0 0 0.2  0 0.15 0 0 0  0 0 0.15 0 0  0 0 0 1.4 0" result="r"/>
      <feMerge><feMergeNode in="r"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="soft"><feGaussianBlur stdDeviation="2.2"/></filter>
    <mask id="kMask"><rect width="1600" height="900" fill="black"/><text class="k-glyph" x="805" y="672" text-anchor="middle" fill="white">K</text></mask>
  `;

  // orbits
  const orbitG = el('g', { class: 'orbits' }, svg);
  ORBITS.forEach((o, i) => {
    el('ellipse', { cx: o.cx, cy: o.cy, rx: o.rx, ry: o.ry, transform: `rotate(${o.rot} ${o.cx} ${o.cy})`, class: `orbit orbit-${i}`, pathLength: 1000 }, orbitG);
  });
  el('ellipse', { cx: 820, cy: 470, rx: 760, ry: 170, transform: 'rotate(-4 820 470)', class: 'orbit orbit-faint', pathLength: 1000 }, orbitG);
  el('ellipse', { cx: 760, cy: 450, rx: 380, ry: 380, class: 'orbit orbit-faint', pathLength: 1000 }, orbitG);

  // construction lines
  const cons = el('g', { class: 'construct' }, svg);
  const cV = el('line', { x1: 668, y1: 10, x2: 668, y2: 900, pathLength: 1000 }, cons);
  const cT = el('line', { x1: 520, y1: 186, x2: 1120, y2: 186, pathLength: 1000 }, cons);
  const cB = el('line', { x1: 480, y1: 690, x2: 1150, y2: 690, pathLength: 1000 }, cons);

  // K: glow, threads, fill, outline
  const kG = el('g', { class: 'kgroup' }, svg);
  const glow = el('text', { class: 'k-glyph k-glow', x: 805, y: 672, 'text-anchor': 'middle', filter: 'url(#glow)' }, kG);
  glow.textContent = 'K';
  const threads = el('g', { class: 'k-threads', mask: 'url(#kMask)' }, kG);
  for (let i = 0; i <= 90; i++) {
    const t = i / 90;
    el('line', { x1: 560 + t * 260, y1: 160 + t * 30, x2: 760 + t * 420, y2: 720 - t * 520 }, threads);
    el('line', { x1: 580 + t * 120, y1: 720, x2: 900 + t * 230, y2: 180 + t * 520, class: 'warp' }, threads);
  }
  const fill = el('text', { class: 'k-glyph k-fill', x: 805, y: 672, 'text-anchor': 'middle' }, kG);
  fill.textContent = 'K';
  const line = el('text', { class: 'k-glyph k-line', x: 805, y: 672, 'text-anchor': 'middle' }, kG);
  line.textContent = 'K';

  // staircase of U P R A V A along the upper arm
  const stairs = el('g', { class: 'stairs' }, svg);
  const letters = ['U', 'P', 'R', 'A', 'V', 'A'];

  function layoutStairs() {
    stairs.innerHTML = '';
    let bb;
    try { bb = fill.getBBox(); } catch { return; }
    if (!bb || !bb.width) return;
    const sx0 = bb.x + bb.width * 0.2;
    [['x1', sx0], ['x2', sx0]].forEach(([k, v]) => cV.setAttribute(k, v));
    cT.setAttribute('x1', bb.x - 60); cT.setAttribute('x2', bb.x + bb.width + 40);
    const topY = bb.y + bb.height * 0.125; cT.setAttribute('y1', topY); cT.setAttribute('y2', topY);
    cB.setAttribute('x1', bb.x - 120); cB.setAttribute('x2', bb.x + bb.width + 80);
    cB.setAttribute('y1', 672 + 4); cB.setAttribute('y2', 672 + 4);
    // arm runs from the stem's middle up to the top-right serif
    // fixed to the glyph's geometry (font-size 800, baseline 672, cap top ≈ 168)
    const x0 = 748, y0 = 478;
    const x1 = 1018, y1 = 214;
    const n = letters.length;
    const dx = (x1 - x0) / n, dy = (y0 - y1) / n;
    let d = `M ${x0 - dx * 0.5} ${y0}`;
    letters.forEach((ch, i) => {
      const sx = x0 + dx * i, sy = y0 - dy * i;
      d += ` L ${sx} ${sy} L ${sx} ${sy - dy} L ${sx + dx} ${sy - dy}`;
      const g = el('g', { class: 'step', style: `--i:${i}` }, stairs);
      const tx = el('text', { x: sx + dx * 0.5, y: sy - dy * 0.22, 'text-anchor': 'middle', class: 'step-letter', 'font-size': Math.min(dx, dy) * 0.92 }, g);
      tx.textContent = ch;
    });
    d += ` L ${x1 + dx * 0.6} ${y1}`;
    el('path', { d, class: 'step-path', pathLength: 1000 }, stairs);
    el('circle', { cx: x1 + dx * 0.6, cy: y1, r: 3.2, class: 'step-spark' }, stairs);
  }
  layoutStairs();
  document.fonts?.ready.then(layoutStairs);

  // sparkles drifting near the emblem
  const sparks = el('g', { class: 'sparks' }, svg);
  for (let i = 0; i < 46; i++) {
    const a = Math.random() * Math.PI * 2, r = 120 + Math.random() * 520;
    el('circle', { cx: 800 + Math.cos(a) * r * 1.3, cy: 430 + Math.sin(a) * r * 0.55, r: Math.random() * 1.7 + 0.4, style: `--d:${(Math.random() * 6).toFixed(2)}s;--t:${(3 + Math.random() * 5).toFixed(2)}s` }, sparks);
  }

  // nodes
  nodesBox.innerHTML = '';
  const live = NODES.map((n, i) => {
    const o = ORBITS[n.orbit];
    const base = angleFor(o, n);
    const p0 = onEllipse(o, base);
    const off = { x: n.x - p0.x, y: n.y - p0.y };
    const btn = document.createElement('a');
    btn.className = `node node-${n.side}${n.wrap ? ' node-wrap' : ''}`;
    btn.href = `#${n.id}`;
    btn.style.setProperty('--size', `${n.size}px`);
    btn.style.setProperty('--i', i);
    if (n.w) btn.style.setProperty('--lw', `${n.w}em`);
    btn.innerHTML = `<span class="planet"></span><span class="label"><b>${labels[n.id]}</b><i></i></span>`;
    btn.addEventListener('click', (e) => { e.preventDefault(); onNavigate(n.id); });
    btn.addEventListener('pointerenter', () => svg.classList.add(`hl-${n.orbit}`));
    btn.addEventListener('pointerleave', () => svg.classList.remove(`hl-${n.orbit}`));
    nodesBox.appendChild(btn);
    return { ...n, o, base, off, btn, phase: Math.random() * 6.28 };
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf;
  const t0 = performance.now();
  function tick(now) {
    const t = (now - t0) / 1000;
    live.forEach((n) => {
      const a = n.base + (reduce ? 0 : Math.sin(t * 0.18 + n.phase) * 0.045);
      const p = onEllipse(n.o, a);
      n.btn.style.left = `${((p.x + n.off.x) / 1600) * 100}%`;
      n.btn.style.top = `${((p.y + n.off.y) / 900) * 100}%`;
    });
    raf = requestAnimationFrame(tick);
  }
  raf = requestAnimationFrame(tick);

  return {
    setLabels(lb) {
      live.forEach((n) => { n.btn.querySelector('b').textContent = lb[n.id]; });
    },
    relayout: layoutStairs,
    stop() { cancelAnimationFrame(raf); },
  };
}
