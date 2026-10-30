// Chapter 2 — a ridge at dusk. Steve walks to a tripod and photographs the sunset.
// Behind the oak, something green and patient gets curious about the shutter.
import * as THREE from 'three';
import { Kit, PLATE } from '../bricks.js';
import { Actor, range } from '../actor.js';
import { island, hash2, printed } from './common.js';
import { PX } from '../blocky.js';

function pixelTexture(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false;
  return t;
}
function creeper() {
  const greens = ['#4FA83D', '#5DBB49', '#3E8E2F', '#6FCB59', '#88D673', '#2F6E23'];
  const skin = (face) => pixelTexture(8, 8, (g) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = greens[Math.floor(hash2(x, y, face ? 3 : 7) * greens.length)]; g.fillRect(x, y, 1, 1); }
    if (face) {
      g.fillStyle = '#111'; g.fillRect(1, 2, 2, 2); g.fillRect(5, 2, 2, 2); g.fillRect(3, 4, 2, 3); g.fillRect(2, 5, 1, 3); g.fillRect(5, 5, 1, 3);
    }
  });
  const plain = new THREE.MeshStandardMaterial({ map: skin(false), roughness: 0.9 });
  const face = new THREE.MeshStandardMaterial({ map: skin(true), roughness: 0.9 });
  const box = (w, h, d, mats) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w * PX, h * PX, d * PX), mats); m.castShadow = true; return m; };
  const g = new THREE.Group();
  const head = box(8, 8, 8, [plain, plain, plain, plain, face, plain]); head.position.y = 22 * PX;
  const body = box(8, 12, 4, plain); body.position.y = 12 * PX;
  g.add(head, body);
  // legs hang from the hip line so they can swing; diagonal pairs move together
  g.userData.legs = [[-2, 2], [2, 2], [-2, -2], [2, -2]].map(([x, z]) => {
    const pivot = new THREE.Group(); pivot.position.set(x * PX, 6 * PX, z * PX);
    const l = box(4, 6, 4, plain); l.position.y = -3 * PX; pivot.add(l); g.add(pivot);
    return pivot;
  });
  g.userData.head = head; g.userData.mats = [plain, face];
  return g;
}

