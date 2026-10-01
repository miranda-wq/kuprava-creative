// Opening scene Miranda asked for: Merani rises out of the darkness, its
// headlights flare and an engine roars, then the universe opens.
// Drop a real recording at public/audio/merani-engine.mp3 to replace the
// synthesized engine.

function synthEngine(ctx) {
  const now = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.setValueAtTime(0.0001, now);
  out.gain.exponentialRampToValueAtTime(0.55, now + 0.25);
  out.gain.setValueAtTime(0.55, now + 2.6);
  out.gain.exponentialRampToValueAtTime(0.0001, now + 4.2);

  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < 1024; i++) { const x = (i / 512) - 1; curve[i] = Math.tanh(x * 3.2); }
  shaper.curve = curve;

  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(380, now);
  lp.frequency.exponentialRampToValueAtTime(2600, now + 1.5);
  lp.frequency.exponentialRampToValueAtTime(900, now + 3.6);
  lp.Q.value = 4;

  // rpm curve: idle → rev → shift → rev → settle
  const f = (o, mult) => {
    const p = o.frequency;
    p.setValueAtTime(38 * mult, now);
    p.exponentialRampToValueAtTime(150 * mult, now + 1.0);
    p.exponentialRampToValueAtTime(95 * mult, now + 1.18);
    p.exponentialRampToValueAtTime(205 * mult, now + 2.3);
    p.exponentialRampToValueAtTime(60 * mult, now + 4.0);
  };
  [[1, 'sawtooth', 0.5], [2, 'square', 0.18], [0.5, 'sawtooth', 0.35], [3.01, 'sawtooth', 0.08]].forEach(([m, type, g]) => {
    const o = ctx.createOscillator();
    o.type = type;
    f(o, m);
    const gg = ctx.createGain();
    gg.gain.value = g;
    o.connect(gg).connect(shaper);
    o.start(now);
    o.stop(now + 4.3);
  });
  // exhaust rumble from noise
  const buf = ctx.createBuffer(1, ctx.sampleRate * 4.3, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.6;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(120, now);
  bp.frequency.exponentialRampToValueAtTime(700, now + 2.2);
  bp.Q.value = 1.2;
  const ng = ctx.createGain();
  ng.gain.value = 0.35;
  noise.connect(bp).connect(ng).connect(shaper);
  noise.start(now);

  shaper.connect(lp).connect(out).connect(ctx.destination);
}

async function playEngine() {
  try {
    const a = new Audio(`${import.meta.env.BASE_URL}audio/merani-engine.mp3`);
    a.volume = 0.9;
    await a.play();
    return;
  } catch {}
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    await ctx.resume();
    synthEngine(ctx);
  } catch {}
}

export function runIntro({ image, t, onDone }) {
  let seen = false;
  try { seen = sessionStorage.getItem('kc-intro') === '1'; } catch {}
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (seen || !image) { onDone(); return; }

  const el = document.createElement('div');
  el.className = 'intro';
  el.innerHTML = `
    <div class="intro-stage">
      <div class="intro-frame">
        <img src="${import.meta.env.BASE_URL}${image.src}" alt="Merani by Miranda Kuprava" />
        <i class="lamp l"></i><i class="lamp r"></i>
      </div>
    </div>
    <div class="intro-vignette"></div>
    <div class="intro-text">
      <div class="intro-name">MIRANDA KUPRAVA</div>
      <div class="intro-role">${t.artistRole}</div>
    </div>
    <div class="intro-ui">
      <button class="intro-enter"><span>${t.enter}</span><em>♪ ${t.sound}</em></button>
      <button class="intro-skip">${t.skip}</button>
    </div>`;
  document.body.appendChild(el);
  document.body.classList.add('locked');

  // keep the headlights on the eyes whatever the crop (image is 1402×1122)
  const frame = el.querySelector('.intro-frame');
  const fit = () => {
    const W = innerWidth, H = innerHeight, ar = image.w / image.h;
    let w = W, h = W / ar;
    if (h < H) { h = H; w = H * ar; }
    // on tall screens keep the sculpture's head in view
    const shiftX = (W - w) / 2;
    frame.style.width = `${w}px`;
    frame.style.height = `${h}px`;
    frame.style.left = `${shiftX}px`;
    frame.style.top = `${Math.max(H - h, -h * 0.02)}px`; // keep the head and headlights in frame
  };
  fit();
  addEventListener('resize', fit);

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    try { sessionStorage.setItem('kc-intro', '1'); } catch {}
    el.classList.add('out');
    document.body.classList.remove('locked');
    onDone();
    setTimeout(() => { el.remove(); removeEventListener('resize', fit); }, 1600);
  };

  let auto;
  const rise = () => {
    if (el.classList.contains('rise')) return;
    requestAnimationFrame(() => el.classList.add('rise'));
    auto = setTimeout(finish, reduce ? 2500 : 12000);
  };
  const im = el.querySelector('img');
  if (im.complete) rise(); else { im.addEventListener('load', rise, { once: true }); setTimeout(rise, 2500); }

  el.querySelector('.intro-enter').addEventListener('click', () => {
    clearTimeout(auto);
    el.classList.add('ignite');
    playEngine();
    setTimeout(finish, 2600);
  });
  el.querySelector('.intro-skip').addEventListener('click', () => { clearTimeout(auto); finish(); });
}
