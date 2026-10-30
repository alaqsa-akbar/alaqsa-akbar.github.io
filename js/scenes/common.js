import * as THREE from 'three';
import { PLATE, C } from '../bricks.js';

export function hash2(x, z, s = 1) { const h = Math.sin(x * 127.1 + z * 311.7 + s * 74.7) * 43758.5453; return h - Math.floor(h); }

// A floating diorama base: `inside(x,z)` defines the footprint (cell = 1 stud).
// Underside layers taper inward so the island reads as a chunk carved from a bigger build.
export function island(k, { x0, z0, w, d, inside, layers = 3, colors = ['charcoal', 'dbg', 'black'], top, topH = 1, topStuds = true }) {
  const inset = (L) => (x, z) => {
    if (!inside(x, z)) return false;
    for (let a = -L; a <= L; a++) for (let b = -L; b <= L; b++) if (Math.abs(a) + Math.abs(b) <= L && !inside(x + a, z + b)) return false;
    return !(L > 0 && hash2(x, z, L) < 0.08 * L);
  };
  for (let L = 0; L < layers; L++) {
    const ok = inset(L);
    const col = colors[Math.min(L, colors.length - 1)];
    k.layer(x0, -(L + 1) * 3 - topH + 1, z0, w, d, col, { h: 3, phase: L, cells: (x, z) => (ok(x, z) ? (L === 0 && hash2(x, z, 9) < 0.18 ? colors[1] : col) : null) });
  }
  if (top) k.layer(x0, 0, z0, w, d, null, { h: topH, phase: 3, studs: topStuds, cells: (x, z) => (inside(x, z) ? top(x, z) : null) });
}

export function roundedRect(x0, z0, x1, z1, r) {
  return (x, z) => {
    const cx = x + 0.5, cz = z + 0.5;
    if (cx < x0 || cx > x1 || cz < z0 || cz > z1) return false;
    const dx = Math.max(x0 + r - cx, 0, cx - (x1 - r)), dz = Math.max(z0 + r - cz, 0, cz - (z1 - r));
    return dx * dx + dz * dz <= r * r;
  };
}

// Printed tile / sticker: a canvas drawn once, laid on a surface.
export function printed(w, h, draw, { res = 128, emissive = false, rough = 0.3 } = {}) {
  const c = document.createElement('canvas'); c.width = Math.round(res * w); c.height = Math.round(res * h);
  const g = c.getContext('2d'); draw(g, c.width, c.height);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  const m = emissive
    ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false, fog: false })
    : new THREE.MeshPhysicalMaterial({ map: t, roughness: rough, clearcoat: 0.3 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
  mesh.userData.canvas = c; mesh.userData.ctx = g; mesh.userData.tex = t;
  mesh.receiveShadow = true;
  return mesh;
}

export function onFloor(obj, x, y, z) { obj.position.set(x, y * PLATE, z); return obj; }

export function stars(n, radius, { y0 = 10, spread = 60, size = 0.25, color = '#ffffff' } = {}) {
  const g = new THREE.BufferGeometry(), p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = hash2(i, 1) * Math.PI - Math.PI, h = hash2(i, 2);
    p.set([Math.sin(a) * radius, y0 + h * spread, Math.cos(a) * radius - radius * 0.2], i * 3);
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ size, color, sizeAttenuation: true, transparent: true, opacity: 0.8, depthWrite: false }));
}

// Floating maths: equations hung in the air around a diorama, drifting slowly.
// Each entry: [text, x, y, z, size?]. Returns a group with tick(time) for the drift.
export function equations(list, { color = 'rgba(255,214,190,', opacity = 0.55, face = [40, 20, 50] } = {}) {
  const g = new THREE.Group();
  for (const [text, x, y, z, size = 1] of list) {
    const font = `italic 400 64px 'Times New Roman', 'STIX Two Math', serif`;
    const probe = document.createElement('canvas').getContext('2d'); probe.font = font;
    const w = probe.measureText(text).width + 24;
    const m = printed((w / 80) * size, size, (c, W, H) => {
      c.font = font; c.textBaseline = 'middle';
      c.shadowColor = color + '0.9)'; c.shadowBlur = 14;
      c.fillStyle = color + '1)'; c.fillText(text, 12, H / 2 + 4);
    }, { emissive: true, res: 80 / size });
    m.material.transparent = true; m.material.depthWrite = false; m.material.opacity = opacity;
    m.material.blending = THREE.AdditiveBlending;
    m.position.set(x, y, z); m.lookAt(...face);
    m.userData.base = m.position.clone(); m.userData.seed = x * 1.3 + z;
    m.castShadow = false; m.receiveShadow = false;
    g.add(m);
  }
  g.userData.tick = (time, fade = 1) => {
    for (const m of g.children) {
      m.position.y = m.userData.base.y + Math.sin(time * 0.4 + m.userData.seed) * 0.35;
      m.material.opacity = opacity * fade * (0.75 + 0.25 * Math.sin(time * 0.7 + m.userData.seed));
    }
  };
  return g;
}

export { C };
