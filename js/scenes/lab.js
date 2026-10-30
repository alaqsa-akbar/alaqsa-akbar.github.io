// Chapter 4 — an anomalous-materials lab with one test station per project.
// Gordon walks the line, each station powers up as he arrives, and the last
// visitor comes out of the orange portal.
import * as THREE from 'three';
import { Kit, PLATE } from '../bricks.js';
import { Actor, range } from '../actor.js';
import { island, printed, hash2, equations } from './common.js';

// 21 hand keypoints for a few handshapes (normalised 0..1), drawn as a skeleton
const HANDS = [
  // open palm
  [[.5, .95], [.36, .86], [.27, .74], [.2, .62], [.14, .52], [.38, .6], [.36, .42], [.35, .3], [.34, .2], [.5, .58], [.5, .38], [.5, .25], [.5, .14], [.61, .6], [.63, .42], [.64, .3], [.65, .21], [.71, .66], [.75, .52], [.78, .43], [.8, .35]],
  // fist with thumb out
  [[.5, .95], [.35, .86], [.25, .76], [.17, .68], [.1, .6], [.38, .6], [.36, .48], [.4, .56], [.42, .62], [.5, .58], [.49, .46], [.52, .55], [.53, .62], [.61, .6], [.61, .48], [.62, .56], [.62, .62], [.7, .64], [.71, .54], [.7, .6], [.69, .66]],
  // two fingers
  [[.5, .95], [.37, .86], [.32, .74], [.36, .66], [.42, .62], [.4, .6], [.36, .42], [.33, .3], [.31, .18], [.52, .58], [.55, .4], [.57, .28], [.59, .16], [.61, .6], [.6, .5], [.57, .58], [.55, .64], [.7, .64], [.68, .55], [.65, .6], [.63, .66]],
];
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [5, 9], [9, 10], [10, 11], [11, 12], [9, 13], [13, 14], [14, 15], [15, 16], [13, 17], [0, 17], [17, 18], [18, 19], [19, 20]];

function robot(k, x, y, z) {
  // a small red-and-blue robot on a plinth; reads "Transformer" without saying it
  k.fill(x, y, z, 4, 3, 1, 'dbg');
  k.tile(x, y + 3, z, 4, 3, 'lbg');
  const Y = y + 4;
  k.brick(x + 0.5, Y, z + 1, 1, 1, 'darkblue'); k.brick(x + 2.5, Y, z + 1, 1, 1, 'darkblue');
  k.brick(x + 0.5, Y + 3, z + 1, 1, 1, 'blue'); k.brick(x + 2.5, Y + 3, z + 1, 1, 1, 'blue');
  k.plate(x + 0.5, Y + 6, z + 1, 3, 1, 'lbg', { studs: false });
  k.fill(x, Y + 7, z + 0.5, 4, 2, 2, 'red', { max: 8 });
  k.brick(x - 1, Y + 9, z + 1, 1, 1, 'red'); k.brick(x + 4, Y + 9, z + 1, 1, 1, 'red');
  k.brick(x - 1, Y + 6, z + 1, 1, 1, 'blue'); k.brick(x + 4, Y + 6, z + 1, 1, 1, 'blue');
  k.brick(x + 1, Y + 13, z + 1, 2, 1, 'blue', { h: 3 });
  k.plate(x + 1.5, Y + 16, z + 1, 1, 1, 'silver');
}

