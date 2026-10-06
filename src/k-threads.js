// Draws the K traced from Miranda's reference (tools/trace_k.py writes
// k-threads.json): crisp lines at the screen's own resolution, coloured as the
// reference is coloured where each thread runs, with a glow made from the lines
// themselves. Redrawn whenever the stage changes size.

const GAIN = 1.8; // threads are thinner than the glow they stand for in the reference
const WIDTH = 0.9; // in reference pixels

export async function drawThreads(layer) {
  const { default: data } = await import('./k-threads.json');

  // decode, and bucket the segments by colour so each colour is one stroke
  const buckets = new Map();
  for (const [path, hex] of data.lines) {
    let x = path[0], y = path[1], px = x / 4, py = y / 4;
    for (let i = 2, k = 1; i < path.length; i += 2, k++) {
      x += path[i]; y += path[i + 1];
      const key = hex.slice(k * 3, k * 3 + 3);
      let segs = buckets.get(key);
      if (!segs) buckets.set(key, (segs = []));
      segs.push(px, py, x / 4, y / 4);
      px = x / 4; py = y / 4;
    }
  }
  // light, not paint: a dim thread is a transparent one, so nothing behind the K is darkened
  const styles = [...buckets.keys()].map((key) => {
    const source = [...key].map((c) => parseInt(c, 16) * 17);
    const [r, g, b] = source.map((c) => Math.min(255, c * GAIN));
    const m = Math.max(r, g, b, 1);
    const sourceMax = Math.max(...source), sourceMin = Math.min(...source);
    const isRed = source[0] === sourceMax && source[0] - sourceMin >= sourceMax * 0.28 && source[1] <= source[0] * 0.82;
    // Recolor only the original red threads; preserve every neutral and other-color thread.
    if (isRed) return `rgba(255,43,47,${(m / 255).toFixed(3)})`;
    return `rgba(${Math.round((r / m) * 255)},${Math.round((g / m) * 255)},${Math.round((b / m) * 255)},${(m / 255).toFixed(3)})`;
  });
  const segments = [...buckets.values()];

  const [wide, near, crisp] = layer.querySelectorAll('canvas');
  function render() {
    const box = layer.getBoundingClientRect();
    if (!box.width) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.round(box.width * dpr), h = Math.round(box.height * dpr);
    const s = w / data.width;
    [wide, near, crisp].forEach((c) => { c.width = w; c.height = h; });
    const ctx = crisp.getContext('2d');
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineWidth = Math.max(0.9, WIDTH * s);
    ctx.globalAlpha = (WIDTH * s) / ctx.lineWidth; // on small screens the lines can't get thinner, so they get fainter
    segments.forEach((segs, i) => {
      ctx.strokeStyle = styles[i];
      ctx.beginPath();
      for (let j = 0; j < segs.length; j += 4) {
        ctx.moveTo(segs[j] * s, segs[j + 1] * s);
        ctx.lineTo(segs[j + 2] * s, segs[j + 3] * s);
      }
      ctx.stroke();
    });
    // the glow layers are the same drawing, blurred by CSS
    near.getContext('2d').drawImage(crisp, 0, 0);
    wide.getContext('2d').drawImage(crisp, 0, 0);
  }
  render();
  let t;
  new ResizeObserver(() => { clearTimeout(t); t = setTimeout(render, 120); }).observe(layer);
}
