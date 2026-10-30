// Chapter 5 — a harbour at sunset with the Going Merry moored at the pier.
// Luffy walks the pier, boards, runs to the bow and takes his seat on the sheep.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Kit, PLATE } from '../bricks.js';
import { Actor, range } from '../actor.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { printed, hash2 } from './common.js';

// The Merry's hull in plan: stern at u = 0 (x = -6), bow tip near u = 19.5 (x = 13.5).
const SX = -6;
function halfWidth(u) {
  if (u < 0 || u > 19.6) return -1;
  if (u < 2.5) return 2.1 + 0.7 * (u / 2.5);
  if (u < 12) return 2.8;
  return 2.8 * (1 - ((u - 12) / 7.6) ** 1.4);
}
const onShip = (x, z) => { const u = x + 0.5 - SX, v = z + 0.5; return Math.abs(v) <= halfWidth(u) - 0.2; };
const edgeOf = (x, z) => onShip(x, z) && (!onShip(x - 1, z) || !onShip(x + 1, z) || !onShip(x, z - 1) || !onShip(x, z + 1));

// The Straw Hat jolly roger, as printed on the set's sail and flags: an outlined skull and
// crossbones wearing Luffy's hat. `bg` omitted = transparent.
function jollyRoger(g, W, H, { bg = null, bone = '#F4F1EA', ink = '#141416' } = {}) {
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, W, H); }
  const s = Math.min(W, H), cx = W / 2, cy = H * 0.56;
  g.lineJoin = g.lineCap = 'round';
  const outlined = (path, fill) => { g.strokeStyle = ink; g.lineWidth = s * 0.03; g.stroke(path); g.fillStyle = fill; g.fill(path); };
  // crossbones, knobbed at both ends
  const bones = new Path2D();
  for (const a of [0.7, -0.7]) {
    const dx = Math.cos(a) * s * 0.36, dy = Math.sin(a) * s * 0.36, nx = -Math.sin(a) * s * 0.035, ny = Math.cos(a) * s * 0.035;
    const shaft = new Path2D();
    shaft.moveTo(cx - dx + nx, cy + 0.06 * s - dy + ny); shaft.lineTo(cx + dx + nx, cy + 0.06 * s + dy + ny);
    shaft.lineTo(cx + dx - nx, cy + 0.06 * s + dy - ny); shaft.lineTo(cx - dx - nx, cy + 0.06 * s - dy - ny); shaft.closePath();
    bones.addPath(shaft);
    for (const e of [-1, 1]) for (const k of [-1, 1]) {
      const knob = new Path2D(); knob.arc(cx + e * dx + k * nx * 1.3, cy + 0.06 * s + e * dy + k * ny * 1.3, s * 0.05, 0, 7); bones.addPath(knob);
    }
  }
  outlined(bones, bone);
  // skull and jaw
  const skull = new Path2D();
  skull.arc(cx, cy - s * 0.02, s * 0.19, 0, 7);
  skull.roundRect(cx - s * 0.12, cy + s * 0.08, s * 0.24, s * 0.14, s * 0.04);
  outlined(skull, bone);
  g.fillStyle = ink;
  for (const k of [-1, 1]) { g.beginPath(); g.ellipse(cx + k * s * 0.075, cy + s * 0.01, s * 0.05, s * 0.06, 0, 0, 7); g.fill(); }
  g.beginPath(); g.moveTo(cx, cy + s * 0.07); g.lineTo(cx - s * 0.02, cy + s * 0.105); g.lineTo(cx + s * 0.02, cy + s * 0.105); g.fill();
  g.strokeStyle = ink; g.lineWidth = s * 0.012;
  g.beginPath(); g.moveTo(cx - s * 0.1, cy + s * 0.16); g.lineTo(cx + s * 0.1, cy + s * 0.16);
  for (let i = -2; i <= 2; i++) { g.moveTo(cx + i * s * 0.04, cy + s * 0.125); g.lineTo(cx + i * s * 0.04, cy + s * 0.2); }
  g.stroke();
  // the straw hat: brim, crown, red band
  const brim = new Path2D(); brim.ellipse(cx, cy - s * 0.15, s * 0.3, s * 0.06, 0, 0, 7);
  outlined(brim, '#F2C230');
  const crown = new Path2D(); crown.ellipse(cx, cy - s * 0.16, s * 0.165, s * 0.15, 0, Math.PI, 0); crown.closePath();
  outlined(crown, '#F2C230');
  g.save(); g.clip(crown); g.fillStyle = '#A3150F'; g.fillRect(cx - s * 0.2, cy - s * 0.215, s * 0.4, s * 0.05); g.restore();
}

