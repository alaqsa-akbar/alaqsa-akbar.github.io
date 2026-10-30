// Chapter 3 — experience. A neural network built as a brick sculpture: round bricks for
// neurons on grey posts, glowing wires for weights. Scrolling runs one training step:
// a forward pass in red, the loss on a panel, then gradients flowing back in blue.
// The figure from the desk watches it converge.
import * as THREE from 'three';
import { Kit, PLATE } from '../bricks.js';
import { Actor, range } from '../actor.js';
import { island, roundedRect, printed, hash2, equations } from './common.js';

const RED = new THREE.Color('#FF3B2F'), BLUE = new THREE.Color('#36AEFF'), DIM = new THREE.Color('#2A2C31');

export function network({ Minifig, parts }) {
  const k = new Kit({ seed: 8 });
  const extra = new THREE.Group();

  // ---- base: a dark plinth with a red trim, like a display stand ----
  const inside = roundedRect(-12, -7, 12, 7, 1.4);
  island(k, { x0: -12, z0: -7, w: 24, d: 14, inside, colors: ['charcoal', 'black', 'black'] });
  k.layer(-12, 0, -7, 24, 14, null, { h: 1, studs: false, cells: (x, z) => {
    if (!inside(x, z)) return null;
    const rim = !inside(x - 1, z) || !inside(x + 1, z) || !inside(x, z - 1) || !inside(x, z + 1);
    return rim ? 'darkred' : (x + z) % 2 ? 'charcoal' : 'black';
  } });

  // ---- the network: 4 layers standing in a row, nodes stacked on posts ----
  const LAYERS = [3, 5, 5, 2];
  const LX = [-8, -3, 2, 7];
  const NZ = -2; // the plane the sculpture stands in
  const nodes = [];
  const nodeGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.55, 28);
  nodeGeo.rotateX(Math.PI / 2);
  const studG = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 18); studG.rotateX(Math.PI / 2); studG.translate(0, 0, 0.35);
  LAYERS.forEach((n, l) => {
    const x = LX[l];
    // post: a stack of 1×1 round bricks in light grey
    const top = 4 + (n - 1) * 4.5;
    for (let y = 2; y < top + 1; y += 3) k.round(x, y, NZ - 1, 1, 'dbg', { h: 3, studs: false, order: 0.3 + l * 0.05 });
    k.plate(x - 1, 1, NZ - 2, 3, 3, 'charcoal', { order: 0.25 });
    for (let i = 0; i < n; i++) {
      const y = (4 + i * 4.5) * PLATE + 1.2;
      const mat = new THREE.MeshPhysicalMaterial({ color: '#2A2C31', roughness: 0.3, clearcoat: 0.5, emissive: new THREE.Color(0, 0, 0) });
      const node = new THREE.Group();
      const body = new THREE.Mesh(nodeGeo, mat), stud = new THREE.Mesh(studG, mat);
      body.castShadow = true; node.add(body, stud);
      node.position.set(x + 0.5, y, NZ - 0.5 + 0.9);
      k.prop(node, { order: 0.45 + l * 0.08 + i * 0.01 });
      nodes.push({ l, i, mat, pos: node.position.clone(), seed: hash2(l, i, 3) });
    }
  });
  const byLayer = LAYERS.map((_, l) => nodes.filter((n) => n.l === l));

  // ---- weights: one wire per pair of neighbouring nodes, colour animated per vertex ----
  const edges = [];
  for (let l = 0; l < LAYERS.length - 1; l++) for (const a of byLayer[l]) for (const b of byLayer[l + 1]) edges.push({ a, b, l, w: hash2(a.i, b.i, l) });
  const eg = new THREE.BufferGeometry();
  const ep = new Float32Array(edges.length * 6), ec = new Float32Array(edges.length * 6);
  edges.forEach((e, i) => { ep.set([e.a.pos.x + 0.6, e.a.pos.y, e.a.pos.z - 0.2, e.b.pos.x - 0.6, e.b.pos.y, e.b.pos.z - 0.2], i * 6); });
  eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  eg.setAttribute('color', new THREE.BufferAttribute(ec, 3));
  const wires = new THREE.LineSegments(eg, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  k.prop(wires, { order: 0.75 });
  // signal pulses: one bead per edge, riding along it during each pass
  const pg = new THREE.BufferGeometry(), pp = new Float32Array(edges.length * 3), pc = new Float32Array(edges.length * 3);
  pg.setAttribute('position', new THREE.BufferAttribute(pp, 3)); pg.setAttribute('color', new THREE.BufferAttribute(pc, 3));
  const beads = new THREE.Points(pg, new THREE.PointsMaterial({ size: 0.32, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  beads.frustumCulled = false;
  k.prop(beads, { order: 0.8 });

  // ---- input: a little 6×6 mosaic of a hand sign on an easel; output: a softmax panel ----
  const input = printed(2.6, 2.6, (g, W, H) => {
    const hand = ['..##..', '.####.', '.####.', '######', '.####.', '..##..'];
    const s = W / 6;
    g.fillStyle = '#05131D'; g.fillRect(0, 0, W, H);
    hand.forEach((row, y) => [...row].forEach((c, x) => {
      g.fillStyle = c === '#' ? '#D09168' : '#1B2A34'; g.beginPath(); g.arc((x + 0.5) * s, (y + 0.5) * s, s * 0.44, 0, 7); g.fill();
    }));
  });
  input.position.set(-11, 1 * PLATE + 2.2, NZ + 1.2); input.rotation.y = 0.5;
  k.prop(input, { order: 0.6 });
  k.bar(-11, 1, NZ + 1, 5, 'black', { order: 0.55 });

  const out = printed(3.2, 2.4, () => {}, { emissive: true, res: 100 });
  out.position.set(10.2, 1 * PLATE + 2.4, NZ + 1.4); out.rotation.y = -0.45;
  k.prop(out, { order: 0.65 });
  k.fill(9, 1, NZ + 1, 2, 1, 1, 'black', { order: 0.6 });
  const outBack = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.6, 0.15), new THREE.MeshPhysicalMaterial({ color: '#141518', roughness: 0.4 }));
  outBack.position.copy(out.position); outBack.rotation.copy(out.rotation); outBack.translateZ(-0.09); outBack.castShadow = true;
  k.prop(outBack, { order: 0.65 });
  const drawOut = (p, loss) => {
    const { ctx: g, canvas: c, tex } = out.userData; const W = c.width, H = c.height;
    g.fillStyle = '#0B0D12'; g.fillRect(0, 0, W, H);
    // two classes: the right answer climbs as training goes on
    const probs = [0.5 + 0.47 * p, 0.5 - 0.47 * p];
    probs.forEach((v, i) => {
      const y = 40 + i * 70;
      g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(24, y, W - 48, 36);
      g.fillStyle = i === 0 ? '#FF3B2F' : '#5F625D'; g.fillRect(24, y, (W - 48) * v, 36);
    });
    g.fillStyle = 'rgba(255,255,255,.75)'; g.font = 'italic 26px "Times New Roman", serif';
    g.fillText(`ℒ = ${loss.toFixed(2)}`, 24, H - 26);
    tex.needsUpdate = true;
  };
  drawOut(0, 0.69);

  // ---- floating maths ----
  const maths = equations([
    ['softmax(QKᵀ/√d) V', -9, 12, -8, 1.1],
    ['∇θ ℒ', 6, 13.5, -8, 1.3],
    ['min ‖ Pφ(sₓ, z) − sᵧ ‖²', -2, 15.5, -10, 0.9],
    ['Q(s, a) ← r + γ maxₐ′ Q(s′, a′)', 12, 9, -5, 0.9],
    ['xₜ₋₁ = μθ(xₜ, t) + σₜ ε', -14, 7.5, -3, 0.9],
  ]);
  extra.add(maths);
  const glow = new THREE.PointLight('#FF3B2F', 0, 16, 2); glow.position.set(-1, 6, 1); extra.add(glow);
  const glowB = new THREE.PointLight('#36AEFF', 0, 16, 2); glowB.position.set(-1, 6, 1); extra.add(glowB);

  // ---- the figure from the desk ----
  const fig = new Minifig(parts, 'me');
  const actor = new Actor(fig, [
    { t: 0, at: [-7, 4.5], face: 2.6 },
    { t: 0.05, at: [-7, 4.5], face: 2.6, via: [[-3, 3.6]] },
    { t: 0.25, at: [1, 3.8], face: Math.PI + 0.25, pose: { head: 0.2 } },
    { t: 0.5, at: [1, 3.8], face: Math.PI + 0.25, pose: { head: -0.3, armR: 0.5 } },
    { t: 0.55, at: [1, 3.8], face: Math.PI - 0.1, via: [[4.5, 4]] },
    { t: 0.72, at: [7.5, 3.5], face: Math.PI - 0.6, pose: { head: -0.2 } },
    { t: 0.9, at: [7.5, 3.5], face: Math.PI - 0.6, pose: { head: 0.1 } },
    { t: 0.97, at: [7.5, 3.5], face: 0.4, pose: { armL: 2.8, armR: 2.8, armLOut: 0.35, armROut: 0.35, head: 0.2 } },
  ], { floor: 1 });
  k.prop(fig.root, { order: 1 });
  actor.update(0);

  // activation of each node during the forward pass (t .08-.5), gradient during the backward pass (t .55-.9)
  const L = LAYERS.length;
  const fwdAt = (l) => 0.1 + l * 0.1, bwdAt = (l) => 0.58 + (L - 1 - l) * 0.09;
  let lastOut = -1;
  return {
    id: 'network', kit: k, extra,
    light: { key: '#9AA8FF', keyI: 1.2, dir: [0.6, 1, 0.7], sky: '#3A3F66', ground: '#120A10', hemiI: 0.8, env: 0.3, bg: ['#07070D', '#160A14'] },
    cams: [
      { t: 0, pos: [36, 30, 58], target: [0, 3, -1], fov: 21 },
      { t: 0.5, pos: [22, 22, 58], target: [0, 4, -1], fov: 20 },
      { t: 1, pos: [40, 18, 46], target: [1, 4, -1], fov: 19 },
    ],
    update(t, time) {
      actor.update(t, time);
      const fwd = (l) => range(t, fwdAt(l), fwdAt(l) + 0.08);
      const bwd = (l) => range(t, bwdAt(l), bwdAt(l) + 0.08);
      for (const n of nodes) {
        const a = fwd(n.l) * (0.55 + 0.45 * n.seed) * (1 - bwd(n.l));
        const gr = bwd(n.l) * (0.4 + 0.6 * n.seed) * (1 - range(t, 0.92, 1) * 0.7);
        n.mat.emissive.copy(RED).multiplyScalar(a * 1.6).add(BLUE.clone().multiplyScalar(gr * 1.4));
        n.mat.color.copy(DIM).lerp(a > gr ? RED : BLUE, Math.max(a, gr) * 0.5);
      }
      edges.forEach((e, i) => {
        // forward: lit once the signal has crossed; backward: blue wash on the way back
        const f = range(t, fwdAt(e.l) + 0.04, fwdAt(e.l + 1)) * (0.25 + 0.75 * e.w) * (1 - 0.7 * bwd(e.l));
        const b = range(t, bwdAt(e.l + 1) + 0.04, bwdAt(e.l)) * (0.25 + 0.75 * e.w) * (1 - range(t, 0.92, 1) * 0.6);
        const base = 0.08;
        const r = base + f * 1.0 + b * 0.2, g = base + f * 0.23 + b * 0.68, bl = base + f * 0.18 + b * 1.0;
        ec.set([r, g, bl, r, g, bl], i * 6);
        // bead position: travelling forward or back along its wire
        let u = -1, col = RED;
        const fu = (t - fwdAt(e.l) - 0.04) / (fwdAt(e.l + 1) - fwdAt(e.l) - 0.04);
        const bu = (t - bwdAt(e.l + 1) - 0.04) / (bwdAt(e.l) - bwdAt(e.l + 1) - 0.04);
        if (fu > 0 && fu < 1) u = fu; else if (bu > 0 && bu < 1) { u = 1 - bu; col = BLUE; }
        if (u >= 0) {
          pp.set([ep[i * 6] + (ep[i * 6 + 3] - ep[i * 6]) * u, ep[i * 6 + 1] + (ep[i * 6 + 4] - ep[i * 6 + 1]) * u, ep[i * 6 + 2]], i * 3);
          pc.set([col.r * e.w * 2, col.g * e.w * 2, col.b * e.w * 2], i * 3);
        } else pc.set([0, 0, 0], i * 3);
      });
      eg.attributes.color.needsUpdate = true; pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
      // the output panel: prediction sharpens after the update lands
      const p = range(t, 0.45, 0.52) * 0.35 + range(t, 0.86, 0.96) * 0.65;
      if (Math.abs(p - lastOut) > 0.004) { drawOut(p, 0.69 * (1 - p) + 0.04 * p); lastOut = p; }
      glow.userData.level = 18 * range(t, 0.1, 0.4) * (1 - range(t, 0.55, 0.7));
      glowB.userData.level = 14 * range(t, 0.58, 0.75) * (1 - range(t, 0.9, 1));
      maths.userData.tick(time);
    },
  };
}
