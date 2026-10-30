// Chapter 3 — a rainy rooftop. Batman lights the signal, checks a field laptop where
// four agents work through a penetration test in turn, then takes the ledge.
import * as THREE from 'three';
import { Kit, PLATE } from '../bricks.js';
import { Actor, range } from '../actor.js';
import { island, printed, hash2, equations } from './common.js';

export function rooftop({ Minifig, parts }) {
  const k = new Kit({ seed: 3, drop: 18 });
  const extra = new THREE.Group();
  const X0 = -10, Z0 = -7, W = 20, D = 14;
  const inside = (x, z) => x >= X0 && x < X0 + W && z >= Z0 && z < Z0 + D;

  // the top floors of a tower: lit and dark windows down the facade
  for (let L = 0; L < 4; L++) {
    const y = -(L + 1) * 3;
    k.layer(X0, y, Z0, W, D, null, { h: 3, phase: L, cells: (x, z) => {
      if (!inside(x, z)) return null;
      const edge = x === X0 || x === X0 + W - 1 || z === Z0 || z === Z0 + D - 1;
      if (!edge) return 'charcoal';
      const along = x === X0 || x === X0 + W - 1 ? z : x;
      if (L % 2 === 1 && along % 3 === 1) return hash2(along, L, x) < 0.35 ? 'transyellow' : 'transdblue';
      return L % 2 ? 'dbg' : 'charcoal';
    } });
  }
  // roof: tiles with exposed plates for texture, puddles as dark glossy tiles
  k.layer(X0, 0, Z0, W, D, null, { h: 1, studs: false, cells: (x, z) => (hash2(x >> 1, z >> 1, 3) < 0.55 ? 'dbg' : null) });
  k.layer(X0, 0, Z0, W, D, null, { h: 1, cells: (x, z) => (hash2(x >> 1, z >> 1, 3) >= 0.55 ? 'charcoal' : null) });
  // parapet with a gap at front right where he'll stand
  for (let L = 0; L < 1; L++) {
    k.layer(X0, 1, Z0, W, D, null, { h: 3, phase: 1, cells: (x, z) => {
      const edge = x === X0 || x === X0 + W - 1 || z === Z0 || z === Z0 + D - 1;
      return edge ? 'lbg' : null;
    } });
  }
  k.layer(X0, 4, Z0, W, D, null, { h: 1, studs: false, phase: 2, cells: (x, z) => (x === X0 || x === X0 + W - 1 || z === Z0 || z === Z0 + D - 1 ? 'stone' : null) });

  // water tower on legs (back left)
  for (const [x, z] of [[-8, -6], [-5, -6], [-8, -3], [-5, -3]]) k.add('bar', x, 1, z, 1, 1, 12, 'darkbrown', { studs: false });
  k.plate(-8, 13, -6, 4, 4, 'darkbrown');
  for (let i = 0; i < 3; i++) k.round(-8, 14 + i * 3, -6, 4, i === 1 ? 'darkbrown' : 'brown', { studs: i === 2 });
  k.cone(-7, 23, -5, 2, 'darkbrown', { h: 3 });
  // roof access hut (back right) with a red neon sign
  k.fill(4, 1, -6, 5, 4, 3, 'dbg', { max: 8 });
  k.tile(3, 10, -7, 7, 6, 'charcoal');
  k.add('brick', 5, 1, -2, 2, 1, 6, 'black', { studs: false }); // door
  // AC units
  k.fill(2, 1, 2, 3, 2, 1, 'lbg');
  k.tile(2, 4, 2, 3, 2, 'silver');
  k.fill(-3, 1, -6, 2, 2, 1, 'lbg');
  k.tile(-3, 4, -6, 2, 2, 'silver');
  // signal base (front left)
  k.round(-7, 1, 2, 2, 'dbg', { h: 3, studs: false });

  // bat-signal: lamp, beam, and the emblem on low cloud
  const sig = new THREE.Group();
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 1.5, 24, 1, true), new THREE.MeshPhysicalMaterial({ color: '#8A8F94', roughness: 0.35, metalness: 0.5, side: THREE.DoubleSide }));
  housing.castShadow = true;
  const lensM = new THREE.MeshBasicMaterial({ color: '#FFE9A8', toneMapped: false });
  const lens = new THREE.Mesh(new THREE.CircleGeometry(0.9, 24), lensM); lens.position.y = 0.74; lens.rotation.x = -Math.PI / 2;
  sig.add(housing, lens);
  sig.position.set(-6, 3 * PLATE + 1.4, 3); sig.rotation.set(-0.55, 0, 0.35);
  k.prop(sig, { order: 0.7 });
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 0.9, 40, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#FFE2A0', transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
  beam.position.y = 20.7; sig.add(beam);
  const emblem = printed(14, 9, (g, Wc, Hc) => {
    const gr = g.createRadialGradient(Wc / 2, Hc / 2, 0, Wc / 2, Hc / 2, Wc / 2);
    gr.addColorStop(0, 'rgba(255,226,160,.85)'); gr.addColorStop(0.7, 'rgba(255,226,160,.5)'); gr.addColorStop(1, 'rgba(255,226,160,0)');
    g.fillStyle = gr; g.beginPath(); g.ellipse(Wc / 2, Hc / 2, Wc / 2, Hc / 2, 0, 0, 7); g.fill();
    g.fillStyle = '#000'; g.save(); g.translate(Wc / 2, Hc / 2); g.scale(Wc / 460, Hc / 300);
    g.beginPath();
    g.moveTo(0, -38); g.lineTo(12, -70); g.lineTo(22, -40); g.quadraticCurveTo(80, -86, 160, -60); g.quadraticCurveTo(120, -30, 140, 10);
    g.quadraticCurveTo(100, 0, 80, 40); g.quadraticCurveTo(50, 20, 22, 60); g.quadraticCurveTo(10, 40, 0, 72);
    g.quadraticCurveTo(-10, 40, -22, 60); g.quadraticCurveTo(-50, 20, -80, 40); g.quadraticCurveTo(-100, 0, -140, 10); g.quadraticCurveTo(-120, -30, -160, -60);
    g.quadraticCurveTo(-80, -86, -22, -40); g.lineTo(-12, -70); g.closePath(); g.fill(); g.restore();
  }, { emissive: true, res: 24 });
  emblem.material.transparent = true; emblem.material.depthWrite = false; emblem.material.blending = THREE.AdditiveBlending;
  emblem.position.set(-14, 30, -26); emblem.lookAt(30, 20, 50);
  extra.add(emblem);
  const sigLight = new THREE.SpotLight('#FFE2A0', 30, 12, 0.5, 0.6, 1.5); sigLight.position.set(-6, 3, 3); sigLight.target.position.set(-6, 0, 3);
  extra.add(sigLight, sigLight.target);

  // neon on the hut: a red arrow-chevron sign
  const neon = printed(3.6, 1.4, (g, Wc, Hc) => {
    g.fillStyle = '#120608'; g.fillRect(0, 0, Wc, Hc);
    g.shadowColor = '#FF2A1A'; g.shadowBlur = 18; g.strokeStyle = '#FF4A3A'; g.lineWidth = 9; g.lineJoin = 'round';
    for (let i = 0; i < 3; i++) { const x = 60 + i * 120; g.beginPath(); g.moveTo(x, 30); g.lineTo(x + 60, Hc / 2); g.lineTo(x, Hc - 30); g.stroke(); }
  }, { emissive: true });
  neon.position.set(9.02, 1 * PLATE + 2.6, -4); neon.rotation.y = Math.PI / 2;
  k.prop(neon, { order: 0.8 });
  const neonLight = new THREE.PointLight('#FF2A1A', 8, 9, 2); neonLight.position.set(10, 3, -4); extra.add(neonLight);

  // field laptop on the AC unit: four agents in a pipeline
  const lap = new THREE.Group();
  const lapMat = new THREE.MeshPhysicalMaterial({ color: '#1A1B1F', roughness: 0.3, clearcoat: 0.5 });
  const baseM = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.12, 1.5), lapMat); baseM.castShadow = true;
  const lid = new THREE.Group(); lid.position.set(0, 0.06, -0.72); lid.rotation.x = -0.35;
  const lidM = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.45, 0.08), lapMat); lidM.position.y = 0.72;
  const scr = printed(2.0, 1.25, () => {}, { emissive: true, res: 160 }); scr.position.set(0, 0.72, 0.05);
  lid.add(lidM, scr); lap.add(baseM, lid);
  lap.position.set(3.5, 5 * PLATE + 0.06, 3); lap.rotation.y = 0.25;
  k.prop(lap, { order: 0.85 });
  const agents = ['recon', 'plan', 'exploit', 'report'];
  const drawLap = (p) => {
    const { ctx: g, canvas: c, tex } = scr.userData; const Wc = c.width, Hc = c.height;
    g.fillStyle = '#07090C'; g.fillRect(0, 0, Wc, Hc);
    const active = Math.min(3, Math.floor(p * 4.0001));
    g.font = '600 15px ui-monospace, monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
    agents.forEach((a, i) => {
      const x = 46 + i * ((Wc - 92) / 3), y = Hc * 0.45;
      if (i < 3) { g.strokeStyle = i < active ? '#FF3B2F' : 'rgba(255,255,255,.18)'; g.lineWidth = 2; g.beginPath(); g.moveTo(x + 24, y); g.lineTo(x + (Wc - 92) / 3 - 24, y); g.stroke(); }
      const on = i === active && p > 0.01, done = i < active;
      g.fillStyle = on ? '#FF3B2F' : done ? '#5A1410' : '#1A1D22';
      g.beginPath(); g.arc(x, y, 20, 0, 7); g.fill();
      g.fillStyle = on || done ? '#fff' : 'rgba(255,255,255,.45)'; g.fillText(a, x, y + 40);
    });
    g.fillStyle = 'rgba(255,255,255,.35)'; g.fillRect(14, Hc - 22, (Wc - 28) * p, 4);
    tex.needsUpdate = true;
  };
  drawLap(0);
  const lapLight = new THREE.PointLight('#AFC0FF', 3, 5, 2); lapLight.position.set(3.5, 3.6, 3.8); extra.add(lapLight);

  // distant skyline
  const sky = new THREE.Group();
  for (let i = 0; i < 16; i++) {
    const w = 4 + hash2(i, 1) * 6, h = 18 + hash2(i, 2) * 40;
    const m = printed(w, h, (g, Wc, Hc) => {
      g.fillStyle = '#0D1018'; g.fillRect(0, 0, Wc, Hc);
      for (let y = 8; y < Hc; y += 14) for (let x = 6; x < Wc - 6; x += 10) if (hash2(x + i, y, 5) < 0.12) { g.fillStyle = hash2(x, y, i) < 0.8 ? 'rgba(255,214,140,.7)' : 'rgba(255,60,40,.7)'; g.fillRect(x, y, 5, 7); }
    }, { emissive: true, res: 6 });
    m.position.set(-70 + i * 9 + hash2(i, 3) * 4, -30 + h / 2 - 20, -60 - hash2(i, 4) * 30);
    sky.add(m);
  }
  extra.add(sky);

  // rain
  const RN = 900, rain = new Float32Array(RN * 6), seeds = new Float32Array(RN * 3);
  for (let i = 0; i < RN; i++) seeds.set([hash2(i, 1) * 44 - 22, hash2(i, 2) * 30, hash2(i, 3) * 34 - 17], i * 3);
  const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rain, 3));
  const rainLines = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#9FB4D8', transparent: true, opacity: 0.35, depthWrite: false }));
  rainLines.frustumCulled = false;
  extra.add(rainLines);
  const lightning = new THREE.DirectionalLight('#C8D6FF', 0); lightning.position.set(-10, 30, -20); extra.add(lightning);

  // Batman
  const bat = new Minifig(parts, 'batman');
  const cape = bat.extras.cape;
  const type = { armL: 1.05, armR: 1.05, head: 0, handL: 0.3, handR: -0.3 };
  const actor = new Actor(bat, [
    { t: 0, at: [-6, 0.5], face: 2.6, pose: { armR: 1.0, armL: 0.3 } },
    { t: 0.08, at: [-6, 0.5], face: 1.4, via: [[-2, 3.5]] },
    { t: 0.26, at: [3.3, 5.0], face: Math.PI + 0.2 },
    { t: 0.3, at: [3.3, 5.0], face: Math.PI + 0.2, pose: type },
    { t: 0.6, at: [3.3, 5.0], face: Math.PI + 0.2, pose: type },
    { t: 0.64, at: [3.3, 5.0], face: 1.2 },
    { t: 0.78, at: [6.5, 4.6], face: 0.15 },
    { t: 0.8, at: [6.5, 4.6], face: 0.15 },
    { t: 0.87, at: [6.5, 6.5], face: 0.3, y: 5, slide: true },
    { t: 1, at: [6.5, 6.5], face: 0.3, y: 5, pose: { head: -0.4, armR: 0.1, armL: 0.1 } },
  ], { floor: 1 });
  k.prop(bat.root, { order: 1 });
  actor.update(0);

  // the thesis in one line, hanging in the rain over the city
  const maths = equations([
    ['pθ(xₜ₋₁ | xₜ, c)', -6, 17, -16, 1.1],
  ], { color: 'rgba(255,226,160,', opacity: 0.4 });
  extra.add(maths);

  let lastP = -1;
  return {
    id: 'rooftop', kit: k, extra,
    light: { key: '#7F9CCB', keyI: 0.9, dir: [-0.4, 1, 0.5], sky: '#2C3550', ground: '#0A0A10', hemiI: 0.7, env: 0.3, bg: ['#06080E', '#11141E'] },
    cams: [
      { t: 0, pos: [40, 34, 50], target: [0, 1, 0], fov: 21 },
      { t: 0.5, pos: [30, 24, 44], target: [1, 2, 1], fov: 20 },
      { t: 1, pos: [26, 9, 40], target: [3, 5, 2], fov: 20 },
    ],
    update(t, time) {
      actor.update(t, time);
      maths.userData.tick(time);
      const p = range(t, 0.3, 0.6);
      if (Math.abs(p - lastP) > 0.004) { drawLap(p); lastP = p; }
      // the jump onto the ledge (t .8-.87): crouch with arms back, spring up in an arc,
      // cape streaming behind, land with a small dip
      const ju = (t - 0.8) / 0.07;
      if (ju > 0 && ju < 1) {
        const crouch = range(ju, 0, 0.3) * (1 - range(ju, 0.3, 0.42));
        const air = range(ju, 0.3, 0.86), land = range(ju, 0.84, 0.92) * (1 - range(ju, 0.92, 1));
        const arc = Math.sin(Math.PI * air);
        bat.root.position.set(6.5, (1 + 4 * air) * PLATE + arc * 1.5, 4.6 + 1.9 * air);
        bat.setPose({ lift: -0.25 * crouch - 0.2 * land, armL: -0.7 * crouch + 2.2 * arc, armR: -0.7 * crouch + 2.2 * arc, armLOut: 0.25 * arc, armROut: 0.25 * arc, legL: 0.35 * arc, legR: -0.2 * arc, cape: 0.9 * arc + 0.3 * crouch });
      }
      // on the ledge the cape catches the wind
      cape.rotation.x += range(t, 0.86, 0.92) * (0.3 + Math.sin(time * 2.2) * 0.08 + Math.sin(time * 5.3) * 0.04);
      // ...and then he's gone (t .9-1): crouch, dive off the edge, arms and cape spread, glide down out of sight
      const off = range(t, 0.9, 1);
      bat.body.rotation.x = 0;
      bat.root.visible = off < 0.97;
      if (off > 0) {
        const crouch = range(off, 0, 0.18) * (1 - range(off, 0.18, 0.26)), f = range(off, 0.2, 1);
        const face = 0.3, ledge = 5 * PLATE;
        const reach = 13 * f, drop = 1.4 * Math.sin(Math.PI * Math.min(f, 0.35) / 0.7) - 16 * f * f;
        bat.root.position.set(6.5 + Math.sin(face) * reach, ledge + drop, 6.5 + Math.cos(face) * reach);
        bat.setPose({ lift: -0.3 * crouch, armL: -0.8 * crouch + 0.5 * f, armR: -0.8 * crouch + 0.5 * f, armLOut: 1.35 * f, armROut: 1.35 * f,
          legL: 0.3 * crouch - 0.25 * f, legR: 0.3 * crouch - 0.15 * f, head: -0.2, cape: 1.4 * f + 0.2 * crouch });
        bat.body.rotation.x = 1.1 * f; // pitch forward into the dive
      }
      // signal flicks on as the chapter starts
      const on = range(t, 0.0, 0.05);
      lensM.color.setRGB(1 * on + 0.15, 0.91 * on + 0.15, 0.66 * on + 0.15);
      beam.material.opacity = 0.07 * on; emblem.material.opacity = on; sigLight.userData.level = 30 * on;
      // rain
      const a = rg.attributes.position.array;
      for (let i = 0; i < RN; i++) {
        const x = seeds[i * 3] + 0, y0 = seeds[i * 3 + 1], z = seeds[i * 3 + 2];
        const y = 28 - ((y0 + time * 26) % 30);
        a[i * 6] = x; a[i * 6 + 1] = y; a[i * 6 + 2] = z; a[i * 6 + 3] = x + 0.12; a[i * 6 + 4] = y - 0.9; a[i * 6 + 5] = z;
      }
      rg.attributes.position.needsUpdate = true;
      // one strike of lightning midway, tied to scroll
      const strike = range(t, 0.45, 0.46) * (1 - range(t, 0.46, 0.5)) + range(t, 0.5, 0.505) * (1 - range(t, 0.505, 0.53)) * 0.6;
      lightning.userData.level = strike * 6;
    },
  };
}
