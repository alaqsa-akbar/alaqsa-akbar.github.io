// Minecraft-style characters built directly from 64x64 skins (both layers),
// and a Half-Life crowbar extruded from a 16x16 item sprite.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const PX = 0.18; // world units per skin pixel (Steve ≈ 5.8 tall, minifig ≈ 5.1)

function skinTexture(url) {
  const t = new THREE.TextureLoader().load(url);
  t.magFilter = THREE.NearestFilter; t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Box (w,h,d in px) textured from the skin region at (u,v), standard layout.
function skinBox(w, h, d, u, v, inflate = 0) {
  const g = new THREE.BoxGeometry((w + inflate * 2) * PX, (h + inflate * 2) * PX, (d + inflate * 2) * PX);
  const rect = {
    px: [u + d + w, v + d, d, h],     // +x = character's left
    nx: [u, v + d, d, h],             // -x = character's right
    py: [u + d, v, w, d],
    ny: [u + d + w, v, w, d],
    pz: [u + d, v + d, w, h],         // front
    nz: [u + 2 * d + w, v + d, w, h], // back
  };
  const uv = g.attributes.uv;
  ['px', 'nx', 'py', 'ny', 'pz', 'nz'].forEach((f, i) => {
    const [x, y, rw, rh] = rect[f];
    let u0 = x / 64, u1 = (x + rw) / 64, v0 = 1 - y / 64, v1 = 1 - (y + rh) / 64;
    if (f === 'ny') [v0, v1] = [v1, v0];
    // BoxGeometry face vertex order: TL, TR, BL, BR
    uv.setXY(i * 4 + 0, u0, v0); uv.setXY(i * 4 + 1, u1, v0);
    uv.setXY(i * 4 + 2, u0, v1); uv.setXY(i * 4 + 3, u1, v1);
  });
  return g;
}

export class Blocky {
  constructor(skinUrl, { name = 'blocky' } = {}) {
    const map = skinTexture(skinUrl);
    const base = new THREE.MeshStandardMaterial({ map, roughness: 0.85 });
    const over = new THREE.MeshStandardMaterial({ map, roughness: 0.85, transparent: false, alphaTest: 0.5, side: THREE.DoubleSide });
    this.root = new THREE.Group(); this.root.name = name;
    this.body = new THREE.Group(); this.root.add(this.body);
    const J = (this.j = {});
    const part = (parent, pivot, w, h, d, uv, uvO, center, inflate) => {
      const j = new THREE.Group(); j.position.set(...pivot.map((x) => x * PX)); parent.add(j);
      const a = new THREE.Mesh(skinBox(w, h, d, ...uv), base);
      const b = new THREE.Mesh(skinBox(w, h, d, ...uvO, inflate), over);
      for (const m of [a, b]) { m.position.set(...center.map((x) => x * PX)); m.castShadow = true; m.receiveShadow = true; j.add(m); }
      return j;
    };
    // pivots in px, character faces +z
    J.hips = new THREE.Group(); J.hips.position.y = 12 * PX; this.body.add(J.hips);
    J.legR = part(J.hips, [-2, 0, 0], 4, 12, 4, [0, 16], [0, 32], [0, -6, 0], 0.25);
    J.legL = part(J.hips, [2, 0, 0], 4, 12, 4, [16, 48], [0, 48], [0, -6, 0], 0.25);
    J.torso = part(J.hips, [0, 0, 0], 8, 12, 4, [16, 16], [16, 32], [0, 6, 0], 0.25);
    J.head = part(J.torso, [0, 12, 0], 8, 8, 8, [0, 0], [32, 0], [0, 4, 0], 0.5);
    J.armR = part(J.torso, [-6, 10, 0], 4, 12, 4, [40, 16], [40, 32], [0, -4, 0], 0.25);
    J.armL = part(J.torso, [6, 10, 0], 4, 12, 4, [32, 48], [48, 48], [0, -4, 0], 0.25);
    this.legLength = 12 * PX;
    this.height = 32 * PX;
  }

  setPose(p) {
    const J = this.j;
    J.legL.rotation.x = -(p.legL || 0);
    J.legR.rotation.x = -(p.legR || 0);
    J.armL.rotation.set(-(p.armL || 0), 0, p.armLOut || 0);
    J.armR.rotation.set(-(p.armR || 0), 0, -(p.armROut || 0));
    J.head.rotation.set(p.headPitch || 0, p.head || 0, 0);
    J.torso.rotation.y = p.waist || 0;
    const a = Math.max(Math.abs(p.legL || 0), Math.abs(p.legR || 0));
    const sit = p.sit || 0;
    const drop = this.legLength * (1 - Math.cos(Math.min(a, 1.2))) * (1 - sit);
    this.body.position.y = -drop + (p.lift || 0) + sit * ((p.seat ?? 1.2) + 0.05 - this.legLength);
  }

  // Item held Minecraft-style: sprite plane runs front-to-back, grip in the fist.
  hold(object, grip = [0, 0]) {
    const hand = new THREE.Group();
    hand.position.set(0, -10 * PX, 0.4 * PX);
    this.j.armR.add(hand);
    const turn = new THREE.Group();
    turn.rotation.set(0, -Math.PI / 2, 0);
    hand.add(turn);
    object.position.set(-grip[0], -grip[1], 0);
    turn.add(object);
    this.held = hand;
    return hand;
  }
}

export function blockyWalk(phase, amp = 0.62) {
  const s = Math.sin(phase);
  return { legL: s * amp, legR: -s * amp, armL: -s * amp * 0.85, armR: s * amp * 0.85, head: 0 };
}
export const BLOCKY_STRIDE = 4 * 12 * PX * Math.sin(0.62);

// 16x16 crowbar sprite: R = red paint, D = dark red, G = steel, S = shadow steel
const CROWBAR = [
  '..............GG',
  '.............GSG',
  '............GS.G',
  '...........DR..S',
  '..........DR....',
  '.........DR.....',
  '........DR......',
  '.......DR.......',
  '......DR........',
  '.....DR.........',
  '....DR..........',
  '...DR...........',
  '..DR............',
  '.GS.............',
  'GS..............',
  'S...............',
];
export function crowbar(scale = PX * 0.9) {
  const col = { R: '#C0281E', D: '#7E1712', G: '#B9BEC4', S: '#6E7378' };
  const geos = [];
  CROWBAR.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const g = new THREE.BoxGeometry(scale, scale, scale);
    g.translate((x - 7.5) * scale, (7.5 - y) * scale, 0);
    const c = new THREE.Color(col[ch]); c.convertSRGBToLinear();
    const n = g.attributes.position.count, arr = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) arr.set([c.r, c.g, c.b], i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
    geos.push(g);
  }));
  const m = new THREE.Mesh(mergeGeometries(geos), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 }));
  m.castShadow = true;
  m.userData.grip = [(3.5 - 7.5) * scale, (7.5 - 11.5) * scale];
  return m;
}
