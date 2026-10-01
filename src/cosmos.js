// The cosmic background: a red spiral galaxy, a deep star field, tilted
// orbital rings and slowly travelling planets, with bloom for the glow.
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const RED = new THREE.Color('#ff2b2b');
const EMBER = new THREE.Color('#ff6a4d');
const WHITE = new THREE.Color('#ffe9e4');

function softPointMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    uniforms: { uTime: { value: 0 }, uPixel: { value: Math.min(window.devicePixelRatio, 2) } },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform float uPixel;
      varying vec3 vColor;
      varying float vTw;
      void main() {
        vColor = color;
        vTw = 0.65 + 0.35 * sin(uTime * 1.7 + aPhase * 6.2831);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * uPixel * (300.0 / -mv.z);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      varying vec3 vColor;
      varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a *= a;
        gl_FragColor = vec4(vColor * vTw, a);
      }`,
  });
}

function galaxy(count) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  const arms = 3;
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    const r = Math.pow(Math.random(), 1.25) * 38 + 1.5;
    const arm = (i % arms) / arms * Math.PI * 2;
    const spin = r * 0.23;
    const spread = (1 - r / 40) * 0.9 + 0.15;
    const rx = (Math.random() - 0.5) * spread * r * 0.35;
    const ry = (Math.random() - 0.5) * spread * 1.6;
    const rz = (Math.random() - 0.5) * spread * r * 0.35;
    const a = arm + spin;
    pos[i * 3] = Math.cos(a) * r + rx;
    pos[i * 3 + 1] = ry * (1 - r / 45);
    pos[i * 3 + 2] = Math.sin(a) * r + rz;
    const t = Math.min(1, r / 30);
    c.copy(WHITE).lerp(Math.random() > 0.35 ? RED : EMBER, 0.35 + t * 0.6);
    if (Math.random() < 0.06) c.copy(WHITE);
    const dim = (0.16 + Math.random() * 0.5) * (r < 6 ? 0.55 : 1);
    col[i * 3] = c.r * dim; col[i * 3 + 1] = c.g * dim; col[i * 3 + 2] = c.b * dim;
    size[i] = Math.random() < 0.015 ? 2.2 + Math.random() * 1.6 : 0.45 + Math.random() * 0.9;
    phase[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  return new THREE.Points(g, softPointMaterial());
}

function starfield(count) {
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const size = new Float32Array(count);
  const phase = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(80 + Math.random() * 160);
    pos.set([v.x, v.y, v.z], i * 3);
    const red = Math.random() < 0.18;
    const k = 0.4 + Math.random() * 0.6;
    col.set(red ? [1 * k, 0.25 * k, 0.22 * k] : [k, k * 0.92, k * 0.9], i * 3);
    size[i] = 0.6 + Math.random() * 1.8;
    phase[i] = Math.random();
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
  g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
  return new THREE.Points(g, softPointMaterial());
}

function ring(rx, rz, color, opacity, tilt) {
  const curve = new THREE.EllipseCurve(0, 0, rx, rz, 0, Math.PI * 2);
  const pts = curve.getPoints(360).map((p) => new THREE.Vector3(p.x, 0, p.y));
  const g = new THREE.BufferGeometry().setFromPoints(pts);
  const m = new THREE.LineBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false });
  const line = new THREE.LineLoop(g, m);
  line.rotation.set(tilt[0], tilt[1], tilt[2]);
  line.userData = { rx, rz };
  return line;
}

function planetMaterial(tint) {
  return new THREE.ShaderMaterial({
    uniforms: { uTint: { value: new THREE.Color(tint) }, uLight: { value: new THREE.Vector3(1, 0.4, 0.6).normalize() }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      void main() {
        vN = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vV = normalize(-mv.xyz);
        vP = position;
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uTint; uniform vec3 uLight; uniform float uTime;
      varying vec3 vN; varying vec3 vV; varying vec3 vP;
      float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,45.164))) * 43758.5453); }
      float n(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),
                   mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      void main() {
        vec3 q = normalize(vP) * 3.0;
        float tex = n(q) * 0.55 + n(q * 2.7) * 0.3 + n(q * 7.0) * 0.15;
        float diff = max(dot(vN, uLight), 0.0);
        float rim = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
        vec3 base = mix(vec3(0.05,0.03,0.03), uTint * 0.55, tex);
        vec3 c = base * (0.06 + diff * 1.25) + uTint * rim * 0.55 * (0.3 + diff);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
}

export function createCosmos(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0x000000, 1);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.004);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 600);
  camera.position.set(0, 9, 60);
  camera.lookAt(0, 0, 0);

  const small = window.innerWidth < 760;
  const world = new THREE.Group();
  world.rotation.set(0.1, 0, -0.12);
  scene.add(world);

  const gal = galaxy(small ? 11000 : 24000);
  world.add(gal);
  const stars = starfield(small ? 1600 : 3200);
  scene.add(stars);

  // orbital rings
  const rings = [
    ring(40, 17, 0xff3b3b, 0.22, [0.0, 0, 0.0]),
    ring(30, 30, 0xffe2dc, 0.09, [1.2, 0.3, 0.2]),
    ring(52, 22, 0xffffff, 0.08, [0.15, 0.2, 0.05]),
    ring(24, 10, 0xff4a4a, 0.28, [-0.05, 0.5, 0.1]),
    ring(46, 46, 0xff3030, 0.07, [1.45, -0.4, 0.4]),
    ring(64, 26, 0xffd9d0, 0.05, [0.25, -0.2, -0.1]),
  ];
  rings.forEach((r) => world.add(r));

  // planets that travel along the rings
  const planets = [
    { ring: 0, r: 2.6, speed: 0.035, t: 0.2, tint: '#ff3a2a' },
    { ring: 3, r: 1.1, speed: 0.08, t: 2.4, tint: '#ff5544' },
    { ring: 1, r: 1.5, speed: -0.05, t: 4.1, tint: '#d9b1a8' },
    { ring: 2, r: 0.9, speed: 0.06, t: 1.0, tint: '#ff2020' },
    { ring: 5, r: 2.6, speed: 0.012, t: 5.5, tint: '#ff4433' },
  ].map((p) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(p.r, 48, 32), planetMaterial(p.tint));
    rings[p.ring].add(mesh);
    return { ...p, mesh };
  });

  // a hot core
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xff9a88 })
  );
  world.add(core);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), small ? 0.45 : 0.75, 0.42, small ? 0.3 : 0.22);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 1 ? 62 : 50;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener('pointermove', (e) => {
    mouse.tx = e.clientX / window.innerWidth - 0.5;
    mouse.ty = e.clientY / window.innerHeight - 0.5;
  });

  let scrollK = 0;
  let running = true;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clock = new THREE.Clock();

  function frame() {
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    const sp = reduce ? 0.15 : 1;
    gal.rotation.y += dt * 0.025 * sp;
    stars.rotation.y += dt * 0.004 * sp;
    gal.material.uniforms.uTime.value = t;
    stars.material.uniforms.uTime.value = t;
    planets.forEach((p) => {
      p.t += dt * p.speed * sp;
      const { rx, rz } = rings[p.ring].userData;
      p.mesh.position.set(Math.cos(p.t) * rx, 0, Math.sin(p.t) * rz);
      p.mesh.rotation.y += dt * 0.2;
    });
    mouse.x += (mouse.tx - mouse.x) * 0.04;
    mouse.y += (mouse.ty - mouse.y) * 0.04;
    camera.position.x = mouse.x * 9;
    camera.position.y = 9 - mouse.y * 5 + scrollK * 18;
    camera.position.z = 58 - scrollK * 20;
    camera.lookAt(0, scrollK * -6, 0);
    composer.render();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  return {
    setScroll(k) { scrollK = k; },
    pause() { running = false; },
    resume() { if (!running) { running = true; clock.getDelta(); requestAnimationFrame(frame); } },
  };
}
