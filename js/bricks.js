// Brick kit: author dioramas in stud units, render them as instanced LEGO pieces,
// and animate every piece falling into place (or breaking away) from one number.
//
// Units: 1 = one stud pitch (8 mm). Heights are counted in plates (3.2 mm = 0.4).
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export const PLATE = 0.4;
export const BRICK = 3; // plates

export const C = {
  black: '#1B1D21', white: '#F2F3F2', lbg: '#A0A5A9', dbg: '#5F625D', red: '#C91A09',
  darkred: '#720E0F', tan: '#E4CD9E', darktan: '#958A73', brown: '#582A12', darkbrown: '#352100',
  green: '#237841', darkgreen: '#184632', olive: '#7C7B48', sandgreen: '#A0BCAC', yellow: '#F2CD37',
  orange: '#FE8A18', darkorange: '#A95500', blue: '#0055BF', darkblue: '#0A3463', medblue: '#5A93DB',
  azure: '#078BC9', lime: '#A5CA18', nougat: '#E09A6E', pearl: '#9CA3A8', silver: '#C8CCD0',
  stone: '#7D7F7A', charcoal: '#2E3033', purple: '#4B2C69', pink: '#E8A3C4',
  transclear: '#F4F7FF', transblue: '#2F7ED8', transdblue: '#123E80', transred: '#E0261A',
  transorange: '#FF8A18', transyellow: '#FFE45C', transgreen: '#61D04F', translight: '#BFE7FF',
};

const STD = [[2, 8], [2, 6], [2, 4], [1, 8], [2, 3], [1, 6], [2, 2], [1, 4], [1, 3], [1, 2], [1, 1]];

const geoCache = new Map();
function cached(key, make) { if (!geoCache.has(key)) geoCache.set(key, make()); return geoCache.get(key); }

function boxGeo(w, d, h) {
  return cached(`box${w}x${d}x${h}`, () => {
    const g = new RoundedBoxGeometry(w - 0.02, h * PLATE - 0.012, d - 0.02, 1, Math.min(0.045, h * PLATE * 0.2));
    g.translate(0, (h * PLATE) / 2, 0);
    return g;
  });
}
function studGeo() {
  return cached('stud', () => {
    const pts = [[0.3, 0], [0.3, 0.16], [0.27, 0.205], [0, 0.205]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 14);
  });
}
function roundGeo(w, h) {
  return cached(`round${w}x${h}`, () => {
    const r = w / 2 - 0.02, H = h * PLATE - 0.012, e = 0.04;
    const pts = [[0, 0], [r - e, 0], [r, e], [r, H - e], [r - e, H], [0, H]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 24);
  });
}
function coneGeo(w, h) {
  return cached(`cone${w}x${h}`, () => {
    const r = w / 2 - 0.02, H = h * PLATE - 0.012;
    const pts = [[0, 0], [r, 0], [r, 0.12], [r * 0.62, H], [0, H]].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, 20);
  });
}
function domeGeo(w) {
  return cached(`dome${w}`, () => {
    const g = new THREE.SphereGeometry(w / 2 - 0.02, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2);
    return g;
  });
}
function barGeo(h) {
  return cached(`bar${h}`, () => { const g = new THREE.CylinderGeometry(0.2, 0.2, h * PLATE, 12); g.translate(0, (h * PLATE) / 2, 0); return g; });
}
// Slope: rises toward -z (the "back"), facing +z by default. Grille-free, cheese-style.
function slopeGeo(w, d, h, inverted = false) {
  return cached(`slope${w}x${d}x${h}${inverted}`, () => {
    const H = h * PLATE - 0.012, D = d - 0.02, W = w - 0.02, lip = Math.min(0.32, D * 0.25), foot = Math.min(0.15, H * 0.3);
    const s = new THREE.Shape();
    if (!inverted) {
      s.moveTo(-D / 2, 0); s.lineTo(D / 2, 0); s.lineTo(D / 2, foot); s.lineTo(-D / 2 + lip, H); s.lineTo(-D / 2, H); s.closePath();
    } else {
      s.moveTo(-D / 2, 0); s.lineTo(-D / 2 + lip, 0); s.lineTo(D / 2, H - foot); s.lineTo(D / 2, H); s.lineTo(-D / 2, H); s.closePath();
    }
    const g = new THREE.ExtrudeGeometry(s, { depth: W, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1, steps: 1 });
    // shape is in (x=z, y), extruded along +z: remap so extrusion runs along x
    g.translate(0, 0, -W / 2);
    g.rotateY(Math.PI / 2);
    g.computeVertexNormals();
    return g;
  });
}

