// One timeline for the opening scene, shared by the sound
// (tools/build_engine_audio.mjs renders public/audio/merani-engine.mp3 from it)
// and the picture (src/intro.js reads the same rpm so the scene follows the engine).
// Times are seconds from the start of the mp3.

export const BEATS = {
  crank: 0.2, // starter motor
  fire: 0.8, // the engine catches
  idle: 1.85, // the idle loop takes over from the start-up recording
  blips: [2.75, 3.58], // peaks of the two throttle blips
  pull: 4.3, // full throttle to the limiter
  limiter: 5.55,
  release: 5.88, // lift off
  end: 8.9,
};

export const IDLE_RPM = 1181;
export const MAX_RPM = 6950;

// [time, rpm, throttle 0..1]
export const KEYS = [
  [0, IDLE_RPM, 0], [BEATS.idle, IDLE_RPM, 0],
  [2.55, IDLE_RPM, 1], [2.75, 4300, 1], [2.8, 4300, 0], [3.25, 1300, 0],
  [3.35, IDLE_RPM, 1], [3.58, 5200, 1], [3.63, 5200, 0], [4.15, 1350, 0],
  [BEATS.pull, IDLE_RPM, 1], [BEATS.limiter, 6900, 1],
  [5.62, 6650, 1], [5.68, 6950, 1], [5.75, 6650, 1], [5.82, 6950, 1],
  [BEATS.release, 6900, 0], [7.4, 1250, 0], [8.6, IDLE_RPM, 0],
];

const ease = (x) => x * x * (3 - 2 * x);

// rpm and throttle at time t
export function engineAt(t) {
  const i = KEYS.findIndex((k) => k[0] > t);
  if (i === -1) return KEYS[KEYS.length - 1].slice(1);
  if (i === 0) return KEYS[0].slice(1);
  const [ta, ra, ha] = KEYS[i - 1], [tb, rb, hb] = KEYS[i];
  const x = (t - ta) / (tb - ta);
  const pull = rb > ra && hb === 1 && tb - ta > 1; // the long pull keeps accelerating
  const k = pull ? x ** 1.6 : rb < ra ? 1 - (1 - x) ** 2.2 : ease(x);
  return [ra + (rb - ra) * k, x < 1 ? ha : hb];
}
