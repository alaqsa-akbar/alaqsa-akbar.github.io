// builder.html: edit my minifigure live and export the settings as assets/me.json.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadParts, Minifig, walkPose } from './minifig.js';
import { ME_DEFAULT, ME_OPTIONS, getMe, setMe } from './me.js';
import { C } from './bricks.js';

const SKINS = ['#F2CD37', '#F6D7B3', '#E09A6E', '#D7A27A', '#AA7D55', '#7C503A', '#4A2C1C'];
const HAIR = ['#121214', '#352100', '#582A12', '#7C503A', '#958A73', '#E4CD9E', '#A0A5A9', '#F2F3F2'];
const CLOTH = ['#1B1D21', '#3E4248', '#1B2A4A', '#352100', '#A95500', '#5F625D', '#A0A5A9', '#F2F3F2', '#5A6F8E', '#0A3463', '#0055BF', '#5A93DB', '#078BC9',
  '#184632', '#237841', '#7C7B48', '#A0BCAC', '#E4CD9E', '#958A73', '#582A12', '#720E0F', '#C91A09', '#FE8A18', '#F2CD37', '#4B2C69', '#E8A3C4'];

// the form, top to bottom: [legend, [label, path, kind, palette?]]
const FORM = [
  ['Head', [
    ['Skin', 'skin', 'colour', SKINS],
    ['Hair', 'hair.style', 'choice'],
    ['Hair colour', 'hair.color', 'colour', HAIR],
    ['Hat', 'hat.style', 'choice'],
    ['Hat colour', 'hat.color', 'colour', CLOTH],
    ['Face', 'face.print', 'choice'],
    ['Eyebrows', 'face.brows', 'choice'],
    ['Eyes', 'face.eyes', 'choice'],
    ['Mouth', 'face.mouth', 'choice'],
    ['Facial hair', 'face.beard', 'choice'],
    ['Glasses', 'face.glasses', 'choice'],
    ['Frame colour', 'face.glassesColor', 'colour', ['#1B1D21', '#582A12', '#A0A5A9', '#C8A24A', '#C91A09', '#0055BF']],
  ]],
  ['Top', [
    ['Style', 'top.style', 'choice'],
    ['Colour', 'top.color', 'colour', CLOTH],
    ['Print and detail colour', 'top.trim', 'colour', CLOTH],
    ['Chest print', 'top.print', 'choice'],
  ]],
  ['Legs', [
    ['Trousers', 'legs.color', 'colour', CLOTH],
    ['Shoes', 'legs.shoes', 'colour', CLOTH],
    ['Belt', 'legs.belt', 'choice'],
  ]],
  ['Holding', [
    ['In the left hand', 'hold', 'choice'],
  ]],
  ['Backpack', [
    ['Wearing one', 'backpack.on', 'toggle'],
    ['Colour', 'backpack.color', 'colour', CLOTH],
  ]],
];
// options that only matter when another one is on
const SHOW = {
  'hair.color': (m) => m.hair.style !== 'none' || m.face.beard === 'full' || m.face.beard === 'goatee',
  'hat.color': (m) => m.hat.style !== 'none',
  'face.brows': (m) => m.face.print === 'drawn',
  'face.eyes': (m) => m.face.print === 'drawn',
  'face.mouth': (m) => m.face.print === 'drawn',
  'face.glassesColor': (m) => m.face.glasses !== 'none',
  'backpack.color': (m) => m.backpack.on,
};

const KEY = 'brickworld-me';
const get = (o, path) => path.split('.').reduce((a, k) => a[k], o);
const set = (o, path, v) => { const ks = path.split('.'), last = ks.pop(); ks.reduce((a, k) => a[k], o)[last] = v; };
const names = Object.fromEntries(Object.entries(C).map(([k, v]) => [v.toLowerCase(), k]));

// ---- the 3D view ----
const canvas = document.getElementById('view');
const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
r.setPixelRatio(Math.min(devicePixelRatio, 2));
r.toneMapping = THREE.NeutralToneMapping; r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFShadowMap;
const scene = new THREE.Scene();
scene.environment = new THREE.PMREMGenerator(r).fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.45;
const cam = new THREE.PerspectiveCamera(24, 1, 0.5, 200);
cam.position.set(7, 6, 15);
const camAt = new URLSearchParams(location.search).get('cam'); // e.g. ?cam=0,5,8 for a close look
if (camAt) cam.position.set(...camAt.split(',').map(Number));
const controls = new OrbitControls(cam, canvas);
controls.target.set(0, camAt ? 3.9 : 2.5, 0); controls.enableDamping = true; controls.enablePan = false;
controls.minDistance = 7; controls.maxDistance = 30; controls.maxPolarAngle = Math.PI * 0.55;
controls.autoRotate = !camAt && !matchMedia('(prefers-reduced-motion: reduce)').matches; controls.autoRotateSpeed = 1.2;
controls.addEventListener('start', () => { controls.autoRotate = false; });
const key = new THREE.DirectionalLight('#fff3e2', 2.2); key.position.set(8, 16, 12); key.castShadow = true;
key.shadow.mapSize.set(1024, 1024); Object.assign(key.shadow.camera, { left: -5, right: 5, top: 8, bottom: -2 }); key.shadow.radius = 4;
const rim = new THREE.DirectionalLight('#9fb4ff', 1.2); rim.position.set(-10, 8, -10);
scene.add(key, rim, new THREE.HemisphereLight('#c8d4ff', '#302020', 0.5));
// a round 4×4 plate to stand on
const plate = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.4, 48), new THREE.MeshPhysicalMaterial({ color: '#5F625D', roughness: 0.35, clearcoat: 0.3 }));
plate.position.y = -0.2; plate.receiveShadow = true; scene.add(plate);
const studGeo = new THREE.CylinderGeometry(0.3, 0.3, 0.17, 20);
for (let x = -2; x < 2; x++) for (let z = -2; z < 2; z++) {
  const s = new THREE.Mesh(studGeo, plate.material); s.position.set(x + 0.5, 0.085, z + 0.5); s.receiveShadow = s.castShadow = true;
  if (Math.hypot(x + 0.5, z + 0.5) < 2.6) scene.add(s);
}