function buildHeadcrab() {
  const px = 0.11;
  const tex = (draw) => { const c = document.createElement('canvas'); c.width = c.height = 16; draw(c.getContext('2d')); const t = new THREE.CanvasTexture(c); t.magFilter = t.minFilter = THREE.NearestFilter; t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace; return t; };
  const shellTop = tex((g) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const n = hash2(x, y, 4); g.fillStyle = n < 0.2 ? '#B9A27A' : n < 0.75 ? '#D6C49C' : '#E4D6B4'; g.fillRect(x, y, 1, 1); }
    g.fillStyle = '#A88E64'; for (let x = 2; x < 14; x += 4) g.fillRect(x, 3, 2, 10);
  });
  const shellSide = tex((g) => { g.fillStyle = '#C7B48B'; g.fillRect(0, 0, 16, 16); g.fillStyle = '#A88E64'; g.fillRect(0, 12, 16, 4); });
  const maw = tex((g) => {
    g.fillStyle = '#C7B48B'; g.fillRect(0, 0, 16, 16);
    g.fillStyle = '#6E1B16'; g.fillRect(3, 3, 10, 10); g.fillStyle = '#3B0A08'; g.fillRect(5, 5, 6, 6);
    g.fillStyle = '#EDE3CC'; for (let i = 3; i < 13; i += 2) { g.fillRect(i, 3, 1, 1); g.fillRect(i, 12, 1, 1); g.fillRect(3, i, 1, 1); g.fillRect(12, i, 1, 1); }
  });
  const legM = new THREE.MeshStandardMaterial({ color: '#B7A178', roughness: 0.8 });
  const side = new THREE.MeshStandardMaterial({ map: shellSide, roughness: 0.75 });
  const box = (w, h, d, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w * px, h * px, d * px), m); b.castShadow = true; return b; };
  const crab = new THREE.Group();
  const body = new THREE.Group(); crab.add(body);
  // carapace: wide and flat, a slight dome on top, the maw underneath
  const shell = box(14, 4, 14, [side, side, new THREE.MeshStandardMaterial({ map: shellTop, roughness: 0.7 }), new THREE.MeshStandardMaterial({ map: maw, roughness: 0.6 }), side, side]);
  const dome = box(9, 2, 9, new THREE.MeshStandardMaterial({ map: shellTop, roughness: 0.7 })); dome.position.y = 3 * px;
  const lip = box(10, 2, 2, side); lip.position.set(0, -0.5 * px, 7.5 * px);
  body.add(shell, dome, lip);
  // legs: [x, z, length, front?]; each has an upper and a lower segment
  const legs = [];
  for (const [x, z, len, front] of [[-5, 6, 9, 1], [5, 6, 9, 1], [-6, -4, 6, 0], [6, -4, 6, 0]]) {
    const hip = new THREE.Group(); hip.position.set(x * px, -1 * px, z * px);
    const upper = box(2, 2, len, legM); upper.position.z = (len / 2) * px * (front ? 1 : -1);
    const knee = new THREE.Group(); knee.position.z = len * px * (front ? 1 : -1);
    const lower = box(1.6, len * 0.8, 1.6, legM); lower.position.y = -(len * 0.4) * px;
    const claw = box(1, 2, 1, new THREE.MeshStandardMaterial({ color: '#2B2420' })); claw.position.y = -len * 0.8 * px;
    knee.add(lower, claw); hip.add(upper, knee); body.add(hip);
    hip.rotation.y = x < 0 ? -0.35 : 0.35; if (!front) hip.rotation.y *= -1;
    legs.push({ hip, knee, front, side: x < 0 ? -1 : 1 });
  }
  body.position.y = 0.55;
  crab.userData.pose = (mode, time) => {
    legs.forEach((l, i) => {
      const ph = time * 22 + i * 1.7;
      if (mode === 'run') { l.hip.rotation.x = Math.sin(ph) * 0.35; l.knee.rotation.x = 0.3 + Math.cos(ph) * 0.2; }
      else if (mode === 'leap') { l.hip.rotation.x = l.front ? -0.9 : 0.6; l.knee.rotation.x = l.front ? -0.6 : 0.4; } // claws up, reaching
      else if (mode === 'flail') { l.hip.rotation.x = Math.sin(ph * 1.6) * 0.8; l.knee.rotation.x = Math.cos(ph * 1.3) * 0.6; }
      else { l.hip.rotation.x = 0.1; l.knee.rotation.x = 0.35; }
    });
  };
  crab.userData.pose('idle', 0);
  return crab;
}