const materials = {};
function mat(kind) {
  if (materials[kind]) return materials[kind];
  let m;
  switch (kind) {
    case 'trans':
      m = new THREE.MeshPhysicalMaterial({ roughness: 0.06, transparent: true, opacity: 0.5, depthWrite: false, clearcoat: 1, specularIntensity: 1 });
      break;
    case 'water':
      m = new THREE.MeshPhysicalMaterial({ roughness: 0.04, transparent: true, opacity: 0.72, depthWrite: true, clearcoat: 1 });
      break;
    case 'glow':
      m = new THREE.MeshBasicMaterial({ toneMapped: false });
      break;
    case 'metal':
      m = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.75 });
      break;
    case 'matte':
      m = new THREE.MeshStandardMaterial({ roughness: 0.75 });
      break;
    default:
      m = new THREE.MeshPhysicalMaterial({ roughness: 0.4, clearcoat: 0.22, clearcoatRoughness: 0.35, sheen: 0.15, sheenRoughness: 0.6 });
  }
  if (kind === 'solid' || kind === 'matte' || kind === 'metal') bakedAO(m);
  return (materials[kind] = m);
}

// Baked ambient occlusion, worked out once per Kit from which grid cells are filled
// (see aoFor in Kit.build). Each instance carries how crowded its edges are; the
// fragment shader turns that into the soft dark creases where a brick meets a wall
// or the terrace below it, the way Builder's Journey's ray-traced bricks look.
// It darkens indirect light fully and direct light a little, so shadows stay readable.
function bakedAO(m) {
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
attribute vec4 aoTop; attribute vec4 aoSide; attribute vec4 aoBox;
varying vec4 vAoTop; varying vec4 vAoSide; varying vec4 vAoBox; varying vec3 vAoPos; varying vec3 vAoN;`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
vAoTop = aoTop; vAoSide = aoSide; vAoBox = aoBox; vAoPos = position; vAoN = normal;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec4 vAoTop; varying vec4 vAoSide; varying vec4 vAoBox; varying vec3 vAoPos; varying vec3 vAoN;`)
      .replace('#include <aomap_fragment>', `
{
  // aoBox: half width, half depth, height, then 1 = brick body, 2 = stud (+ sky occlusion in the fraction)
  float kind = floor(vAoBox.w + 0.001), sky = fract(vAoBox.w + 0.001) * 1.25;
  float bao = 1.0;
  vec3 p = vAoPos, n = normalize(vAoN);
  if (kind == 1.0) {
    if (n.y > 0.5) {
      vec4 d = max(vec4(vAoBox.x - p.x, vAoBox.x + p.x, vAoBox.y - p.z, vAoBox.y + p.z), 0.0);
      vec4 o = vAoTop * exp(-d / 0.42);
      bao -= 0.6 * (1.0 - (1.0 - o.x) * (1.0 - o.y) * (1.0 - o.z) * (1.0 - o.w));
    } else if (n.y > -0.5) {
      float side = n.x > 0.5 ? vAoSide.x : n.x < -0.5 ? vAoSide.y : n.z > 0.5 ? vAoSide.z : vAoSide.w;
      bao -= 0.55 * side * exp(-max(p.y, 0.0) / 0.4);
    } else bao -= 0.3;
  } else if (kind == 2.0) bao -= 0.55 * vAoTop.x;
  bao = clamp(bao - 0.4 * sky, 0.2, 1.0);
  reflectedLight.indirectDiffuse *= bao;
  reflectedLight.indirectSpecular *= bao;
  reflectedLight.directDiffuse *= mix(1.0, bao, 0.3);
  #ifdef USE_CLEARCOAT
    clearcoatSpecularIndirect *= bao;
  #endif
  #ifdef USE_SHEEN
    sheenSpecularIndirect *= bao;
  #endif
}
#include <aomap_fragment>`);
  };
}