const resize = () => {
  const w = canvas.clientWidth, h = canvas.clientHeight;
  r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
};
new ResizeObserver(resize).observe(canvas);

const parts = await loadParts(); // also reads assets/me.json
let m;
try { m = JSON.parse(localStorage.getItem(KEY)); } catch { m = null; }
setMe(m || getMe());
m = structuredClone(getMe());

let fig, pose = 'stand';
const build = () => {
  if (fig) {
    scene.remove(fig.root);
    fig.root.traverse((o) => { if (o.isMesh && o.material.map) { o.material.map.dispose(); o.material.dispose(); } });
  }
  setMe(m);
  fig = new Minifig(parts, 'me');
  fig.root.position.y = 0.17;
  scene.add(fig.root);
};
build();


r.setAnimationLoop(() => {
  const t = performance.now() / 1000;
  if (pose === 'stand') fig.setPose({ armL: 0.08, armR: 0.08, handL: 0.3, handR: -0.3 });
  else if (pose === 'wave') fig.setPose({ armR: 2.7, armROut: 0.35 + Math.sin(t * 7) * 0.25, armL: 0.1, head: 0.15 });
  else fig.setPose(walkPose(t * 6));
  controls.update();
  r.render(scene, cam);
});
window.__ready = true;

// ---- the form ----
const form = document.getElementById('form');
const status = document.getElementById('status');
const say = (s) => { status.textContent = s; };
const rows = new Map();

const changed = () => {
  build();
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* the figure still updates */ }
  sync();
};
const sync = () => {
  for (const [path, { row, buttons }] of rows) {
    row.hidden = SHOW[path] ? !SHOW[path](m) : false;
    const v = get(m, path);
    buttons.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.value === String(v).toLowerCase())));
    const input = row.querySelector('input[type=color]');
    if (input && typeof v === 'string') input.value = v;
  }
};

for (const [legend, items] of FORM) {
  const fs = document.createElement('fieldset');
  fs.innerHTML = `<legend>${legend}</legend>`;
  for (const [label, path, kind, palette] of items) {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<span id="l-${path}">${label}</span>`;
    const box = document.createElement('div');
    box.setAttribute('role', 'group'); box.setAttribute('aria-labelledby', `l-${path}`);
    const buttons = [];
    const button = (value, text, onClick) => {
      const b = document.createElement('button'); b.type = 'button'; b.dataset.value = String(value).toLowerCase(); b.textContent = text;
      b.addEventListener('click', onClick); box.append(b); buttons.push(b); return b;
    };
    if (kind === 'choice') {
      box.className = 'chips';
      for (const [v, text] of ME_OPTIONS[path]) button(v, text, () => { set(m, path, v); changed(); });
    } else if (kind === 'toggle') {
      box.className = 'chips';
      button(true, 'Yes', () => { set(m, path, true); changed(); });
      button(false, 'No', () => { set(m, path, false); changed(); });
    } else {
      box.className = 'swatches';
      for (const hex of palette) {
        const b = button(hex, '', () => { set(m, path, hex); changed(); });
        b.style.background = hex; b.title = names[hex.toLowerCase()] || hex; b.setAttribute('aria-label', b.title);
      }
      const custom = document.createElement('input'); custom.type = 'color'; custom.title = 'Any colour'; custom.setAttribute('aria-label', `${label}: any colour`);
      custom.addEventListener('input', () => { set(m, path, custom.value.toUpperCase()); changed(); });
      box.append(custom);
    }
    row.append(box); fs.append(row);
    rows.set(path, { row, buttons });
  }
  form.append(fs);
}
sync();

document.querySelectorAll('[data-pose]').forEach((b) => b.addEventListener('click', () => {
  pose = b.dataset.pose;
  document.querySelectorAll('[data-pose]').forEach((o) => o.setAttribute('aria-pressed', String(o === b)));
}));
document.getElementById('save').addEventListener('click', () => {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(m, null, 2) + '\n'], { type: 'application/json' }));
  a.download = 'me.json'; a.click(); URL.revokeObjectURL(a.href);
  say('Saved me.json to your downloads.');
});
document.getElementById('copy').addEventListener('click', async () => {
  try { await navigator.clipboard.writeText(JSON.stringify(m, null, 2)); say('Settings copied.'); }
  catch { say('Copying was blocked. Use Download instead.'); }
});
document.getElementById('reset').addEventListener('click', () => {
  m = structuredClone(ME_DEFAULT); changed(); say('Back to the default figure.');
});