export function lab({ Blocky, crowbar, parts }) {
  const k = new Kit({ seed: 4 });
  const extra = new THREE.Group();
  const X0 = -14, Z0 = -6, W = 28, D = 12;
  const inside = (x, z) => x >= X0 && x < X0 + W && z >= Z0 && z < Z0 + D && !(x < X0 + 2 && z > Z0 + D - 3) && !(x > X0 + W - 3 && z > Z0 + D - 3);
  island(k, { x0: X0, z0: Z0, w: W, d: D, inside, colors: ['lbg', 'dbg', 'charcoal'],
    top: (x, z) => (z >= 3 ? ((x + z) % 4 < 2 ? 'yellow' : 'black') : (x + z) % 2 ? 'white' : 'silver'), topStuds: false });

  // back wall with an orange service stripe, panels, and an observation window
  for (let L = 0; L < 5; L++) {
    k.layer(X0, 1 + L * 3, Z0, W, 1, null, { h: 3, phase: L, cells: (x) => (L === 1 ? 'darkorange' : L === 4 ? 'dbg' : 'lbg') });
  }
  k.tile(X0, 16, Z0, W, 1, 'charcoal');
  // floor-level pipes
  k.round(-13, 1, -5, 1, 'pearl', { h: 3, kind: 'metal' });
  k.round(13, 1, -5, 1, 'pearl', { h: 3, kind: 'metal' });

  // the lambda, Black Mesa style, printed on a wall plate
  const lambda = printed(2.4, 2.4, (g, Wc, Hc) => {
    g.fillStyle = '#1D1E20'; g.beginPath(); g.arc(Wc / 2, Hc / 2, Wc * 0.48, 0, 7); g.fill();
    g.strokeStyle = '#FF8A18'; g.lineWidth = Wc * 0.07; g.beginPath(); g.arc(Wc / 2, Hc / 2, Wc * 0.4, 0, 7); g.stroke();
    g.lineCap = 'round'; g.lineWidth = Wc * 0.1;
    g.beginPath(); g.moveTo(Wc * 0.33, Hc * 0.28); g.quadraticCurveTo(Wc * 0.47, Hc * 0.27, Wc * 0.66, Hc * 0.74); g.stroke();
    g.beginPath(); g.moveTo(Wc * 0.52, Hc * 0.48); g.lineTo(Wc * 0.33, Hc * 0.74); g.stroke();
  });
  lambda.position.set(0, 1 * PLATE + 9 * PLATE, Z0 + 1.02);
  k.prop(lambda, { order: 0.6 });

  // portals at the wall ends, like the game's: a white-hot oval rim that flickers like flame,
  // a slow swirl inside, and a glow spilling onto the wall around it
  const portalMats = [];
  const portal = (color, x) => {
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, color: { value: new THREE.Color(color) }, seed: { value: x * 0.37 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform float time, seed; uniform vec3 color; varying vec2 vUv;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
        void main() {
          // the plane is bigger than the portal so the glow has room: the oval spans 0.78 of it
          vec2 q = (vUv - 0.5) * 2.0 / 0.78;
          float d = length(q), ang = atan(q.y, q.x);
          // flame-like wobble on the rim, crawling around the edge
          float flick = fbm(vec2(ang * 2.2 + seed, time * 1.6)) - 0.5;
          float edge = 1.0 + flick * 0.09;
          // inside: a slow swirl, darker towards the centre
          float sw = fbm(vec2(ang * 1.5 + d * 3.0 - time * 0.7 + seed, d * 4.0 - time * 0.4));
          vec3 inner = color * (0.35 + 0.9 * sw * d) + vec3(0.08) * smoothstep(0.55, 0.9, sw);
          float inside = 1.0 - smoothstep(edge - 0.02, edge, d);
          // the rim: a hot core with the colour around it
          float band = exp(-pow((d - edge * 0.93) / 0.075, 2.0));
          vec3 rim = mix(color * 2.4, vec3(2.2, 2.1, 2.0), smoothstep(0.55, 1.0, band)) * band;
          // glow outside the oval
          float halo = (1.0 - inside) * exp(-(d - edge) * 5.0) * 0.55;
          vec3 c = inner * inside * (1.0 - band) + rim + color * halo * 1.6;
          float alpha = clamp(inside * 0.95 + band + halo, 0.0, 1.0);
          gl_FragColor = vec4(c, alpha);
        }`,
      transparent: true, depthWrite: false, toneMapped: false,
    });
    portalMats.push(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2 / 0.78, 3.6 / 0.78), mat);
    m.position.set(x, 1 * PLATE + 2.2, Z0 + 1.03);
    k.prop(m, { order: 0.65 });
    const l = new THREE.PointLight(color, 7, 8, 2); l.position.set(x, 2.6, Z0 + 2); extra.add(l);
    m.userData.light = l;
    return m;
  };
  portal('#2A8CFF', -12);
  portal('#FF8A18', 12);

  // ---------- station 1: sign language capture ----------
  k.fill(-10, 1, -4, 4, 2, 1, 'dbg'); k.tile(-10, 4, -4, 4, 2, 'black');
  const signScreen = printed(4.2, 3.2, () => {}, { emissive: true, res: 100 });
  signScreen.position.set(-8, 1 * PLATE + 3 * PLATE + 2.1, -3.6);
  const signFrame = new THREE.Mesh(new THREE.BoxGeometry(4.5, 3.5, 0.3), new THREE.MeshPhysicalMaterial({ color: '#141518', roughness: 0.4 }));
  signFrame.position.copy(signScreen.position).add(new THREE.Vector3(0, 0, -0.17)); signFrame.castShadow = true;
  k.prop(signFrame, { order: 0.7 }); k.prop(signScreen, { order: 0.7 });
  // tripod camera aimed at the screen area
  k.bar(-10, 1, 0, 8, 'black'); k.brick(-10.5, 9, -0.5, 2, 1, 'black', { h: 2, studs: false });
  k.round(-10, 9.5, -1, 1, 'transdblue', { h: 1, studs: false });
  const drawSign = (p, time) => {
    const { ctx: g, canvas: c, tex } = signScreen.userData; const Wc = c.width, Hc = c.height;
    g.fillStyle = '#06090D'; g.fillRect(0, 0, Wc, Hc);
    if (p <= 0) { tex.needsUpdate = true; return; }
    const f = (time * 0.6) % HANDS.length, i0 = Math.floor(f), u = Math.min(1, (f - i0) * 2.2), A = HANDS[i0], B = HANDS[(i0 + 1) % HANDS.length];
    const pts = A.map((a, i) => [a[0] + (B[i][0] - a[0]) * u, a[1] + (B[i][1] - a[1]) * u]).map(([x, y]) => [Wc * 0.18 + x * Wc * 0.64, Hc * 0.05 + y * Hc * 0.8]);
    g.globalAlpha = p; g.strokeStyle = '#FF3B2F'; g.lineWidth = 3;
    for (const [a, b] of BONES) { g.beginPath(); g.moveTo(...pts[a]); g.lineTo(...pts[b]); g.stroke(); }
    g.fillStyle = '#fff'; for (const q of pts) { g.beginPath(); g.arc(q[0], q[1], 3.5, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(12, Hc - 18, Wc - 24, 5);
    g.fillStyle = '#FF3B2F'; g.fillRect(12, Hc - 18, (Wc - 24) * ((time * 0.25) % 1), 5);
    g.globalAlpha = 1; tex.needsUpdate = true;
  };

  // ---------- station 2: rain chamber with a patched stop sign ----------
  k.fill(-2, 1, -5, 5, 4, 1, 'dbg'); k.tile(-2, 4, -5, 5, 4, 'charcoal');
  for (let L = 0; L < 3; L++) {
    k.layer(-2, 5 + L * 3, -5, 5, 4, null, { h: 3, phase: L, cells: (x, z) => (x === -2 || x === 2 || z === -5 || z === -2 ? 'transclear' : null), studs: L === 2 });
  }
  k.tile(-2, 14, -5, 5, 4, 'transclear', { kind: 'trans' });
  k.bar(0, 5, -4, 4, 'lbg');
  const stop = printed(1.4, 1.4, (g, Wc, Hc) => {
    g.fillStyle = '#C91A09'; g.beginPath();
    for (let i = 0; i < 8; i++) { const a = Math.PI / 8 + (i * Math.PI) / 4; g.lineTo(Wc / 2 + Math.cos(a) * Wc * 0.48, Hc / 2 + Math.sin(a) * Hc * 0.48); }
    g.fill(); g.strokeStyle = '#fff'; g.lineWidth = Wc * 0.03; g.stroke();
    g.fillStyle = '#fff'; g.font = `700 ${Wc * 0.22}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('STOP', Wc / 2, Hc / 2);
    // the adversarial patch
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) { g.fillStyle = `hsl(${hash2(x, y, 1) * 360},80%,${40 + hash2(y, x, 2) * 30}%)`; g.fillRect(Wc * 0.56 + x * Wc * 0.05, Hc * 0.56 + y * Hc * 0.05, Wc * 0.05, Hc * 0.05); }
  });
  stop.position.set(0.5, 5 * PLATE + 4 * PLATE + 0.8, -3.6);
  k.prop(stop, { order: 0.75 });
  const RN = 160, rain = new Float32Array(RN * 6), rs = new Float32Array(RN * 3);
  for (let i = 0; i < RN; i++) rs.set([-1.8 + hash2(i, 1) * 4.6, hash2(i, 2), -4.8 + hash2(i, 3) * 3.6], i * 3);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rain, 3));
  const rainM = new THREE.LineBasicMaterial({ color: '#BFD8FF', transparent: true, opacity: 0, depthWrite: false });
  const rainL = new THREE.LineSegments(rg, rainM); rainL.frustumCulled = false; extra.add(rainL);
  const chamberLight = new THREE.PointLight('#9FC4FF', 0, 6, 2); chamberLight.position.set(0.5, 5, -3.5); extra.add(chamberLight);

  // ---------- station 3: the robot ----------
  robot(k, 7, 1, -5);
  const eyes = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.18, 0.05), new THREE.MeshBasicMaterial({ color: '#203040', toneMapped: false }));
  eyes.position.set(9, (1 + 4 + 13) * PLATE + 0.75, -2.97);
  k.prop(eyes, { order: 0.95 });
  const chest = printed(3.6, 2.2, (g, Wc, Hc) => {
    g.fillStyle = '#C91A09'; g.fillRect(0, 0, Wc, Hc);
    g.fillStyle = '#1E4C8C'; g.fillRect(Wc * 0.08, Hc * 0.12, Wc * 0.38, Hc * 0.42); g.fillRect(Wc * 0.54, Hc * 0.12, Wc * 0.38, Hc * 0.42);
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(Wc * 0.1, Hc * 0.14, Wc * 0.1, Hc * 0.38); g.fillRect(Wc * 0.56, Hc * 0.14, Wc * 0.1, Hc * 0.38);
    g.fillStyle = '#A0A5A9'; g.fillRect(Wc * 0.3, Hc * 0.66, Wc * 0.4, Hc * 0.2);
  });
  chest.position.set(9, (1 + 4 + 7) * PLATE + 1.2, -2.47);
  k.prop(chest, { order: 0.9 });
  const robotLight = new THREE.PointLight('#5AB4FF', 0, 6, 2); robotLight.position.set(9, 8, -2.5); extra.add(robotLight);

  // ceiling-ish strip lights hanging off the wall
  for (const x of [-9, 0, 9]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(4, 0.15, 0.4), new THREE.MeshBasicMaterial({ color: '#EEF4FF', toneMapped: false }));
    strip.position.set(x, 16 * PLATE + 0.6, Z0 + 1.6); k.prop(strip, { order: 0.6 });
  }

  // headcrab, built in Gordon's blocky style: flat beige carapace, red maw underneath,
  // long front claws. It waits in the orange portal.
  const crab = buildHeadcrab();
  crab.visible = false;
  extra.add(crab);
  const hitLight = new THREE.PointLight('#FFE6B0', 0, 6, 2); extra.add(hitLight);

  // Gordon
  const gordon = new Blocky('assets/skins/gordon.png', { name: 'gordon' });
  const bar = crowbar(); gordon.hold(bar, bar.userData.grip);
  const look = { head: 0, headPitch: 0.05, armR: 0.25 };
  const S1 = [-8, 0.6], S2 = [0.5, 0.8], S3 = [9, 0.8];
  const PORTAL = new THREE.Vector3(12, 2.6, -4.6);
  const FACE_PORTAL = Math.atan2(PORTAL.x - S3[0], PORTAL.z - S3[1]);
  const actor = new Actor(gordon, [
    { t: 0, at: [-12.5, 2], face: 1.6, pose: look },
    { t: 0.06, at: [-12.5, 2], face: 1.6, via: [[-10.5, 1.4]] },
    { t: 0.14, at: S1, face: Math.PI, pose: look },
    { t: 0.3, at: S1, face: Math.PI, pose: { ...look, head: 0.25 } },
    { t: 0.34, at: S1, face: 1.5 },
    { t: 0.46, at: S2, face: Math.PI, pose: look },
    { t: 0.62, at: S2, face: Math.PI, pose: { ...look, head: -0.2 } },
    { t: 0.66, at: S2, face: 1.5 },
    { t: 0.78, at: S3, face: Math.PI, pose: { ...look, headPitch: -0.25 } },
    { t: 0.85, at: S3, face: Math.PI, pose: { ...look, headPitch: -0.25 } },
    { t: 0.88, at: S3, face: FACE_PORTAL, pose: { armR: 0.5, headPitch: 0.1 } },
    { t: 0.905, at: S3, face: FACE_PORTAL, pose: { armR: 0.6, headPitch: 0.05 } },
    { t: 0.928, at: S3, face: FACE_PORTAL + 0.25, pose: { armR: 2.8, armROut: 0.35, waist: 0.35, headPitch: -0.1 } }, // wind-up
    { t: 0.942, at: S3, face: FACE_PORTAL - 0.15, pose: { armR: 0.9, armROut: -0.25, waist: -0.3, headPitch: -0.05 } }, // swing
    { t: 0.97, at: S3, face: FACE_PORTAL, pose: { armR: 0.7, armROut: -0.1, headPitch: -0.15 } },
    { t: 1, at: S3, face: FACE_PORTAL - 0.3, pose: { armR: 0.3, head: -0.4 } },
  ], { floor: 1 });
  k.prop(gordon.root, { order: 1 });
  actor.update(0);

  const maths = equations([
    ['Attention(Q, K, V) = softmax(QKᵀ/√dₖ) V', -6, 13, -12, 0.85],
    ['x + δ,  ‖δ‖∞ ≤ ε', 10, 11, -9, 0.85],
  ], { opacity: 0.45 });
  extra.add(maths);

  return {
    id: 'lab', kit: k, extra,
    shift: [0.22, -0.02],
    light: { key: '#FFF4E6', keyI: 1.15, dir: [0.35, 1, 0.65], sky: '#D8E0EA', ground: '#3A3028', hemiI: 0.5, env: 0.4, bg: ['#0A0B0D', '#16110D'] },
    cams: [
      { t: 0, pos: [-4, 34, 74], target: [-2, 3, -1], fov: 20 },
      { t: 0.25, pos: [-4, 26, 60], target: [-5, 3.5, -2], fov: 19 },
      { t: 0.55, pos: [4, 26, 60], target: [1, 3.5, -2], fov: 19 },
      { t: 0.8, pos: [12, 24, 58], target: [8, 4.5, -2], fov: 19 },
      // swing round to the side for the headcrab, so Gordon is in profile
      { t: 0.88, pos: [44, 20, 34], target: [10, 3.5, -1.5], fov: 19 },
      { t: 1, pos: [46, 18, 30], target: [10.5, 3.5, -1.5], fov: 19 },
    ],
    update(t, time) {
      actor.update(t, time);
      portalMats.forEach((m) => { m.uniforms.time.value = time; });
      maths.userData.tick(time);
      const s1 = range(t, 0.12, 0.16), s2 = range(t, 0.44, 0.48), s3 = range(t, 0.76, 0.8);
      drawSign(s1, time);
      // station 2: sprinklers on
      rainM.opacity = s2 * 0.55; chamberLight.userData.level = s2 * 6;
      const a = rg.attributes.position.array;
      for (let i = 0; i < RN; i++) {
        const y = 5.6 - ((rs[i * 3 + 1] * 3.6 + time * 7) % 3.6);
        a.set([rs[i * 3], y, rs[i * 3 + 2], rs[i * 3] + 0.02, y - 0.35, rs[i * 3 + 2]], i * 6);
      }
      rg.attributes.position.needsUpdate = true;
      // station 3: robot wakes
      eyes.material.color.setRGB(0.12 + s3 * 0.3, 0.2 + s3 * 0.6, 0.3 + s3 * 0.7); robotLight.userData.level = s3 * 5;
      // headcrab: out of the portal, scurry, leap, crowbar, back through the portal
      const FLOOR = 1 * PLATE + 0.32;
      const dir = new THREE.Vector3(Math.sin(FACE_PORTAL), 0, Math.cos(FACE_PORTAL));
      const ground = new THREE.Vector3(S3[0], FLOOR, S3[1]).addScaledVector(dir, 3.2);
      const face = new THREE.Vector3(S3[0], 4.9, S3[1]).addScaledVector(dir, 1.25);
      const emerge = range(t, 0.84, 0.865), run = range(t, 0.865, 0.895), leap = range(t, 0.895, 0.938), knock = range(t, 0.94, 0.99);
      crab.visible = t > 0.84 && t < 0.995;
      const p = new THREE.Vector3();
      let yaw = Math.atan2(-dir.x, -dir.z), pitch = 0, roll = 0;
      if (knock > 0) {
        p.copy(face).lerp(PORTAL, knock); p.y += Math.sin(Math.PI * knock) * 3;
        pitch = knock * 9; roll = knock * 4; crab.scale.setScalar(1 - range(t, 0.975, 0.995));
      } else if (leap > 0) {
        p.copy(ground).lerp(face, leap); p.y += Math.sin(Math.PI * leap) * 1.4;
        pitch = -0.9 * Math.sin(Math.PI * Math.min(1, leap * 1.3)); crab.scale.setScalar(1);
      } else if (run > 0) {
        const start = new THREE.Vector3(PORTAL.x, FLOOR, PORTAL.z + 0.8);
        p.copy(start).lerp(ground, run); p.y += Math.abs(Math.sin(run * 18)) * 0.08; crab.scale.setScalar(1);
      } else {
        p.set(PORTAL.x, PORTAL.y - emerge * (PORTAL.y - FLOOR), PORTAL.z + emerge * 0.8);
        crab.scale.setScalar(Math.max(0.01, emerge));
      }
      crab.position.copy(p); crab.rotation.set(pitch, yaw, roll, 'YXZ');
      crab.userData.pose(run > 0 && run < 1 ? 'run' : leap > 0 && knock === 0 ? 'leap' : knock > 0 ? 'flail' : 'idle', time);
      // a brief spark of light where the crowbar connects
      hitLight.position.copy(face); hitLight.userData.level = range(t, 0.936, 0.94) * (1 - range(t, 0.942, 0.955)) * 25;
    },
  };
}
