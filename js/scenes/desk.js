// Chapter 1 — desk after hours. The classic minifigure leaves the window, sits down,
// and a training run converges on the monitor as the visitor scrolls.
import * as THREE from 'three';
import { Kit, PLATE } from '../bricks.js';
import { Actor, range } from '../actor.js';
import { island, roundedRect, printed, onFloor, equations } from './common.js';

export function desk({ Minifig, parts }) {
  const k = new Kit({ seed: 1 });
  const extra = new THREE.Group();

  // ---- base & floor ----
  const inside = roundedRect(-11, -7, 11, 7, 1.6);
  island(k, { x0: -11, z0: -7, w: 22, d: 14, inside, colors: ['charcoal', 'dbg', 'black'] });
  const room = (x, z) => x >= -10 && z >= -6 && z < 3;
  k.layer(-11, 0, -7, 22, 14, null, { h: 1, studs: false, cells: (x, z) => (inside(x, z) && room(x, z) ? ((x + (z % 2 ? 2 : 0)) % 4 < 2 ? 'brown' : 'darkbrown') : null) });
  k.layer(-11, 0, -7, 22, 14, null, { h: 1, cells: (x, z) => (inside(x, z) && !room(x, z) ? 'dbg' : null) });

  // ---- walls: back wall with a window, short left wall ----
  for (let L = 0; L < 6; L++) {
    const col = L === 5 ? 'darkred' : L === 0 ? 'charcoal' : 'dbg';
    k.layer(-11, 1 + L * 3, -7, 22, 1, null, { h: 3, phase: L, cells: (x) => (inside(x, -7) || x > -11 ? (x >= 3 && x < 8 && L >= 2 && L <= 4 ? null : col) : null) });
    k.layer(-11, 1 + L * 3, -6, 1, 9, null, { h: 3, phase: L + 1, cells: (x, z) => (z === -2 && L === 2 ? null : col) });
  }
  k.plate(3, 7, -7, 5, 2, 'white', { studs: false }); // sill

  // ---- desk ----
  k.fill(-9, 1, -6, 1, 3, 2, 'black');
  k.fill(-2, 1, -6, 1, 3, 2, 'black');
  k.tile(-9, 7, -6, 8, 3, 'charcoal');
  k.tile(-6, 8, -4, 3, 1, 'dbg'); // keyboard
  k.round(-8, 8, -4, 1, 'white', { h: 2 }); // mug
  // lamp
  k.round(-2, 8, -6, 1, 'black', { h: 1 });
  k.bar(-2, 9, -6, 6, 'black');
  // PC tower
  k.fill(0, 1, -6, 2, 3, 4, 'black', { max: 6 });

  // ---- chair ----
  k.round(-5.5, 1, -1.5, 1, 'black', { h: 2 });
  k.plate(-6, 3, -2, 2, 2, 'black');
  k.brick(-6, 4, 0, 2, 1, 'black');
  k.brick(-6, 7, 0, 2, 1, 'black', { h: 2, studs: false });

  // ---- shelf with a companion cube and a familiar little package ----
  k.plate(-10, 13, -4, 2, 5, 'brown');
  // ---- plant ----
  k.round(-9.5, 1, 1.5, 2, 'darkorange', { h: 3 });
  k.round(-9, 4, 2, 1, 'brown', { h: 3, studs: false });
  k.plate(-10, 7, 1, 3, 2, 'darkgreen');
  k.plate(-9.5, 8, 2, 1, 2, 'green');
  k.plate(-10.5, 8.5, 1.5, 2, 1, 'green', { studs: false });
  k.round(-9, 9, 2.5, 1, 'olive', { h: 1 });
  // ---- rug & loose bricks on the porch ----
  k.brick(6, 1, 4, 2, 2, 'red', { order: 0.9 });
  k.brick(3, 1, 5, 2, 1, 'yellow', { order: 0.92 });
  k.plate(8, 1, 2, 1, 2, 'white', { order: 0.93 });

  // ---- props ----
  // monitor with a live training curve
  const mon = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(4.2, 2.7, 0.3), new THREE.MeshPhysicalMaterial({ color: '#141518', roughness: 0.4, clearcoat: 0.4 }));
  frame.castShadow = true;
  const screen = printed(3.9, 2.4, () => {}, { res: 120, emissive: true });
  screen.position.z = 0.16;
  const stand = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.9, 0.3), frame.material); stand.position.y = -1.65;
  mon.add(frame, screen, stand);
  onFloor(mon, -4.5, 8 + 2.25 / PLATE * 1, -5.3);
  mon.position.y = 3.2 + 2.1;
  k.prop(mon, { order: 0.55 });

  const drawScreen = (p) => {
    const { ctx: g, canvas: c, tex } = screen.userData;
    const W = c.width, H = c.height;
    g.fillStyle = '#0B0D12'; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(255,255,255,.08)'; g.lineWidth = 1;
    for (let i = 1; i < 5; i++) { g.beginPath(); g.moveTo(24, (H * i) / 5); g.lineTo(W - 10, (H * i) / 5); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.beginPath(); g.moveTo(24, 12); g.lineTo(24, H - 22); g.lineTo(W - 10, H - 22); g.stroke();
    const n = Math.floor(160 * p);
    g.strokeStyle = '#FF3B2F'; g.lineWidth = 3; g.beginPath();
    for (let i = 0; i <= n; i++) {
      const x = 24 + ((W - 40) * i) / 160;
      const v = Math.exp(-i / 34) * 0.85 + 0.06 + Math.sin(i * 1.7) * 0.025 * Math.exp(-i / 60) + Math.sin(i * 0.37) * 0.012;
      const y = 12 + (H - 40) * (1 - v);
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '16px ui-monospace, monospace';
    g.fillText(`epoch ${String(Math.round(p * 40)).padStart(2, '0')}/40`, W - 128, 28);
    tex.needsUpdate = true;
  };
  drawScreen(0);

  // lamp head + warm spot
  const lampHead = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.7, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: '#141518', roughness: 0.35, side: THREE.DoubleSide }));
  lampHead.position.set(-1.5, 9 * PLATE + 6 * PLATE + 0.25, -5.2); lampHead.rotation.x = 0.5;
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: '#FFD88A', toneMapped: false }));
  bulb.position.copy(lampHead.position).add(new THREE.Vector3(0, -0.2, 0.1));
  const spot = new THREE.SpotLight('#FFC777', 60, 14, 0.75, 0.6, 1.6);
  spot.position.copy(bulb.position); spot.target.position.set(-3.8, 3.2, -3.6);
  // (no shadow of its own: practical lights are pooled in the stage, and only the key light casts)
  extra.add(spot, spot.target);
  k.prop(lampHead, { order: 0.7 }); k.prop(bulb, { order: 0.7 });

  // PC tower front: vent + red status glow
  const pcFace = printed(1.9, 4.6, (g, W, H) => {
    g.fillStyle = '#121316'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1D1F24'; for (let y = 30; y < H * 0.62; y += 14) g.fillRect(16, y, W - 32, 7);
    g.fillStyle = '#FF2A1A'; g.fillRect(14, H * 0.72, W - 28, 6);
    g.beginPath(); g.arc(W / 2, H * 0.84, 7, 0, Math.PI * 2); g.fill();
  }, { emissive: true });
  pcFace.position.set(1, 1 * PLATE + 2.4, -2.98);
  k.prop(pcFace, { order: 0.6 });
  const pcLight = new THREE.PointLight('#FF2A1A', 4, 6, 2); pcLight.position.set(1, 1.4, -2.2); extra.add(pcLight);
  const monLight = new THREE.PointLight('#B9C8FF', 6, 9, 2); monLight.position.set(-4.5, 5, -4.2); extra.add(monLight);

  // companion cube (Portal) on the shelf
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.9, 1.9), printed(1, 1, (g, W, H) => {
    g.fillStyle = '#B9BDC2'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#8E9297'; g.fillRect(0, 0, W, 14); g.fillRect(0, H - 14, W, 14); g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H);
    g.strokeStyle = '#8E9297'; g.lineWidth = 8; g.beginPath(); g.arc(W / 2, H / 2, W * 0.3, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#E8559C'; g.beginPath();
    const cx = W / 2, cy = H / 2 + 4, s = W * 0.11;
    g.moveTo(cx, cy + s * 1.1); g.bezierCurveTo(cx - s * 2, cy - s * 0.4, cx - s * 0.9, cy - s * 1.8, cx, cy - s * 0.6);
    g.bezierCurveTo(cx + s * 0.9, cy - s * 1.8, cx + s * 2, cy - s * 0.4, cx, cy + s * 1.1); g.fill();
  }).material);
  cube.castShadow = true;
  cube.position.set(-9, 14 * PLATE + 0.95, -2.6); cube.rotation.y = 0.35;
  k.prop(cube, { order: 0.8 });
  // a tan package with a keypad on the shelf
  const pkg = new THREE.Group();
  const pkgBody = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.7, 0.9), new THREE.MeshStandardMaterial({ color: '#B49A6E', roughness: 0.8 }));
  const pad = printed(0.6, 0.4, (g, W, H) => { g.fillStyle = '#20221e'; g.fillRect(0, 0, W, H); g.fillStyle = '#7CFF6B'; g.fillRect(6, 6, W - 12, H * 0.3); g.fillStyle = '#FF2A1A'; g.beginPath(); g.arc(W - 12, H - 12, 5, 0, 7); g.fill(); }, { emissive: true });
  pad.rotation.x = -Math.PI / 2; pad.position.y = 0.36;
  pkg.add(pkgBody, pad); pkgBody.castShadow = true;
  pkg.position.set(-9, 14 * PLATE + 0.35, 0.2); pkg.rotation.y = -0.4;
  k.prop(pkg, { order: 0.82 });

  // poster: yellow, black and a red slash; reads as a certain night city
  const poster = printed(2.6, 3.4, (g, W, H) => {
    g.fillStyle = '#F3E600'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#111'; g.beginPath(); g.moveTo(0, H * 0.62); g.lineTo(W, H * 0.38); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    g.fillStyle = '#E3261B'; g.beginPath(); g.moveTo(0, H * 0.6); g.lineTo(W, H * 0.36); g.lineTo(W, H * 0.4); g.lineTo(0, H * 0.66); g.fill();
    g.fillStyle = '#55EAD4'; g.fillRect(W * 0.12, H * 0.18, W * 0.5, 5); g.fillRect(W * 0.2, H * 0.22, W * 0.3, 3);
  });
  poster.position.set(-6.6, 1 * PLATE + 5.6, -5.97);
  k.prop(poster, { order: 0.75 });

  // the window: night sky in the opening, a white frame with a cross mullion, faint glass
  const win = new THREE.Group();
  const WX = 5.5, WY = (8 + 4) * PLATE, WW = 5, WH = 8 * PLATE; // opening above the sill
  const night = printed(WW, WH, (g, W, H) => {
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#081028'); gr.addColorStop(1, '#2A1C3A');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
    for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.35 + (i % 5) * 0.12})`; g.fillRect((i * 97) % W, (i * 53) % (H * 0.7), 2, 2); }
    g.fillStyle = '#F4F1E4'; g.beginPath(); g.arc(W * 0.7, H * 0.28, 22, 0, 7); g.fill();
    g.fillStyle = '#081028'; g.beginPath(); g.arc(W * 0.7 + 9, H * 0.28 - 5, 19, 0, 7); g.fill();
    // a distant skyline under the moon
    g.fillStyle = '#05070F';
    for (let x = 0; x < W; x += 34) { const h = 30 + ((x * 37) % 70); g.fillRect(x, H - h, 30, h); }
    g.fillStyle = 'rgba(255,200,120,.75)';
    for (let x = 4; x < W; x += 34) for (let y = H - 20; y > H - 60; y -= 12) if ((x * 7 + y) % 5 === 0) g.fillRect(x + 6, y, 5, 6);
  }, { emissive: true, res: 64 });
  night.position.set(WX, WY, -6.95);
  const frameMat = new THREE.MeshPhysicalMaterial({ color: '#F2F3F2', roughness: 0.35, clearcoat: 0.4 });
  const bar = (w, h, x, y) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.3), frameMat); m.position.set(WX + x, WY + y, -6.55); m.castShadow = true; win.add(m); };
  bar(WW, 0.22, 0, WH / 2 - 0.11); bar(0.22, WH, -WW / 2 + 0.11, 0); bar(0.22, WH, WW / 2 - 0.11, 0); bar(0.16, WH, 0, 0); bar(WW, 0.16, 0, 0.2);
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(WW, WH), new THREE.MeshPhysicalMaterial({ color: '#9FB8FF', transparent: true, opacity: 0.08, roughness: 0.05, clearcoat: 1, depthWrite: false }));
  glass.position.set(WX, WY, -6.6);
  win.add(night, glass);
  k.prop(win, { order: 0.4 });
  const moonLight = new THREE.PointLight('#9FB4FF', 5, 9, 2); moonLight.position.set(WX, WY, -5.5); extra.add(moonLight);

  // ---- the character ----
  const fig = new Minifig(parts, 'me');
  const seat = 4 * PLATE;
  const typing = { sit: 1, seat, legL: 1.5, legR: 1.5, armL: 1.25, armR: 1.25, handL: 0.4, handR: -0.4 };
  const actor = new Actor(fig, [
    { t: 0.0, at: [5.5, -4.6], face: Math.PI, pose: { armR: 0.9, head: 0.1 } },
    { t: 0.1, at: [5.5, -4.6], face: Math.PI, pose: { armR: 0.9 }, via: [[3, -2.2]] },
    { t: 0.36, at: [-2.4, -1], face: -Math.PI / 2 },
    { t: 0.41, at: [-2.4, -1], face: Math.PI, slide: true, pose: { sit: 0.15, seat, legL: 0.3, legR: 0.3 } },
    { t: 0.5, at: [-5, -1], face: Math.PI, pose: typing },
    { t: 0.88, at: [-5, -1], face: Math.PI, pose: typing },
    { t: 0.96, at: [-5, -1], face: Math.PI, pose: { ...typing, armL: 2.7, armR: 2.7, armLOut: 0.3, armROut: 0.3, head: 0.35 } },
  ], { floor: 1 });
  k.prop(fig.root, { order: 1 });
  actor.update(0);

  // what the run on the monitor is minimising, drifting above the room
  const maths = equations([
    ['ℒ(θ) = −Σ log pθ(y | x)', -7, 10.5, -10, 0.8],
    ['θ ← θ − η ∇θ ℒ', 7, 11.5, -10, 0.8],
  ], { opacity: 0.4 });
  extra.add(maths);

  let lastP = -1;
  return {
    id: 'desk', kit: k, extra,
    shift: [0.17, -0.02],
    light: { key: '#8FA6FF', keyI: 1.1, dir: [-0.5, 1, -0.9], sky: '#3A4466', ground: '#1A0F10', hemiI: 0.75, env: 0.28, bg: ['#0A0B10', '#170C0E'] },
    cams: [
      { t: 0, pos: [46, 36, 56], target: [0, 1.5, 0], fov: 20 },
      { t: 0.45, pos: [38, 28, 48], target: [-1.5, 2.2, -1.5], fov: 19 },
      { t: 1, pos: [30, 21, 41], target: [-2.5, 2.8, -2.5], fov: 18.5 },
    ],
    update(t, time) {
      // the minifig is placed straight onto the floor: walking carries him to the chair,
      // then the "sit" pose blends the hips onto the seat
      actor.update(t, time);
      maths.userData.tick(time);
      if (t > 0.5 && t < 0.9) {
        const f = fig.j;
        f.handL.rotation.z = Math.sin(time * 11) * 0.12; f.handR.rotation.z = Math.sin(time * 13 + 1) * 0.12;
        f.armL.rotation.x -= Math.max(0, Math.sin(time * 9)) * 0.06; f.armR.rotation.x -= Math.max(0, Math.sin(time * 10 + 2)) * 0.06;
      }
      const p = range(t, 0.5, 0.92);
      if (Math.abs(p - lastP) > 0.004) { drawScreen(p); lastP = p; }
      bulb.material.color.setHSL(0.11, 0.9, 0.72 + Math.sin(time * 3) * 0.01);
    },
  };
}