const easeOutBack = (x) => { const c1 = 1.25, c3 = c1 + 1; return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2; };
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

// deterministic hash for staggering
function hash(a, b, c) { let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }

export class Kit {
  constructor({ drop = 16, seed = 1 } = {}) {
    this.pieces = [];
    this.props = [];
    this.drop = drop;
    this.seed = seed;
  }

  // x, z = min corner in studs; y = bottom in plates. rot in quarter turns (slopes).
  add(type, x, y, z, w, d, h, color, o = {}) {
    const p = { type, x, y, z, w, d, h, color: C[color] || color, kind: o.kind || (String(color).startsWith('trans') ? 'trans' : 'solid'), studs: o.studs ?? (type === 'brick' || type === 'round' || type === 'cone'), rot: o.rot || 0, group: o.group ?? 0, order: o.order, inverted: o.inverted };
    this.pieces.push(p);
    return p;
  }
  brick(x, y, z, w, d, color, o) { return this.add('brick', x, y, z, w, d, o?.h ?? 3, color, o); }
  plate(x, y, z, w, d, color, o) { return this.add('brick', x, y, z, w, d, 1, color, o); }
  tile(x, y, z, w, d, color, o) { return this.add('brick', x, y, z, w, d, 1, color, { ...o, studs: false }); }
  slope(x, y, z, w, d, color, o = {}) { return this.add('slope', x, y, z, w, d, o.h ?? 3, color, { ...o, studs: false }); }
  round(x, y, z, w, color, o = {}) { return this.add('round', x, y, z, w, w, o.h ?? 3, color, o); }
  cone(x, y, z, w, color, o = {}) { return this.add('cone', x, y, z, w, w, o.h ?? 3, color, o); }
  dome(x, y, z, w, color, o = {}) { return this.add('dome', x, y, z, w, w, 0, color, { ...o, studs: false }); }
  bar(x, y, z, h, color, o = {}) { return this.add('bar', x, y, z, 1, 1, h, color, { ...o, studs: false }); }

  // Fill a rectangular block with real brick sizes, staggering joints between layers.
  fill(x0, y0, z0, w, d, layers, color, o = {}) {
    const h = o.h ?? 3;
    for (let L = 0; L < layers; L++) this.layer(x0, y0 + L * h, z0, w, d, color, { ...o, h, phase: L + (o.phase || 0) });
  }

  // One layer over a footprint. `cells(x,z)` (optional) returns a colour or null.
  layer(x0, y, z0, w, d, color, o = {}) {
    const h = o.h ?? 3, cellFn = o.cells || (() => color);
    const used = new Uint8Array(w * d);
    const at = (i, j) => (i >= 0 && j >= 0 && i < w && j < d ? cellFn(x0 + i, z0 + j) : null);
    const flip = (o.phase || 0) % 2 === 1;
    const sizes = STD.filter(([a, b]) => a * b <= (o.max ?? 16));
    for (let jj = 0; jj < d; jj++) {
      for (let ii = 0; ii < w; ii++) {
        const i = flip ? w - 1 - ii : ii, j = jj;
        if (used[j * w + i]) continue;
        const col = at(i, j); if (!col) continue;
        let placed = false;
        // alternate orientation preference per layer so seams stagger
        const order = flip ? sizes.map(([a, b]) => [b, a]).concat(sizes) : sizes.concat(sizes.map(([a, b]) => [b, a]));
        for (const [sw, sd] of order) {
          const ix = flip ? i - sw + 1 : i;
          if (ix < 0 || ix + sw > w || j + sd > d) continue;
          let ok = true;
          for (let b = 0; b < sd && ok; b++) for (let a = 0; a < sw && ok; a++) {
            if (used[(j + b) * w + ix + a] || at(ix + a, j + b) !== col) ok = false;
          }
          if (!ok) continue;
          for (let b = 0; b < sd; b++) for (let a = 0; a < sw; a++) used[(j + b) * w + ix + a] = 1;
          this.add('brick', x0 + ix, y, z0 + j, sw, sd, h, col, { ...o, studs: o.studs ?? (h >= 3 || o.plateStuds !== false) });
          placed = true; break;
        }
        if (!placed) used[j * w + i] = 1;
      }
    }
  }