export function ridge({ Blocky, parts }) {
  const k = new Kit({ seed: 2 });
  const extra = new THREE.Group();

  // organic footprint and stepped terrain (levels in bricks)
  const inside = (x, z) => {
    const cx = x + 0.5, cz = z + 0.5;
    const r = (cx / 12.5) ** 2 + (cz / 8.2) ** 2 + (hash2(Math.floor(x / 2), Math.floor(z / 2), 4) - 0.5) * 0.22;
    return r < 1;
  };
  const level = (x, z) => {
    const v = 1.25 - x * 0.07 - z * 0.13 + (hash2(Math.floor(x / 3), Math.floor(z / 3), 6) - 0.5) * 0.5;
    if (x >= 0 && x <= 7 && z >= -2 && z <= 4) return 1; // Steve's terrace stays level
    return Math.max(0, Math.min(3, Math.floor(v)));
  };
  island(k, { x0: -13, z0: -9, w: 26, d: 18, inside, colors: ['stone', 'dbg', 'charcoal'] });
  k.layer(-13, 0, -9, 26, 18, null, { h: 1, cells: (x, z) => (inside(x, z) && level(x, z) === 0 ? (hash2(x, z, 2) < 0.55 ? 'darkgreen' : hash2(x, z, 3) < 0.6 ? 'olive' : 'darktan') : null) });
  for (let L = 0; L < 3; L++) {
    const y = 0 + L * 3;
    k.layer(-13, y, -9, 26, 18, null, { h: 3, phase: L, cells: (x, z) => (inside(x, z) && level(x, z) > L ? (hash2(x, z, L) < 0.75 ? 'lbg' : 'stone') : null) });
    k.layer(-13, y + 3, -9, 26, 18, null, { h: 1, phase: L + 1, cells: (x, z) => (inside(x, z) && level(x, z) === L + 1 ? (hash2(x, z, 5 + L) < 0.55 ? 'darkgreen' : hash2(x, z, 8 + L) < 0.65 ? 'olive' : 'darktan') : null) });
  }
  const topOf = (x, z) => (level(Math.floor(x), Math.floor(z)) === 0 ? 1 : level(Math.floor(x), Math.floor(z)) * 3 + 1);

  // Minecraft oak on the high ground, built from bricks
  const tx = -7, tz = -4, ty = topOf(tx, tz);
  for (let i = 0; i < 3; i++) k.brick(tx, ty + i * 3, tz, 1, 1, 'brown', { order: 0.55 + i * 0.02 });
  for (let L = 0; L < 3; L++) {
    const r = L === 2 ? 1 : 2;
    k.layer(tx - 2, ty + 9 + L * 3, tz - 2, 5, 5, null, { h: 3, phase: L, order: undefined, cells: (x, z) => {
      const dx = x - tx, dz = z - tz;
      if (Math.abs(dx) > r || Math.abs(dz) > r) return null;
      if (Math.abs(dx) === r && Math.abs(dz) === r && hash2(x, z, L) < 0.6) return null;
      if (dx === 0 && dz === 0 && L < 2) return 'brown';
      return hash2(x, z, L + 11) < 0.7 ? 'darkgreen' : 'green';
    } });
  }
  // flowers and grass tufts
  const used = new Set();
  for (let i = 0; i < 26; i++) {
    const x = Math.floor(hash2(i, 1, 9) * 24) - 12, z = Math.floor(hash2(i, 2, 9) * 16) - 8;
    if (used.has(x + ',' + z) || (Math.abs(x - tx) <= 2 && Math.abs(z - tz) <= 2)) continue;
    used.add(x + ',' + z);
    if (!inside(x, z) || (x >= 2 && x <= 6 && z >= -1 && z <= 3)) continue;
    const y = topOf(x, z);
    if (i % 2 === 0) { k.round(x, y, z, 1, 'green', { h: 1, studs: false, order: 0.8 }); k.round(x, y + 1, z, 1, i % 4 ? 'red' : 'yellow', { h: 1, order: 0.85 }); }
    else k.plate(x, y, z, 1, 1, 'green', { order: 0.8 });
  }
  // a few rocks
  k.slope(9, topOf(9, -2), -3, 2, 2, 'lbg', { h: 3, order: 0.7 });
  k.slope(-11, topOf(-11, 2), 1, 2, 2, 'stone', { h: 3, rot: 1, order: 0.7 });

  // tripod + camera on the terrace, aimed at the sun (back right)
  const aim = Math.atan2(1, -1.15);
  const tri = new THREE.Group();
  const black = new THREE.MeshPhysicalMaterial({ color: '#16171A', roughness: 0.35, clearcoat: 0.4 });
  for (let i = 0; i < 3; i++) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 3.4, 8), black);
    const a = (i / 3) * Math.PI * 2;
    leg.position.set(Math.sin(a) * 0.55, 1.6, Math.cos(a) * 0.55); leg.rotation.set(Math.cos(a) * 0.32, 0, -Math.sin(a) * 0.32);
    leg.castShadow = true; tri.add(leg);
  }
  const cam = new THREE.Group(); cam.position.y = 3.45; cam.rotation.y = aim;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.6), black); body.castShadow = true;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.3, 0.6, 16), black); lens.rotation.x = Math.PI / 2; lens.position.z = 0.55;
  const glass = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), new THREE.MeshPhysicalMaterial({ color: '#203050', roughness: 0.05, clearcoat: 1 })); glass.position.z = 0.86;
  const flashMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.12), new THREE.MeshBasicMaterial({ color: '#888', toneMapped: false })); flashMesh.position.set(0.3, 0.48, 0.1);
  cam.add(body, lens, glass, flashMesh);
  tri.add(cam);
  tri.position.set(5, 4 * PLATE, 0.3);
  k.prop(tri, { order: 0.82 });
  const flash = new THREE.PointLight('#FFF6E0', 0, 30, 1.5); flash.position.set(5.6, 4 * PLATE + 4, 1); extra.add(flash);

  // low sun on the horizon behind the island
  const sun = printed(30, 30, (g, W, H) => {
    const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    gr.addColorStop(0, 'rgba(255,214,150,.95)'); gr.addColorStop(0.08, 'rgba(255,150,90,.75)'); gr.addColorStop(0.25, 'rgba(201,26,9,.18)'); gr.addColorStop(1, 'rgba(201,26,9,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }, { emissive: true, res: 12 });
  sun.material.transparent = true; sun.material.depthWrite = false;
  sun.position.set(34, 2, -40); sun.lookAt(0, 2, 0);
  extra.add(sun);

  // fireflies
  const ffGeo = new THREE.BufferGeometry(); const N = 40; const ffBase = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) ffBase.set([hash2(i, 3) * 22 - 11, 2 + hash2(i, 4) * 6, hash2(i, 5) * 14 - 7], i * 3);
  ffGeo.setAttribute('position', new THREE.BufferAttribute(ffBase.slice(), 3));
  const ff = new THREE.Points(ffGeo, new THREE.PointsMaterial({ color: '#FFD86B', size: 0.22, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false }));
  extra.add(ff);

  // creeper: waits behind the oak, sneaks across toward Steve while he shoots,
  // swells and flashes at the shutter, then backs off the way it came
  const cr = creeper();
  const crPath = new THREE.CatmullRomCurve3([[-8.2, -6.6], [-6, -1.6], [-3.4, 1.2], [-0.6, 2.6]].map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const crLen = crPath.getLength();
  const groundAt = (x, z) => topOf(x, z) * PLATE;
  let crY = groundAt(-8.2, -6.6);
  cr.position.set(-8.2, crY, -6.6);
  k.prop(cr, { order: 0.9 });

  // Steve
  const steve = new Blocky('assets/skins/steve.png', { name: 'steve' });
  const behind = [5 - Math.sin(aim) * 1.7, 0.3 - Math.cos(aim) * 1.7];
  const shoot = { armR: 1.35, armL: 1.25, armLOut: -0.15, armROut: -0.15, headPitch: 0.15 };
  const actor = new Actor(steve, [
    { t: 0, at: [1, 3.6], face: 2.6, pose: { head: -0.3 } },
    { t: 0.08, at: [1, 3.6], face: 2.2, via: [[2, 2.6]] },
    { t: 0.3, at: behind, face: aim },
    { t: 0.4, at: behind, face: aim, pose: shoot },
    { t: 0.62, at: behind, face: aim, pose: shoot },
    { t: 0.7, at: behind, face: aim + 0.9, pose: { head: -0.5, headPitch: -0.05 } },
    { t: 0.82, at: behind, face: aim + 1.6, pose: { armR: 2.9, armROut: 0.2, head: 0.2 } },
    { t: 1, at: behind, face: aim + 1.7, pose: { armR: 2.9, armROut: 0.2, head: 0.3 } },
  ], { floor: 4 });
  k.prop(steve.root, { order: 1 });
  actor.update(0);

  return {
    id: 'ridge', kit: k, extra,
    shift: [-0.16, -0.02],
    light: { key: '#FF9A6A', keyI: 2.3, dir: [1, 0.45, -1.1], sky: '#5E4A7E', ground: '#2A1A12', hemiI: 0.8, env: 0.32, bg: ['#120E1A', '#3C1511'] },
    cams: [
      { t: 0, pos: [-6, 44, 84], target: [-1, 2, 0], fov: 20 },
      { t: 0.5, pos: [-2, 34, 72], target: [0.5, 3, 0], fov: 19 },
      { t: 1, pos: [2, 26, 62], target: [2, 4, 0], fov: 18 },
    ],
    update(t, time, dt) {
      actor.update(t, time);
      if (t > 0.82) steve.j.armR.rotation.z = -0.2 - Math.sin(time * 7) * 0.25; // wave
      // shutter: brief white flash, then decay
      const f = range(t, 0.6, 0.615) * (1 - range(t, 0.62, 0.7));
      flash.userData.level = f * 220;
      flashMesh.material.color.setScalar(0.5 + f * 4);
      // creeper: out from behind the oak (t .18-.55), freezes at the flash, retreats (t .68-.95)
      const go = range(t, 0.18, 0.55) * (1 - range(t, 0.68, 0.95));
      const back = t > 0.62;
      const u = Math.min(0.999, go);
      const pt = crPath.getPointAt(u), tg = crPath.getTangentAt(Math.max(0.001, u));
      // stepping up or down a brick takes a little hop instead of snapping
      const gy = groundAt(pt.x, pt.z);
      crY += (gy - crY) * Math.min(1, dt * 10);
      const hop = Math.abs(gy - crY) > 0.05 ? 0.25 : 0;
      cr.position.set(pt.x, crY + hop, pt.z);
      const toSteve = Math.atan2(behind[0] - pt.x, behind[1] - pt.z);
      const walkYaw = Math.atan2(tg.x, tg.z) + (back ? Math.PI : 0);
      cr.rotation.y = go > 0.97 ? toSteve : walkYaw;
      // gait from distance travelled, so the feet keep up with the ground
      const moving = (t > 0.18 && t < 0.55) || (t > 0.68 && t < 0.95);
      const phase = u * crLen * 3.2;
      const sw = moving ? Math.sin(phase) * 0.55 : 0;
      cr.userData.legs.forEach((l, i) => { l.rotation.x = (i === 0 || i === 3 ? sw : -sw); });
      cr.userData.head.rotation.y = Math.sin(time * 0.8) * 0.15 * (moving ? 0.3 : 1) * (go > 0 ? 1 : 0);
      // the shutter fires at .6: it swells and blinks white, the way a creeper does before it goes off
      const hiss = range(t, 0.6, 0.62) * (1 - range(t, 0.64, 0.7));
      cr.scale.set(1 + hiss * 0.14, 1 + hiss * 0.08, 1 + hiss * 0.14);
      const blink = hiss > 0.05 && Math.sin(time * 30) > 0 ? hiss : 0;
      for (const m of cr.userData.mats) m.emissive.setScalar(blink * 0.9);
      const p = ff.geometry.attributes.position;
      for (let i = 0; i < N; i++) {
        p.setXYZ(i, ffBase[i * 3] + Math.sin(time * 0.6 + i) * 0.6, ffBase[i * 3 + 1] + Math.sin(time * 0.9 + i * 2.1) * 0.35, ffBase[i * 3 + 2] + Math.cos(time * 0.5 + i) * 0.6);
      }
      p.needsUpdate = true;
      ff.material.opacity = 0.5 + 0.4 * Math.sin(time * 2.3);
    },
  };
}
