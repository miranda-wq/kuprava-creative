// Planet view. Clicking one of Miranda's planets dives into it: the home page
// zooms past the planet while star streaks rush by, the planet grows into the
// middle of the screen, and the section's works fly out of it onto tilted
// orbits that keep circling it, in front of it and behind it. Drag, scroll or
// use the arrow keys to turn the orbits; every work opens in the lightbox.
// Leaving flies the works back in, shrinks the planet back to its place and
// zooms the home page back to normal.

const SPREAD = 0.75; // how far apart in time the works leave the planet (share of the flight)
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const lerp = (a, b, t) => a + (b - a) * t;
const out3 = (x) => 1 - (1 - x) ** 3;
const pad = (n) => String(n).padStart(2, '0');

export function createPlanetView({ items, planet, openItem, toSection, strings, order, total, covered }) {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const root = document.createElement('div');
  root.className = 'pv';
  root.setAttribute('role', 'dialog');
  root.setAttribute('aria-modal', 'true');
  root.setAttribute('aria-labelledby', 'pv-title');
  root.setAttribute('aria-hidden', 'true');
  root.innerHTML = `
    <div class="pv-bg"></div>
    <canvas class="pv-warp" aria-hidden="true"></canvas>
    <svg class="pv-orbits pv-orbits-back" aria-hidden="true"></svg>
    <div class="pv-flare" aria-hidden="true"></div>
    <div class="pv-planet" aria-hidden="true"></div>
    <svg class="pv-orbits pv-orbits-front" aria-hidden="true"></svg>
    <div class="pv-cards"></div>
    <header class="pv-head">
      <div class="pv-num"><span></span><i></i><em></em></div>
      <h2 class="pv-title" id="pv-title"></h2>
      <p class="pv-subtitle" hidden></p>
      <p class="pv-intro"></p>
      <button class="pv-all" type="button"><span></span><i aria-hidden="true">→</i></button>
    </header>
    <button class="pv-back" type="button"><i class="pv-arrow" aria-hidden="true"></i><span></span></button>
    <p class="pv-hint" aria-hidden="true"></p>`;
  document.body.appendChild(root);
  const $ = (s) => root.querySelector(s);
  const warp = $('.pv-warp'), wctx = warp.getContext('2d');
  const planetBox = $('.pv-planet'), flareBox = $('.pv-flare'), cardsBox = $('.pv-cards');
  const orbBack = $('.pv-orbits-back'), orbFront = $('.pv-orbits-front');

  let state = 'closed'; // opening, open, closing
  let cur = null, L = null, cards = [], raf = 0, last = 0, time = 0, dive = null, pending = null;
  let flight = { from: 0, to: 0, t0: 0, dur: 1 };
  const spin = { auto: 1, vel: 0, drag: null, moved: false, hover: 0 };
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const painted = new Map();
  let timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { timers.forEach(clearTimeout); timers = []; };

  /* ---------------------------------------------------------------- layout */
  function layout() {
    const W = innerWidth, H = innerHeight, mobile = W < 760 || W / H < 1;
    // the title sits centred above; the planet and its orbits fill the space below it
    const D = mobile ? Math.min(W * 0.5, H * 0.26) : Math.min(H * 0.36, W * 0.25);
    const cx = W / 2, cy = mobile ? H * 0.64 : H * 0.63;
    const cw = mobile ? 82 : clamp(W * 0.09, 110, 158);
    const rings = mobile
      ? [{ rx: W * 0.44, ry: D * 0.55, rot: -8, speed: 0.07, angle: 0 }]
      : [
          { rx: Math.min(W * 0.28, D * 1.3), ry: D * 0.4, rot: -8, speed: 0.055, angle: 0 },
          { rx: Math.min(W * 0.42, D * 2), ry: D * 0.58, rot: 6, speed: -0.032, angle: 0 },
        ];
    return { W, H, mobile, D, cx, cy, cw, rings };
  }

  // a point on a tilted orbit; depth is +1 at the front of the orbit, -1 at the back
  function ringPoint(ring, a) {
    const r = (ring.rot * Math.PI) / 180, x = Math.cos(a) * ring.rx, y = Math.sin(a) * ring.ry;
    return { x: L.cx + x * Math.cos(r) - y * Math.sin(r), y: L.cy + x * Math.sin(r) + y * Math.cos(r), depth: Math.sin(a) };
  }

  function arc(ring, a0, a1) {
    let d = '';
    for (let k = 0; k <= 96; k++) {
      const p = ringPoint(ring, lerp(a0, a1, k / 96));
      d += `${k ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    }
    return d;
  }

  function place() {
    const w = L.D * 1.45; // the painted moon carries its glow around the disc
    for (const box of [planetBox, flareBox]) Object.assign(box.style, { width: `${w}px`, height: `${w}px`, left: `${L.cx - w / 2}px`, top: `${L.cy - w / 2}px` });
    // orbits: the back half behind the planet, the front half in front of it
    for (const s of [orbBack, orbFront]) s.setAttribute('viewBox', `0 0 ${L.W} ${L.H}`);
    orbBack.innerHTML = L.rings.map((r, i) => `<path class="${i ? '' : 'red'}" pathLength="1" d="${arc(r, Math.PI, Math.PI * 2)}"/>`).join('');
    orbFront.innerHTML = L.rings.map((r, i) => `<path class="${i ? '' : 'red'}" pathLength="1" d="${arc(r, 0, Math.PI)}"/>`).join('');
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    warp.width = Math.round(L.W * dpr);
    warp.height = Math.round(L.H * dpr);
    cards.forEach((c) => sizeCard(c));
  }

  function sizeCard(c) {
    c.ring = Math.min(c.ring, L.rings.length - 1);
    Object.assign(c.frame.style, { width: `${L.cw}px`, height: `${Math.round(L.cw / c.ar)}px` });
  }

  /* ---------------------------------------------------------------- works */
  function build(list) {
    cardsBox.innerHTML = '';
    const n = list.length, inner = L.rings.length > 1 ? Math.round(n * 0.44) : n;
    return list.map((it, k) => {
      const ring = k < inner ? 0 : 1, idx = ring ? k - inner : k, count = ring ? n - inner : inner;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pv-card';
      b.classList.toggle('preserve-proportions', !!it.preserveProportions);
      b.setAttribute('aria-label', it.title);
      b.innerHTML = '<span class="pv-frame"><img alt="" decoding="async" /><i class="pv-shade"></i></span><span class="pv-cap"></span>';
      const img = b.querySelector('img');
      img.addEventListener('load', () => img.classList.add('in'), { once: true });
      img.src = it.thumb;
      b.querySelector('.pv-cap').textContent = it.title;
      b.addEventListener('click', (e) => {
        if (spin.moved) { e.preventDefault(); return; }
        openItem(it);
      });
      const enter = () => spin.hover++, leave = () => (spin.hover = Math.max(0, spin.hover - 1));
      b.addEventListener('pointerenter', enter);
      b.addEventListener('pointerleave', leave);
      b.addEventListener('focus', enter);
      b.addEventListener('blur', leave);
      cardsBox.appendChild(b);
      const c = { el: b, frame: b.querySelector('.pv-frame'), shade: b.querySelector('.pv-shade'), ring, a: (idx / count) * Math.PI * 2 + (ring ? 0.35 : 0), k: n > 1 ? k / (n - 1) : 0, phase: Math.random() * 6.28, ar: it.preserveProportions ? it.w / it.h : clamp(it.w / it.h, 0.62, 1.6) };
      sizeCard(c);
      return c;
    });
  }

  function texts() {
    if (!cur) return;
    const t = strings(), i = order.indexOf(cur.id);
    $('.pv-num span').textContent = pad(i + 1);
    $('.pv-num em').textContent = pad(order.length);
    const section = t.sections[cur.id];
    root.classList.toggle('has-subtitle', !!section.subtitle);
    $('.pv-title').textContent = section.title;
    const subtitle = $('.pv-subtitle');
    subtitle.textContent = section.subtitle || '';
    subtitle.hidden = !section.subtitle;
    $('.pv-intro').textContent = section.intro;
    $('.pv-all span').textContent = section.cta || `${t.viewAll} · ${total(cur.id)} ${t.works}`;
    $('.pv-back span').textContent = t.back;
    $('.pv-hint').textContent = section.hint || t.pvHint;
  }

  /* ---------------------------------------------------------------- the loop */
  const streaks = Array.from({ length: 170 }, () => ({ a: Math.random() * Math.PI * 2, r0: Math.random() ** 1.5, len: 0.06 + Math.random() * 0.22, w: 0.5 + Math.random() * 1.5, red: Math.random() < 0.4 }));

  function drawWarp(now) {
    if (!dive) return;
    const tau = clamp((now - dive.t0) / dive.dur);
    wctx.clearRect(0, 0, warp.width, warp.height);
    if (tau >= 1) { dive = null; return; }
    const v = dive.reverse ? 1 - tau : tau, travel = v * v, alpha = Math.sin(Math.PI * tau) ** 1.3;
    const k = warp.width / L.W, R = Math.hypot(L.W, L.H);
    wctx.globalCompositeOperation = 'lighter';
    wctx.lineCap = 'round';
    for (const s of streaks) {
      const r1 = (s.r0 * 0.25 + travel * 1.1) * R, r2 = r1 + s.len * R * (0.15 + travel);
      const c = Math.cos(s.a), sn = Math.sin(s.a);
      wctx.strokeStyle = s.red ? `rgba(255,70,55,${(alpha * 0.75).toFixed(3)})` : `rgba(255,240,236,${(alpha * 0.6).toFixed(3)})`;
      wctx.lineWidth = s.w * k;
      wctx.beginPath();
      wctx.moveTo((dive.ox + c * r1) * k, (dive.oy + sn * r1) * k);
      wctx.lineTo((dive.ox + c * r2) * k, (dive.oy + sn * r2) * k);
      wctx.stroke();
    }
  }

  const flightAt = (now) => lerp(flight.from, flight.to, clamp((now - flight.t0) / flight.dur));

  function tick(now) {
    raf = requestAnimationFrame(tick);
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    if (covered()) return; // the lightbox is open over the view
    time += dt;
    drawWarp(now);

    // the orbits turn on their own, stop under the pointer, and carry on after a drag or a scroll
    spin.auto += ((reduce || spin.hover || spin.drag ? 0 : 1) - spin.auto) * Math.min(1, dt * 3);
    if (!spin.drag) spin.vel *= Math.pow(0.06, dt);
    for (const r of L.rings) r.angle += r.speed * spin.auto * dt + (spin.drag ? 0 : spin.vel * dt);

    mouse.x += (mouse.tx - mouse.x) * Math.min(1, dt * 4);
    mouse.y += (mouse.ty - mouse.y) * Math.min(1, dt * 4);
    if (!reduce) planetBox.style.translate = `${(mouse.x * -18).toFixed(1)}px ${(mouse.y * -12).toFixed(1)}px`;

    const fl = flightAt(now);
    for (const c of cards) {
      const ring = L.rings[c.ring], p = ringPoint(ring, ring.angle + c.a), near = (p.depth + 1) / 2;
      const q = clamp(fl * (1 + SPREAD) - c.k * SPREAD), e = reduce ? 1 : out3(q);
      const par = reduce ? 0 : 0.4 + near * 0.9;
      const bob = reduce ? 0 : Math.sin(time * 0.9 + c.phase) * 6;
      const x = lerp(L.cx, p.x + mouse.x * 46 * par, e);
      const y = lerp(L.cy, p.y + bob + mouse.y * 26 * par, e);
      const s = (0.52 + 0.48 * near) * (c.ring ? 0.92 : 1) * lerp(0.12, 1, e);
      const rot = reduce ? 0 : Math.sin(time * 0.5 + c.phase) * 2.2;
      const st = c.el.style;
      st.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0) translate(-50%,-50%) scale(${s.toFixed(3)}) rotate(${rot.toFixed(2)}deg)`;
      st.opacity = clamp(q * 3).toFixed(3);
      // works leave from behind the planet, then take their place in front of or behind it
      st.zIndex = e < 0.45 ? 40 : p.depth > 0 ? 60 + Math.round(p.depth * 35) : 10 + Math.round(near * 70);
      st.pointerEvents = q > 0.95 ? 'auto' : 'none';
      c.shade.style.opacity = ((1 - near) * 0.72).toFixed(3);
    }
  }

  /* ---------------------------------------------------------------- open and close */
  function paintPlanet(id) {
    const P = planet(id);
    if (!P) return null;
    const radius = Math.round(Math.min(340, (layout().D * Math.min(window.devicePixelRatio || 1, 2)) / 2) / 20) * 20;
    const key = `${id}:${radius}`;
    if (!painted.has(key)) painted.set(key, P.paint(radius));
    return painted.get(key);
  }

  // start where the planet sits on the home page, at its size there
  const flipFrom = () => `translate(${(cur.ox - L.cx).toFixed(1)}px, ${(cur.oy - L.cy).toFixed(1)}px) scale(${Math.max(0.01, cur.od / L.D).toFixed(4)})`;

  function origin(el) {
    const r = el?.getBoundingClientRect();
    if (!r || !r.width) return null;
    return { ox: r.left + r.width / 2, oy: r.top + r.height / 2, od: el.classList.contains('moon') ? r.width / 1.45 : r.width };
  }

  const inertEls = () => document.querySelectorAll('main, .topbar, .footer, .rail, .menu');

  function open(id, el) {
    if (state !== 'closed') return;
    L = layout();
    const list = items(id, L.mobile ? 10 : 16);
    if (!list.length) { toSection(id); return; }
    const o = origin(el) || { ox: L.cx, oy: L.cy, od: 20 };
    cur = { id, el, ...o };
    state = 'opening';
    clearTimers();

    const canvas = paintPlanet(id);
    planetBox.replaceChildren(...(canvas ? [canvas] : []));
    cards = build(list);
    place();
    texts();
    flight = { from: 0, to: 0, t0: 0, dur: 1 };
    spin.vel = 0; spin.hover = 0; time = 0;
    planetBox.style.transition = 'none';
    planetBox.style.transform = flipFrom();

    // the home page zooms past the planet: both scale around it
    const stage = document.querySelector('.stage'), sr = stage.getBoundingClientRect(), bs = document.body.style;
    bs.setProperty('--pv-ox', `${(cur.ox - sr.left).toFixed(1)}px`);
    bs.setProperty('--pv-oy', `${(cur.oy - sr.top).toFixed(1)}px`);
    bs.setProperty('--pv-cx', `${cur.ox.toFixed(1)}px`);
    bs.setProperty('--pv-cy', `${cur.oy.toFixed(1)}px`);
    if (el) el.style.visibility = 'hidden';
    document.body.classList.add('pv-anim', 'pv-open', 'locked');
    inertEls().forEach((n) => (n.inert = true));
    root.classList.add('on');
    root.setAttribute('aria-hidden', 'false');
    history.pushState({ pv: id }, '', `#${id}`);
    last = 0;
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);

    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (state !== 'opening') return;
      document.body.classList.add('pv-zoom');
      planetBox.style.transition = `transform ${reduce ? 0.6 : 1.25}s cubic-bezier(0.7, 0, 0.18, 1)`;
      planetBox.style.transform = 'none';
      if (!reduce) dive = { t0: performance.now(), dur: 1100, reverse: false, ox: cur.ox, oy: cur.oy };
      later(reduce ? 250 : 700, () => { flight = { from: 0, to: 1, t0: performance.now(), dur: reduce ? 500 : 1500 }; });
      later(reduce ? 200 : 1050, () => root.classList.add('show'));
      later(reduce ? 300 : 900, () => $('.pv-back').focus({ preventScroll: true }));
      later(reduce ? 800 : 2300, () => { if (state === 'opening') state = 'open'; });
    }));
  }

  function close({ section = false } = {}) {
    if (!cur || state === 'closing') return;
    clearTimers();
    state = 'closing';
    root.classList.remove('show');
    const now = performance.now();
    flight = { from: flightAt(now), to: 0, t0: now, dur: reduce ? 300 : 750 };

    if (section) {
      // straight to the section: fade the view out over the home page, then scroll
      root.classList.add('fade');
      later(550, () => {
        document.body.classList.remove('pv-anim', 'pv-zoom');
        const id = cur.id;
        finish(false);
        toSection(id);
      });
      return;
    }

    later(reduce ? 150 : 450, () => {
      root.classList.add('leaving');
      // the planet's centre doesn't move while the home page scales around it
      const o = origin(cur.el);
      if (o) Object.assign(cur, { ox: o.ox, oy: o.oy });
      planetBox.style.transition = `transform ${reduce ? 0.5 : 1.15}s cubic-bezier(0.6, 0, 0.25, 1)`;
      planetBox.style.transform = flipFrom();
      document.body.classList.remove('pv-zoom');
      if (!reduce) dive = { t0: performance.now(), dur: 1000, reverse: true, ox: cur.ox, oy: cur.oy };
    });
    later(reduce ? 750 : 1650, () => finish(true));
  }

  function finish(focus) {
    clearTimers();
    const el = cur?.el;
    if (el) el.style.visibility = '';
    root.classList.remove('on', 'show', 'leaving', 'fade');
    root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pv-open', 'pv-anim', 'pv-zoom', 'locked');
    inertEls().forEach((n) => (n.inert = false));
    cancelAnimationFrame(raf);
    wctx.clearRect(0, 0, warp.width, warp.height);
    dive = null;
    cardsBox.innerHTML = '';
    cards = [];
    cur = null;
    state = 'closed';
    if (focus) el?.closest('a')?.focus({ preventScroll: true });
  }

  // leaving goes through the browser history, so the back button closes the view too
  function requestClose(opts = {}) {
    if (!cur || state === 'closing') return;
    if (history.state?.pv) { pending = opts; history.back(); } else close(opts);
  }
  window.addEventListener('popstate', () => {
    if (cur && state !== 'closing') close(pending || {});
    pending = null;
  });

  /* ---------------------------------------------------------------- input */
  $('.pv-back').addEventListener('click', () => requestClose());
  $('.pv-all').addEventListener('click', () => requestClose({ section: true }));

  root.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || e.target.closest('.pv-back, .pv-all')) return;
    spin.drag = { x: e.clientX, t: performance.now() };
    spin.moved = false;
    spin.vel = 0;
  });
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'mouse') { mouse.tx = e.clientX / innerWidth - 0.5; mouse.ty = e.clientY / innerHeight - 0.5; }
    if (!spin.drag || !L) return;
    const dx = e.clientX - spin.drag.x, now = performance.now();
    if (Math.abs(dx) > 0) {
      if (Math.abs(e.clientX - spin.drag.x) > 3) spin.moved = true;
      const da = -dx / (L.rings[0].rx * 1.1); // drag right, the front of the orbit follows to the right
      for (const r of L.rings) r.angle += da;
      spin.vel = lerp(spin.vel, da / Math.max(0.008, (now - spin.drag.t) / 1000), 0.5);
      spin.drag.x = e.clientX;
      spin.drag.t = now;
    }
  });
  window.addEventListener('pointerup', () => {
    if (!spin.drag) return;
    spin.drag = null;
    setTimeout(() => (spin.moved = false), 0); // the click that ends a drag doesn't open a work
  });
  root.addEventListener('wheel', (e) => {
    e.preventDefault();
    spin.vel -= (Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * 0.004;
  }, { passive: false });

  window.addEventListener('resize', () => {
    if (!cur) return;
    const angles = L.rings.map((r) => r.angle);
    L = layout();
    L.rings.forEach((r, i) => (r.angle = angles[i] || 0));
    place();
  });

  return {
    open,
    close: () => requestClose(),
    isOpen: () => !!cur,
    nudge: (dir) => { spin.vel -= dir * 0.9; },
    refresh: texts,
    // paint the planet and fetch its first works before it is clicked
    prefetch(id) {
      const go = () => {
        paintPlanet(id);
        items(id, 16).forEach((it) => { new Image().src = it.thumb; });
      };
      (window.requestIdleCallback || ((f) => setTimeout(f, 60)))(go);
    },
  };
}