  // Non-brick objects that should arrive with the build (characters, printed tiles…)
  // The object is wrapped so scenes can keep moving it while the wrapper drops in.
  prop(object, { order = 1, from = 'drop' } = {}) {
    const holder = new THREE.Group();
    holder.add(object);
    this.props.push({ object: holder, inner: object, order, from });
    return object;
  }

  // Debug: pieces that share volume (they z-fight and flicker). Cells are half-studs x plates.
  overlaps() {
    const occ = new Map(), hits = [];
    for (const p of this.pieces) {
      if (p.type === 'bar' || p.type === 'dome') continue;
      const fw = p.rot % 2 ? p.d : p.w, fd = p.rot % 2 ? p.w : p.d;
      for (let a = 0; a < fw * 2; a++) for (let b = 0; b < fd * 2; b++) for (let y = 0; y < Math.max(1, p.h); y++) {
        const k = `${Math.round(p.x * 2) + a},${Math.round(p.z * 2) + b},${p.y + y}`;
        if (occ.has(k) && occ.get(k) !== p) hits.push([occ.get(k), p]); else occ.set(k, p);
      }
    }
    const uniq = new Map();
    for (const [a, b] of hits) uniq.set(this.pieces.indexOf(a) + ':' + this.pieces.indexOf(b), `${a.type}@${a.x},${a.y},${a.z} ${a.color} × ${b.type}@${b.x},${b.y},${b.z} ${b.color}`);
    return [...uniq.values()];
  }