// White round tiles printed with a tan spiral, the set's decoration on the sheep and gunwale
let swirlMats;
function swirl(r, depth = 0.2) {
  if (!swirlMats) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = '#F2F0EA'; g.fillRect(0, 0, 128, 128);
    g.strokeStyle = '#C49A52'; g.lineWidth = 6; g.lineCap = 'round';
    g.beginPath(); for (let a = 0; a < 5 * Math.PI; a += 0.08) { const rr = 3 + a * 3.6; g.lineTo(64 + Math.cos(a) * rr, 64 + Math.sin(a) * rr); } g.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const plain = new THREE.MeshPhysicalMaterial({ color: '#F2F0EA', roughness: 0.35, clearcoat: 0.3 });
    swirlMats = [plain, new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.35, clearcoat: 0.3 }), plain];
  }
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, depth, 28), swirlMats);
  m.castShadow = true;
  return m;
}
// a disc on a surface facing +z (side 1) or -z (side -1)
const facing = (m, side) => { m.rotation.x = side * Math.PI / 2; return m; };

export function harbor({ Minifig, parts }) {
  const k = new Kit({ seed: 5 });
  const extra = new THREE.Group();
  const X0 = -16, Z0 = -10, W = 32, D = 20;
  const sea = (x, z) => { const cx = x + 0.5, cz = z + 0.5; return (cx / 16) ** 2 + (cz / 10.2) ** 2 + (hash2(x >> 2, z >> 2, 2) - 0.5) * 0.05 < 1; };
  const quay = (x, z) => sea(x, z) && x < -10;
  const posts = new Set();
  for (const x of [-9, -6, -3, 0]) for (const z of [4, 6]) posts.add(`${x},${z}`);
  const open = (x, z) => sea(x, z) && !quay(x, z) && !onShip(x, z) && !posts.has(`${x},${z}`);

  // seabed, then translucent water only where nothing else stands (no shared volume = no z-fighting)
  k.layer(X0, -7, Z0, W, D, null, { h: 3, cells: (x, z) => (sea(x, z) ? 'darkblue' : null) });
  k.layer(X0, -4, Z0, W, D, null, { h: 3, phase: 1, cells: (x, z) => (sea(x, z) && !onShip(x, z) && !quay(x, z) ? 'darkblue' : null) });
  k.layer(X0, -1, Z0, W, D, null, { h: 1, studs: false, phase: 2, kind: 'water', cells: (x, z) => (open(x, z) ? (hash2(x, z, 3) < 0.88 ? 'transblue' : 'transdblue') : null) });

  // stone quay with a timber pier along the ship's near side
  for (let L = 0; L < 3; L++) k.layer(X0, -4 + L * 3, Z0, W, D, null, { h: 3, phase: L, cells: (x, z) => (quay(x, z) ? (hash2(x, z, L) < 0.6 ? 'lbg' : 'stone') : null) });
  k.layer(X0, 5, Z0, W, D, null, { h: 1, phase: 3, cells: (x, z) => (quay(x, z) ? (hash2(x, z, 5) < 0.5 ? 'tan' : 'darktan') : null) });
  for (const key of posts) { const [x, z] = key.split(',').map(Number); k.round(x, -1, z, 1, 'darkbrown', { h: 6, studs: false }); }
  for (let x = -10; x < 1; x++) k.tile(x, 6, 4, 1, 3, x % 2 ? 'brown' : 'darkbrown');
  // crates, barrel, lantern
  k.brick(-14, 6, 2, 2, 2, 'brown'); k.brick(-14, 9, 2, 2, 2, 'darktan');
  k.brick(-13, 6, -3, 2, 2, 'darktan');
  k.round(-14, 6, -6, 2, 'brown', { h: 6 });
  k.bar(-11, 6, 7, 9, 'black');
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 0.6), new THREE.MeshBasicMaterial({ color: '#FFC46B', toneMapped: false }));
  lantern.position.set(-10.5, 6 * PLATE + 9 * PLATE + 0.4, 7.5); k.prop(lantern, { order: 0.85 });
  const lanternL = new THREE.PointLight('#FFB45A', 10, 9, 2); lanternL.position.copy(lantern.position); extra.add(lanternL);

  // ---------- the Going Merry, after the LEGO set (75639) ----------
  const SY = -4; // keel below the waterline, visible through the water
  // hull courses from the keel up: dark keel, reddish brown, the dark grey band, reddish
  // brown to the deck. Lower courses pull in so the sides curve.
  const courses = [[3, 'darkbrown', 1.1], [3, 'brown', 0.5], [2, 'dbg', 0.2], [3, 'brown', 0], [1, 'brown', 0]];
  const inHull = (inset, x, z) => { const h = halfWidth(x + 0.5 - SX) - 0.2 - inset; return h >= 0 && Math.abs(z + 0.5) <= h; };
  for (let L = 0, y = SY; L < courses.length; y += courses[L][0], L++) {
    const [h, col, inset] = courses[L];
    const edge = (x, z) => inHull(inset, x, z) && (!inHull(inset, x - 1, z) || !inHull(inset, x + 1, z) || !inHull(inset, x, z - 1) || !inHull(inset, x, z + 1));
    k.layer(SX, y, -4, 21, 8, null, { h, phase: L, cells: (x, z) => (edge(x, z) ? col : null) });
  }
  // the hull's outer face on the +z side at column x (it's mirror-symmetric)
  const sideZ = (x) => { let z = 0; while (inHull(0, x, z + 1)) z++; return z + 1; };
  const DECK = SY + 12; // deck plate height; you walk on DECK + 1
  k.layer(SX, DECK, -4, 21, 8, null, { h: 1, studs: false, cells: (x, z) => (onShip(x, z) ? (edgeOf(x, z) ? 'white' : (z & 1) ? 'tan' : 'darktan') : null) });
  const aft = (x) => x + 0.5 - SX <= 4.5;
  const gangGap = (x, z) => z === 2 && x >= -1 && x <= 0;
  const bowRise = (x) => x + 0.5 - SX >= 15.5; // the forecastle rises a brick toward the sheep
  // the white balustrade: a post on every edge stud under one chunky handrail that rises
  // with the forecastle
  for (let x = SX; x < SX + 21; x++) for (let z = -4; z < 4; z++) {
    if (!edgeOf(x, z) || aft(x) || gangGap(x, z)) continue;
    if (bowRise(x)) k.brick(x, DECK + 1, z, 1, 1, 'white', { studs: false });
    k.bar(x, DECK + (bowRise(x) ? 4 : 1), z, 2, 'white', { order: 0.75 });
  }
  const railY = (u) => (DECK + 3 + 3 * THREE.MathUtils.smoothstep(u, 14.6, 15.6)) * PLATE + 0.06;
  const railMat = new THREE.MeshPhysicalMaterial({ color: '#E9E6DE', roughness: 0.45, clearcoat: 0.2 });
  const tube = (pts, r, closed = false) => new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed, 'centripetal'), pts.length * 4, r, 8, closed);
  const railGeos = [];
  for (const side of [-1, 1]) {
    const pts = [];
    // the near side (+z) starts after the gangway gap
    for (let u = side === 1 ? 7 : 5; u <= 19.2; u += 0.5) pts.push(new THREE.Vector3(SX + u, railY(u), side * Math.max(0.05, halfWidth(u) - 0.7)));
    railGeos.push(tube(pts, 0.18));
  }

  // aftcastle: a reddish-brown cabin with portholes, a balustrade round its roof, and Nami's
  // tangerine trees up top
  for (let L = 0; L < 2; L++) k.layer(SX, DECK + 1 + L * 3, -4, 5, 8, null, { h: 3, phase: L, cells: (x, z) => {
    if (!onShip(x, z) || !aft(x)) return null;
    if (x === SX + 4 && (z === -1 || z === 0)) return 'darkbrown';
    return 'brown';
  } });
  const ROOF = DECK + 7;
  const onRoof = (x, z) => onShip(x, z) && aft(x);
  k.layer(SX, ROOF, -4, 5, 8, null, { h: 1, studs: false, cells: (x, z) => (onRoof(x, z) ? (onRoof(x + 1, z) && onRoof(x - 1, z) && onRoof(x, z + 1) && onRoof(x, z - 1) ? 'tan' : 'white') : null) });
  const roofPosts = [];
  for (let x = SX; x < SX + 5; x++) for (let z = -4; z < 4; z++) {
    if (!onRoof(x, z) || (onRoof(x + 1, z) && onRoof(x - 1, z) && onRoof(x, z + 1) && onRoof(x, z - 1))) continue;
    k.bar(x, ROOF + 1, z, 2, 'white', { order: 0.8 });
    roofPosts.push(new THREE.Vector3(x + 0.5, (ROOF + 3) * PLATE + 0.06, z + 0.5));
  }
  const rc = new THREE.Vector3(SX + 2.5, 0, 0);
  roofPosts.sort((a, b) => Math.atan2(a.z - rc.z, a.x - rc.x) - Math.atan2(b.z - rc.z, b.x - rc.x));
  railGeos.push(tube(roofPosts, 0.14, true));
  const rails = new THREE.Mesh(mergeGeometries(railGeos), railMat);
  rails.castShadow = true; k.prop(rails, { order: 0.82 });
  for (const [x, z] of [[SX + 1, -2], [SX + 1, 0]]) {
    k.round(x + 0.5, ROOF + 1, z + 0.5, 1, 'brown', { h: 2, studs: false, order: 0.84 });
  }
  // leafy round crowns
  const leaves = [];
  for (const [x, z] of [[SX + 1, -2], [SX + 1, 0]]) for (const [dx, dy, dz, r] of [[0, 1.45, 0, 0.95], [-0.45, 1.25, 0.35, 0.6], [0.4, 1.2, -0.4, 0.6], [0.1, 2.1, 0.1, 0.55]]) {
    leaves.push(new THREE.IcosahedronGeometry(r, 1).translate(x + 1 + dx, (ROOF + 1) * PLATE + dy, z + 1 + dz));
  }
  const crowns = new THREE.Mesh(mergeGeometries(leaves), new THREE.MeshPhysicalMaterial({ color: '#2E7D3A', roughness: 0.45, clearcoat: 0.2, flatShading: true }));
  crowns.castShadow = true; k.prop(crowns, { order: 0.85 });
  const orange = new THREE.MeshPhysicalMaterial({ color: '#FE8A18', roughness: 0.35, clearcoat: 0.3 });
  const fruit = [];
  for (const [x, z] of [[SX + 1, -2], [SX + 1, 0]]) for (const [dx, dy, dz] of [[-0.85, 0.4, 0.2], [0.75, 0.7, -0.4], [0.1, 1.0, 0.85], [-0.2, 0.2, -0.85]]) {
    fruit.push(new THREE.SphereGeometry(0.2, 10, 8).translate(x + 1 + dx * 1.15, (ROOF + 3) * PLATE + dy, z + 1 + dz * 1.15));
  }
  k.prop(new THREE.Mesh(mergeGeometries(fruit), orange), { order: 0.87 });
  // portholes along the cabin's near side
  const brass = new THREE.MeshPhysicalMaterial({ color: '#6C6E68', roughness: 0.3, clearcoat: 0.4 });
  const glass = new THREE.MeshPhysicalMaterial({ color: '#1C2A3C', roughness: 0.08, clearcoat: 1 });
  const ports = new THREE.Group();
  for (const x of [-4.4, -2.4]) {
    const z = sideZ(Math.floor(x)) + 0.03, y = (DECK + 4) * PLATE + 0.1;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.07, 8, 20), brass); ring.position.set(x, y, z);
    const pane = new THREE.Mesh(new THREE.CircleGeometry(0.24, 20), glass); pane.position.set(x, y, z - 0.01);
    ports.add(ring, pane);
  }
  k.prop(ports, { order: 0.83 });

  // cannons on the near side
  const iron = new THREE.MeshStandardMaterial({ color: '#1A1B1E', roughness: 0.45, metalness: 0.6 });
  for (const x of [1, 6]) {
    const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.4, 14), iron);
    cannon.rotation.x = Math.PI / 2; cannon.position.set(x + 0.5, (SY + 9) * PLATE + 0.6, 3.15); cannon.castShadow = true;
    k.prop(cannon, { order: 0.78 });
  }
  // gangplank from the pier up to the deck
  const plank = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.18, 2.6), new THREE.MeshStandardMaterial({ color: '#6B4428', roughness: 0.8 }));
  plank.position.set(-0.5, ((6 + 1) * PLATE + (DECK + 1) * PLATE) / 2, 3.4); plank.rotation.x = 0.36; plank.castShadow = true; plank.receiveShadow = true;
  k.prop(plank, { order: 0.8 });

  // main mast: crow's nest barrel, the big cream sail with the jolly roger, a black flag
  const MX = 3, MZ = -0.5;
  k.round(MX, DECK + 1, MZ, 1, 'brown', { h: 2, studs: false });
  const wood = new THREE.MeshPhysicalMaterial({ color: '#6E3B1E', roughness: 0.5, clearcoat: 0.25 });
  const spar = (a, b, r) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, a.distanceTo(b), 10), wood);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
    m.castShadow = true; return m;
  };
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.34, 46 * PLATE, 16), wood);
  mast.position.set(MX + 0.5, (DECK + 3 + 23) * PLATE, MZ + 0.5); mast.castShadow = true;
  k.prop(mast, { order: 0.85 });
  const nest = new THREE.Group();
  const nestFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.2, 20), wood);
  const staves = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 0.95, 1.1, 20, 1, true), new THREE.MeshPhysicalMaterial({ color: '#7A4524', roughness: 0.6, side: THREE.DoubleSide }));
  staves.position.y = 0.6;
  nest.add(nestFloor, staves);
  for (const [y, r] of [[0.25, 0.99], [0.95, 1.12]]) { const hoop = new THREE.Mesh(new THREE.TorusGeometry(r, 0.06, 6, 28), iron); hoop.rotation.x = Math.PI / 2; hoop.position.y = y; nest.add(hoop); }
  nest.traverse((m) => { m.castShadow = true; });
  nest.position.set(MX + 0.5, (DECK + 36) * PLATE, MZ + 0.5);
  k.prop(nest, { order: 0.86 });
  const sail = printed(8.4, 7.2, (g, Wc, Hc) => {
    g.fillStyle = '#ECDDB4'; g.fillRect(0, 0, Wc, Hc);
    g.strokeStyle = 'rgba(120,95,60,.22)'; g.lineWidth = 3;
    for (let i = 1; i < 4; i++) { g.beginPath(); g.moveTo((Wc * i) / 4, 0); g.lineTo((Wc * i) / 4, Hc); g.stroke(); }
    g.fillStyle = '#2A2C30';
    for (const [x, y] of [[0.03, 0.04], [0.97, 0.04], [0.03, 0.96], [0.97, 0.96]]) { g.beginPath(); g.arc(x * Wc, y * Hc, Wc * 0.018, 0, 7); g.fill(); }
    jollyRoger(g, Wc, Hc);
  }, { res: 60, rough: 0.9 });
  sail.material.side = THREE.DoubleSide;
  sail.geometry = new THREE.PlaneGeometry(8.4, 7.2, 10, 8);
  const sailBase = sail.geometry.attributes.position.array.slice();
  sail.rotation.y = Math.PI / 2; // faces the bow (+x)
  sail.position.set(MX + 1.1, (DECK + 12) * PLATE + 4.0, MZ + 0.5); sail.castShadow = true;
  k.prop(sail, { order: 0.88 });
  for (const dy of [3.65, -3.65]) k.prop(spar(new THREE.Vector3(MX + 0.9, sail.position.y + dy, MZ + 0.5 - 4.6), new THREE.Vector3(MX + 0.9, sail.position.y + dy, MZ + 0.5 + 4.6), 0.12), { order: 0.87 });
  const flagGeo = () => {
    const f = printed(2.6, 1.7, (g, Wc, Hc) => jollyRoger(g, Wc, Hc, { bg: '#141416' }));
    f.material.side = THREE.DoubleSide; f.position.x = 1.35; return f;
  };
  const flags = [];
  const flag = (x, y, z) => { const p = new THREE.Group(); p.position.set(x, y, z); p.add(flagGeo()); k.prop(p, { order: 0.9 }); flags.push(p); };
  flag(MX + 0.5, (DECK + 49) * PLATE - 0.9, MZ + 0.5);

  // mizzen mast on the cabin roof, with the red-and-cream striped sail hung from a long
  // raked yard, peak toward the stern
  const ZX = SX + 3.5, ZZ = -0.5, ZTOP = 19;
  k.round(ZX - 0.5, ROOF + 1, ZZ - 0.5, 1, 'brown', { h: 2, studs: false, order: 0.84 });
  k.prop(spar(new THREE.Vector3(ZX, (ROOF + 3) * PLATE, ZZ), new THREE.Vector3(ZX, ZTOP, ZZ), 0.22), { order: 0.86 });
  const zs = -0.9; // the sail hangs just behind the mast (seen from the quay)
  const boomA = new THREE.Vector3(0.1, 9.9, zs), boomB = new THREE.Vector3(-6.6, 9.9, zs);
  const yardA = new THREE.Vector3(0.5, 10.4, zs), yardB = new THREE.Vector3(-7.2, 17.8, zs);
  const stripes = printed(1, 1, (g, Wc, Hc) => {
    for (let i = 0; i < 9; i++) { g.fillStyle = i % 2 ? '#8E1712' : '#ECDDB4'; g.fillRect((Wc * i) / 9, 0, Wc / 9 + 1, Hc); }
  }, { res: 256, rough: 0.9 });
  stripes.material.side = THREE.DoubleSide;
  const sg = new THREE.PlaneGeometry(1, 1, 10, 8), sp = sg.attributes.position, suv = sg.attributes.uv;
  const tmp = new THREE.Vector3(), yardAt = new THREE.Vector3();
  for (let i = 0; i < sp.count; i++) {
    const u = suv.getX(i), v = suv.getY(i);
    tmp.lerpVectors(boomA, boomB, u); yardAt.lerpVectors(yardA, yardB, u); tmp.lerp(yardAt, v);
    tmp.z -= 0.5 * Math.sin(Math.PI * u) * Math.sin(Math.PI * v);
    sp.setXYZ(i, tmp.x, tmp.y, tmp.z);
  }
  sg.computeVertexNormals(); stripes.geometry = sg; stripes.castShadow = true;
  k.prop(stripes, { order: 0.88 });
  k.prop(spar(boomA.clone().setX(0.4), boomB.clone().setX(-6.9), 0.1), { order: 0.87 });
  k.prop(spar(yardA.clone().lerp(yardB, -0.06), yardB.clone().lerp(yardA, -0.04), 0.1), { order: 0.87 });
  flag(ZX, ZTOP - 0.9, ZZ);

  // the sheep figurehead: a big white head on a neck from the bow, spiral horns, and the
  // curly white mane trailing down the near side
  const ram = new THREE.Group();
  const white = new THREE.MeshPhysicalMaterial({ color: '#E9E6DE', roughness: 0.45, clearcoat: 0.2 });
  const head = new THREE.Mesh(new RoundedBoxGeometry(1.9, 1.5, 1.5, 3, 0.45), white);
  const snout = new THREE.Mesh(new RoundedBoxGeometry(1.0, 0.95, 1.15, 3, 0.32), white); snout.position.set(1.05, -0.3, 0);
  ram.add(head, snout);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2, curl = new THREE.Mesh(new THREE.SphereGeometry(0.34, 12, 8), white);
    curl.position.set(-0.2 + Math.cos(a) * 0.45, 0.66, Math.sin(a) * 0.45); ram.add(curl);
  }
  const ink = new THREE.MeshBasicMaterial({ color: '#141416' });
  for (const s of [1, -1]) {
    const horn = facing(swirl(0.62, 0.3), s); horn.position.set(-0.3, 0.05, s * 0.82); ram.add(horn);
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), ink); eye.position.set(0.62, 0.22, s * 0.6); ram.add(eye);
    const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), ink); nostril.position.set(1.56, -0.2, s * 0.2); ram.add(nostril);
  }
  ram.traverse((m) => { if (m.isMesh && m.material !== ink) m.castShadow = true; });
  const BOW_X = SX + 19.4;
  ram.scale.setScalar(1.2);
  ram.position.set(BOW_X + 0.6, (DECK + 4) * PLATE + 0.9, 0); // up on the raised forecastle
  k.prop(ram, { order: 0.82 });
  const ramTop = ram.position.y + 0.75 * 1.2; // he sits right on top of the head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.85, 2.4, 20), white);
  neck.position.set(BOW_X - 0.25, (DECK + 1) * PLATE + 1.0, 0); neck.rotation.z = -0.4; neck.castShadow = true;
  k.prop(neck, { order: 0.81 });
  // the mane: a ribbed white hose from behind the head, sagging along the hull
  const hoseAt = (x, y, out = 0.3) => new THREE.Vector3(x, y, x > SX + 18.5 ? 0.75 : sideZ(Math.floor(x)) + out);
  const hose = new THREE.CatmullRomCurve3([hoseAt(BOW_X - 0.1, ram.position.y - 0.3), hoseAt(BOW_X - 1.2, (DECK + 1) * PLATE, 0.35),
    hoseAt(BOW_X - 3.2, 2.0), hoseAt(BOW_X - 5.6, 2.6), hoseAt(BOW_X - 7, (DECK + 1) * PLATE, 0.2)]);
  const ribs = [new THREE.TubeGeometry(hose, 60, 0.12, 8)];
  const along = new THREE.Vector3(0, 0, 1), q = new THREE.Quaternion(), mtx = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
  for (let i = 0; i <= 44; i++) {
    const t = i / 44;
    q.setFromUnitVectors(along, hose.getTangentAt(t));
    ribs.push(new THREE.TorusGeometry(0.17, 0.07, 6, 12).applyMatrix4(mtx.compose(hose.getPointAt(t), q, one)));
  }
  const mane = new THREE.Mesh(mergeGeometries(ribs), white); mane.castShadow = true;
  k.prop(mane, { order: 0.83 });
  // spiral tiles on the gunwale, bow and stern, both sides
  const tiles = new THREE.Group();
  for (const s of [1, -1]) for (const [x, y, r] of [[8.4, (DECK + 2.6) * PLATE, 0.8], [7.0, (DECK + 0.5) * PLATE, 0.5], [SX + 1, (DECK + 5) * PLATE, 0.6]]) {
    const d = facing(swirl(r), s); d.position.set(x, y, s * (sideZ(Math.floor(x)) + 0.1)); tiles.add(d);
  }
  k.prop(tiles, { order: 0.84 });
  // the anchor on its chain under the bow tiles
  const anchor = new THREE.Group();
  const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 1.5, 8), iron); shank.position.y = -0.75;
  const stock = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.9, 8), iron); stock.rotation.z = Math.PI / 2; stock.position.y = -0.2;
  const arms = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.08, 6, 16, Math.PI), iron); arms.rotation.z = Math.PI; arms.position.y = -1.0;
  anchor.add(shank, stock, arms);
  for (const sx of [-1, 1]) { const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.36, 6), iron); fluke.position.set(sx * 0.55, -0.92, 0); anchor.add(fluke); }
  anchor.position.set(4.6, 2.0, sideZ(4) + 0.22);
  for (let i = 0; i < 6; i++) {
    const link = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.035, 5, 10), iron);
    link.position.set(0, 0.2 + i * 0.2, -0.02 * i); link.rotation.y = i % 2 ? Math.PI / 2 : 0; anchor.add(link);
  }
  anchor.traverse((m) => { m.castShadow = true; });
  k.prop(anchor, { order: 0.83 });

  // standing rigging: forestay to the bow, stays to the stern, shrouds to either side
  const MTOP = new THREE.Vector3(MX + 0.5, (DECK + 46) * PLATE, MZ + 0.5);
  const bowTip = new THREE.Vector3(BOW_X - 0.4, (DECK + 5) * PLATE, 0);
  const rig = [MTOP, bowTip, MTOP, new THREE.Vector3(ZX, ZTOP - 0.3, ZZ), new THREE.Vector3(ZX, ZTOP - 0.3, ZZ), new THREE.Vector3(SX + 0.5, (ROOF + 3) * PLATE, 0)];
  for (const z of [-1, 1]) {
    for (const dx of [-0.8, 0.8]) rig.push(new THREE.Vector3(MX + 0.5, (DECK + 36) * PLATE, MZ + 0.5), new THREE.Vector3(MX + 0.5 + dx, (DECK + 3) * PLATE, z * (halfWidth(MX + 0.5 - SX) - 0.6)));
    rig.push(new THREE.Vector3(ZX, ZTOP - 1.5, ZZ), new THREE.Vector3(ZX + 0.8, (ROOF + 3) * PLATE, z * 2.0));
  }
  const rigging = new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(rig), new THREE.LineBasicMaterial({ color: '#5A3E22' }));
  k.prop(rigging, { order: 0.9 });

  // sunset, gulls, foam
  const sun = printed(26, 26, (g, Wc, Hc) => {
    const gr = g.createRadialGradient(Wc / 2, Hc / 2, 0, Wc / 2, Hc / 2, Wc / 2);
    gr.addColorStop(0, 'rgba(255,236,190,1)'); gr.addColorStop(0.09, 'rgba(255,200,120,.9)'); gr.addColorStop(0.2, 'rgba(255,150,80,.25)'); gr.addColorStop(1, 'rgba(255,120,60,0)');
    g.fillStyle = gr; g.fillRect(0, 0, Wc, Hc);
  }, { emissive: true, res: 10 });
  sun.material.transparent = true; sun.material.depthWrite = false;
  sun.position.set(-30, 4, -80); sun.lookAt(30, 20, 60); extra.add(sun);
  const gulls = [];
  for (let i = 0; i < 3; i++) {
    const g = new THREE.Group();
    const wingM = new THREE.MeshStandardMaterial({ color: '#E9E4DA', roughness: 0.8, side: THREE.DoubleSide });
    const wl = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.25).rotateX(-Math.PI / 2), wingM), wr = wl.clone();
    wl.position.x = -0.45; wr.position.x = 0.45; const wlP = new THREE.Group(), wrP = new THREE.Group(); wlP.add(wl); wrP.add(wr);
    g.add(wlP, wrP); g.userData = { wlP, wrP, r: 10 + i * 3, h: 14 + i * 2, s: 0.25 + i * 0.07, o: i * 2 };
    extra.add(g); gulls.push(g);
  }
  const foam = [];
  for (let i = 0; i < 12; i++) {
    const f = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.12, 12), new THREE.MeshStandardMaterial({ color: '#F4F7FF', roughness: 0.4 }));
    const u = 2 + hash2(i, 1) * 15, side = hash2(i, 2) < 0.5 ? -1 : 1;
    f.position.set(SX + u, 0.06, side * (sideZ(Math.floor(SX + u)) + 0.4)); extra.add(f); foam.push(f);
  }

  // Luffy: quay → pier → gangplank → deck → bow → onto the sheep
  const luffy = new Minifig(parts, 'luffy');
  const seated = { sit: 1, seat: 0, legL: 1.5, legR: 1.5, armL: 0.2, armR: 0.2 };
  const top = ramTop / PLATE, deckY = DECK + 1;
  const actor = new Actor(luffy, [
    { t: 0, at: [-13, 5], y: 6, face: 1.0, pose: { armR: 2.9, armROut: 0.2 } },
    { t: 0.08, at: [-13, 5], y: 6, face: 1.4 },
    { t: 0.3, at: [-0.5, 5.4], y: 6, face: Math.PI },
    { t: 0.38, at: [-0.5, 1.3], y: deckY, face: Math.PI / 2 },
    { t: 0.4, at: [-0.5, 1.3], y: deckY, face: Math.PI / 2, via: [[5.5, 1.4]] },
    { t: 0.6, at: [BOW_X - 2.4, 0], y: deckY, face: Math.PI / 2 },
    { t: 0.68, at: [BOW_X + 0.3, 0], y: top, face: Math.PI / 2, slide: true, pose: { sit: 0.3, seat: 0, legL: 0.6, legR: 0.6 } },
    { t: 0.76, at: [BOW_X + 0.5, 0], y: top, face: Math.PI / 2, pose: seated },
    { t: 0.86, at: [BOW_X + 0.5, 0], y: top, face: Math.PI / 2, pose: { ...seated, armR: 2.9, armROut: 0.15 } },
    { t: 1, at: [BOW_X + 0.5, 0], y: top, face: 0.8, pose: { ...seated, armR: 2.9, armROut: 0.15, head: 0.4, armL: 0.6 } },
  ], { floor: 6 });
  k.prop(luffy.root, { order: 1 });
  actor.update(0);

  return {
    id: 'harbor', kit: k, extra,
    shift: [0.24, -0.02],
    // golden hour: a low warm sun behind the ship, a cool blue sky filling the shadows
    light: { key: '#FFB774', keyI: 1.55, dir: [-0.45, 0.55, -0.9], sky: '#A8B8E2', ground: '#2A3552', hemiI: 0.95, env: 0.36, bg: ['#16213F', '#B8653C'] },
    cams: [
      { t: 0, pos: [30, 34, 70], target: [-1, 5, 0], fov: 23 },
      { t: 0.45, pos: [40, 30, 62], target: [3, 7, 0], fov: 23 },
      { t: 1, pos: [46, 22, 50], target: [8, 7, 0], fov: 22 },
    ],
    update(t, time) {
      actor.update(t, time);
      flags.forEach((f, i) => { f.rotation.y = Math.sin(time * 1.3 + i) * 0.25; });
      const p = sail.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = sailBase[i * 3], y = sailBase[i * 3 + 1];
        p.setZ(i, Math.cos((x / 8.4) * Math.PI) * 0.8 * (0.6 + 0.4 * (y / 7.2 + 0.5)) + Math.sin(time * 1.6 + x * 0.6 + y * 0.4) * 0.06);
      }
      p.needsUpdate = true; sail.geometry.computeVertexNormals();
      gulls.forEach((g) => {
        const { r, h, s, o, wlP, wrP } = g.userData; const a = time * s + o;
        g.position.set(Math.cos(a) * r + 3, h + Math.sin(a * 2) * 0.6, Math.sin(a) * r * 0.6 - 4);
        g.rotation.y = -a; const flap = Math.sin(time * 6 + o) * 0.5;
        wlP.rotation.z = flap; wrP.rotation.z = -flap;
      });
      foam.forEach((f, i) => { f.position.y = 0.04 + Math.sin(time * 1.5 + i) * 0.05; });
      luffy.extras.hat.rotation.z = Math.sin(time * 1.7) * 0.03 * range(t, 0.7, 0.8);
    },
  };
}