  // ---- build GPU side ----
  build() {
    const group = new THREE.Group();
    const buckets = new Map();
    const covered = new Set();
    const key3 = (x, z, y) => `${x},${z},${y}`;
    for (const p of this.pieces) {
      const fw = p.rot % 2 ? p.d : p.w, fd = p.rot % 2 ? p.w : p.d;
      p.fw = fw; p.fd = fd;
      for (let a = 0; a < fw; a++) for (let b = 0; b < fd; b++) covered.add(key3(Math.floor(p.x + a), Math.floor(p.z + b), p.y));
    }
    // ordering: by height, then a soft sweep so the build reads as assembly, not noise
    const maxY = Math.max(1, ...this.pieces.map((p) => p.y + p.h));
    let minX = Infinity, maxX = -Infinity;
    for (const p of this.pieces) { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x + p.fw); }
    const span = Math.max(1, maxX - minX);
    for (const p of this.pieces) {
      const sweep = (p.x - minX) / span;
      p.delay = p.order ?? clamp01(0.82 * (p.y / maxY) + 0.12 * sweep + 0.06 * hash(p.x * 7, p.z * 13, p.y + this.seed));
    }
    const add = (geo, kind, p, offset = [0, 0, 0]) => {
      const k = geo.uuid + kind;
      if (!buckets.has(k)) buckets.set(k, { geo, kind, items: [] });
      buckets.get(k).items.push({ p, offset });
    };
    for (const p of this.pieces) {
      let geo;
      switch (p.type) {
        case 'brick': geo = boxGeo(p.fw, p.fd, p.h); break;
        case 'round': geo = roundGeo(p.w, p.h); break;
        case 'cone': geo = coneGeo(p.w, p.h); break;
        case 'dome': geo = domeGeo(p.w); break;
        case 'bar': geo = barGeo(p.h); break;
        case 'slope': geo = slopeGeo(p.w, p.d, p.h, p.inverted); break;
      }
      add(geo, p.kind, p);
      if (p.studs) {
        const top = p.y + p.h;
        const sw = p.type === 'cone' ? 1 : p.fw, sd = p.type === 'cone' ? 1 : p.fd;
        for (let a = 0; a < sw; a++) for (let b = 0; b < sd; b++) {
          if (covered.has(key3(Math.floor(p.x + a + (p.type === 'cone' ? (p.w - 1) / 2 : 0)), Math.floor(p.z + b + (p.type === 'cone' ? (p.w - 1) / 2 : 0)), top))) continue;
          const ox = p.type === 'cone' ? 0 : a + 0.5 - p.fw / 2, oz = p.type === 'cone' ? 0 : b + 0.5 - p.fd / 2;
          add(studGeo(), p.kind, p, [ox, p.h * PLATE, oz]);
        }
      }
    }
    // ---- baked AO: which cells (studs × plates) are filled by something solid ----
    const occ = new Set();
    for (const p of this.pieces) {
      if (p.kind === 'trans' || p.kind === 'glow' || p.type === 'bar' || p.type === 'dome') continue;
      for (let a = 0; a < p.fw; a++) for (let b = 0; b < p.fd; b++) for (let y = 0; y < p.h; y++) occ.add(key3(Math.floor(p.x + a), Math.floor(p.z + b), p.y + y));
    }
    const has = (x, z, y) => occ.has(key3(x, z, y));
    // how much of the sky above a cell is blocked (roofs, overhangs, tree canopies)
    const skyAt = (x, z, y) => { let n = 0; for (let k = 1; k <= 18; k += 2) if (has(x, z, y + k)) n += k < 8 ? 1 : 0.5; return Math.min(1, n / 3); };
    const aoFor = (p, offset) => {
      const x = Math.floor(p.x), z = Math.floor(p.z), T = p.y + p.h;
      if (offset[1] !== 0) {
        // a stud: crowded by whatever rises around its cell
        const sx = Math.floor(p.x + offset[0] + p.fw / 2), sz = Math.floor(p.z + offset[2] + p.fd / 2);
        let n = 0;
        for (const [dx, dz, w] of [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 0.5], [1, -1, 0.5], [-1, 1, 0.5], [-1, -1, 0.5]]) if (has(sx + dx, sz + dz, T)) n += w;
        return [[Math.min(1, n / 3), 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 2 + Math.min(0.79, skyAt(sx, sz, T) * 0.79)]];
      }
      if (p.type !== 'brick' || p.rot % 2) return [[0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
      // top edges: neighbour cells filled at our top layer (a wall rising beside us), taller walls count more
      const edge = (cells) => { let n = 0; for (const [cx, cz] of cells) n += has(cx, cz, T) ? (has(cx, cz, T + 3) ? 1 : 0.7) : 0; return n / cells.length; };
      // side faces: a lower terrace's top meeting our bottom edge
      const foot = (cells) => { let n = 0; for (const [cx, cz] of cells) n += has(cx, cz, p.y - 1) && !has(cx, cz, p.y) ? 1 : 0; return n / cells.length; };
      const xs = [...Array(p.fw).keys()].map((a) => x + a), zs = [...Array(p.fd).keys()].map((b) => z + b);
      const px = zs.map((cz) => [x + p.fw, cz]), nx = zs.map((cz) => [x - 1, cz]), pz = xs.map((cx) => [cx, z + p.fd]), nz = xs.map((cx) => [cx, z - 1]);
      let sky = 0; for (const cx of xs) for (const cz of zs) sky += skyAt(cx, cz, T);
      sky /= xs.length * zs.length;
      return [[edge(px), edge(nx), edge(pz), edge(nz)], [foot(px), foot(nx), foot(pz), foot(nz)], [p.fw / 2 - 0.01, p.fd / 2 - 0.01, p.h * PLATE, 1 + Math.min(0.79, sky * 0.79)]];
    };

    this.meshes = [];
    const color = new THREE.Color();
    for (const { geo: shared, kind, items } of buckets.values()) {
      // geometries are cached across Kits; a thin wrapper shares their buffers but
      // carries this Kit's per-instance AO
      const geo = new THREE.BufferGeometry();
      geo.setIndex(shared.index);
      for (const k in shared.attributes) geo.setAttribute(k, shared.attributes[k]);
      const A = [new Float32Array(items.length * 4), new Float32Array(items.length * 4), new Float32Array(items.length * 4)];
      items.forEach((it, i) => aoFor(it.p, it.offset).forEach((v, k) => A[k].set(v, i * 4)));
      ['aoTop', 'aoSide', 'aoBox'].forEach((n, k) => geo.setAttribute(n, new THREE.InstancedBufferAttribute(A[k], 4)));
      const m = new THREE.InstancedMesh(geo, mat(kind), items.length);
      m.castShadow = kind !== 'trans' && kind !== 'glow';
      m.receiveShadow = kind !== 'glow';
      if (kind === 'trans' || kind === 'water') m.renderOrder = 2;
      // real bricks never match perfectly: a ±3% tone wobble per piece reads as plastic, not CG
      items.forEach((it, i) => {
        const j = 1 + (hash(it.p.x * 5 + 1, it.p.z * 3 + 2, it.p.y + 7) - 0.5) * 0.06;
        m.setColorAt(i, color.set(it.p.color).multiplyScalar(kind === 'glow' ? 1 : j));
      });
      m.userData.items = items;
      m.frustumCulled = false;
      group.add(m);
      this.meshes.push(m);
    }
    for (const pr of this.props) group.add(pr.object);
    this.group = group;
    this.state = null;
    this.update(0, 0, true);
    return group;
  }

  // build: 0 → nothing placed, 1 → complete. breakUp: 0 → intact, 1 → gone.
  update(build, breakUp = 0, force = false) {
    const st = `${build.toFixed(4)}|${breakUp.toFixed(4)}`;
    if (!force && st === this.state) return;
    this.state = st;
    this.group.visible = build > 0.0001 && breakUp < 0.9999;
    if (!this.group.visible) return;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), t = new THREE.Vector3();
    const piece = (delay, seedA, seedB) => {
      const a = clamp01((build - delay * 0.78) / 0.22);
      const b = clamp01((breakUp - (1 - delay) * 0.6) / 0.4);
      return { a, b, fall: (1 - easeOutBack(a)) * this.drop, sink: b * b * 18, spin: (1 - a) * (hash(seedA, seedB, 3) - 0.5) * 0.9 + b * (hash(seedB, seedA, 9) - 0.5) * 2.5 };
    };
    for (const m of this.meshes) {
      const items = m.userData.items;
      for (let i = 0; i < items.length; i++) {
        const { p, offset } = items[i];
        const k = piece(p.delay, p.x * 3 + p.z, p.y + 1);
        const visible = k.a > 0 && k.b < 1;
        const cx = p.x + p.fw / 2, cz = p.z + p.fd / 2;
        e.set(k.spin * 0.4, (p.rot * Math.PI) / 2 + k.spin * 0.3, -k.spin * 0.3);
        q.setFromEuler(e);
        const o = new THREE.Vector3(...offset).applyQuaternion(q);
        t.set(cx + o.x, p.y * PLATE + k.fall - k.sink + o.y, cz + o.z);
        const sc = visible ? 1 - k.b * 0.4 : 0;
        s.set(sc, sc, sc);
        m4.compose(t, q, s);
        m.setMatrixAt(i, m4);
      }
      m.instanceMatrix.needsUpdate = true;
    }
    for (const pr of this.props) {
      const k = piece(pr.order, 11, 7);
      pr.object.visible = k.a > 0 && k.b < 1;
      pr.inner.userData.arrive = k.a; // scenes can read this
      pr.object.position.set(0, (pr.from === 'drop' ? k.fall : 0) - k.sink, 0);
    }
  }
}
