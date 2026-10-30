// Chapter 6 — the gallery. A square brick pavilion with a wall on each side: games,
// anime and films hang as brick mosaics, and the last wall holds five of my photographs,
// also as mosaics.
// The camera walks round it one wall per step; the figure from the desk visits each wall.
// Glass cases on the corners hold a few things that wandered in from other chapters.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Kit, PLATE } from '../bricks.js';
import { Actor } from '../actor.js';
import { plasticMat } from '../minifig.js';
import { island, roundedRect, printed } from './common.js';
import { loadMosaics, drawMosaic } from '../mosaic.js';

const M = await loadMosaics();
// plaques and signs are drawn once into canvases, so the face has to be ready first
await document.fonts?.load('700 20px "Bricolage Grotesque"').catch(() => {});

// what hangs on each wall, left to right, top row first
const WALLS = [
  { name: 'Games', items: ['minecraft', 'cs', 'hl', 'portal', 'terraria', 'cyberpunk'] },
  { name: 'Anime', items: ['onepiece', 'aot', 'spyfamily', 'hxh', 'naruto'] },
  { name: 'Films', items: ['tdk', 'interstellar', 'martian', 'odyssey', 'endgame'] },
  { name: 'Photographs', photos: [
    ['istanbul-1', 560, 315], ['petra-camel', 560, 315], ['petra', 315, 560], ['silhouette', 315, 560], ['lantern', 399, 560],
  ] },
];
const TITLES = {
  minecraft: 'Minecraft', cs: 'Counter-Strike', hl: 'Half-Life', portal: 'Portal', terraria: 'Terraria', cyberpunk: 'Cyberpunk 2077',
  onepiece: 'One Piece', aot: 'Attack on Titan', spyfamily: 'Spy×Family', hxh: 'Hunter×Hunter', naruto: 'Naruto',
  tdk: 'The Dark Knight', interstellar: 'Interstellar', martian: 'The Martian', odyssey: 'The Odyssey', endgame: 'Avengers: Endgame',
};

const HALF = 9; // pavilion half width in studs
const WALL_H = 12; // bricks

export function museum({ Minifig, parts }) {
  const k = new Kit({ seed: 6 });
  const extra = new THREE.Group();

  // ---- base: a square plaza, light checker floor, dark border ----
  const inside = roundedRect(-15, -15, 15, 15, 2);
  island(k, { x0: -15, z0: -15, w: 30, d: 30, inside, colors: ['dbg', 'charcoal', 'black'] });
  k.layer(-15, 0, -15, 30, 30, null, { h: 1, studs: false, cells: (x, z) => {
    if (!inside(x, z)) return null;
    const ring = Math.max(Math.abs(x + 0.5), Math.abs(z + 0.5)) > 13.5;
    return ring ? 'charcoal' : ((x >> 1) + (z >> 1)) % 2 ? 'white' : 'lbg';
  } });

  // ---- the pavilion: four outward-facing walls, a dark red cornice and a flat roof ----
  const onRing = (x, z) => x >= -HALF && x < HALF && z >= -HALF && z < HALF && (x === -HALF || x === HALF - 1 || z === -HALF || z === HALF - 1);
  for (let L = 0; L < WALL_H; L++) {
    const col = L === 0 ? 'charcoal' : L === WALL_H - 1 ? 'darkred' : 'black';
    k.layer(-HALF, 1 + L * 3, -HALF, HALF * 2, HALF * 2, null, { h: 3, phase: L, cells: (x, z) => (onRing(x, z) ? col : null), order: 0.2 + L * 0.015 });
  }
  const roofY = 1 + WALL_H * 3;
  k.layer(-HALF - 1, roofY, -HALF - 1, HALF * 2 + 2, HALF * 2 + 2, null, { h: 1, studs: false, cells: (x, z) => (Math.abs(x + 0.5) > HALF - 0.5 || Math.abs(z + 0.5) > HALF - 0.5 ? 'darkred' : 'charcoal'), order: 0.42 });
  // roof lantern: a skylight of trans-clear bricks
  k.fill(-3, roofY + 1, -3, 6, 6, 1, 'transclear', { order: 0.45 });
  k.tile(-3, roofY + 4, -3, 6, 6, 'darkred', { order: 0.46 });

  // ---- what hangs on the walls ----
  const wallTop = (1 + WALL_H * 3) * PLATE;
  const faces = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];
  const mountMat = new THREE.MeshStandardMaterial({ color: '#F2F3F2', roughness: 0.8 });
  const place = (obj, a, u, y, out = HALF + 0.06) => {
    // u: along the wall (left to right as you face it), y: height, out: distance from centre
    obj.position.set(Math.sin(a) * out + Math.cos(a) * u, y, Math.cos(a) * out - Math.sin(a) * u);
    obj.rotation.y = a;
    return obj;
  };
  const plaque = (text) => printed(2.2, 0.32, (g, W, H) => {
    g.fillStyle = '#F2F3F2'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#1B1D21'; g.font = `600 ${H * 0.55}px "Bricolage Grotesque", system-ui, sans-serif`; g.textBaseline = 'middle';
    g.fillText(text, 10, H / 2 + 1);
  }, { res: 160 });
  // Frames are brick-built: a border of studded plates (studs facing out), a thin inner lip,
  // and a brass picture lamp washing light down the picture. Colour changes per wall.
  const studGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.07, 14); studGeo.rotateX(Math.PI / 2);
  const brass = plasticMat('#C9A15B', { metalness: 0.6, roughness: 0.3 });
  const bulbMat = new THREE.MeshBasicMaterial({ color: '#FFE2B0', toneMapped: false });
  const washTex = (() => {
    const c = document.createElement('canvas'); c.width = 4; c.height = 128;
    const g = c.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 128);
    gr.addColorStop(0, 'rgba(255,226,180,.16)'); gr.addColorStop(0.4, 'rgba(255,226,180,.04)'); gr.addColorStop(1, 'rgba(255,226,180,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const hang = (a, u, y, w, h, map, { color = '#1B1D21', lip = '#720E0F', mat = 0, label } = {}) => {
    const g = new THREE.Group();
    const B = 0.32, D = 0.34, W = w + mat * 2, H = h + mat * 2;
    const fm = plasticMat(color, { roughness: 0.32 });
    // four border plates, corners overlapping like a real brick frame
    for (const [bw, bh, x, yy] of [[W + B * 2, B, 0, H / 2 + B / 2], [W + B * 2, B, 0, -H / 2 - B / 2], [B, H, -W / 2 - B / 2, 0], [B, H, W / 2 + B / 2, 0]]) {
      const m = new THREE.Mesh(new RoundedBoxGeometry(bw, bh, D, 1, 0.04), fm);
      m.position.set(x, yy, D / 2); m.castShadow = true; g.add(m);
    }
    // studs on the border face, one per stud of length
    const spots = [];
    const nx = Math.max(2, Math.round((W + B * 2) / 0.4)), ny = Math.max(2, Math.round(H / 0.4));
    for (let i = 0; i < nx; i++) { const x = -W / 2 - B / 2 + (i / (nx - 1)) * (W + B); spots.push([x, H / 2 + B / 2], [x, -H / 2 - B / 2]); }
    for (let j = 1; j < ny - 1; j++) { const yy = -H / 2 + (j / (ny - 1)) * H; spots.push([-W / 2 - B / 2, yy], [W / 2 + B / 2, yy]); }
    const studs = new THREE.InstancedMesh(studGeo, fm, spots.length);
    const m4 = new THREE.Matrix4();
    spots.forEach(([x, yy], i) => studs.setMatrixAt(i, m4.makeTranslation(x, yy, D + 0.035)));
    g.add(studs);
    // backing and inner lip
    const back = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.12), plasticMat(lip)); back.position.z = 0.06; g.add(back);
    if (mat) { const m = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.08, H - 0.08), mountMat); m.position.z = 0.125; g.add(m); }
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshPhysicalMaterial({ map, roughness: 0.45, clearcoat: 0.25 }));
    pic.position.z = 0.13; pic.receiveShadow = true; g.add(pic);
    // picture lamp: brass arm and a glowing bar over the top edge, light falling down the picture
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55, 8), brass);
    arm.rotation.x = Math.PI / 2 - 0.5; arm.position.set(0, H / 2 + B + 0.12, D + 0.2); g.add(arm);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, Math.min(1.8, W * 0.55), 12), brass);
    shade.rotation.z = Math.PI / 2; shade.position.set(0, H / 2 + B + 0.05, D + 0.42); g.add(shade);
    const bulb = new THREE.Mesh(new THREE.BoxGeometry(Math.min(1.7, W * 0.52), 0.035, 0.08), bulbMat);
    bulb.position.set(0, H / 2 + B - 0.04, D + 0.42); g.add(bulb);
    const wash = new THREE.Mesh(new THREE.PlaneGeometry(W, H), new THREE.MeshBasicMaterial({ map: washTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
    wash.position.z = 0.15; g.add(wash);
    if (label) { const p = plaque(label); p.position.set(-W / 2 + 1.1 - B, -H / 2 - B - 0.3, 0.03); g.add(p); }
    return place(g, a, u, y);
  };
  const mosaicTex = (id) => {
    const t = new THREE.CanvasTexture(drawMosaic(M.posters[id], M.palette, 16));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  };
  // photographs are mosaics too, on a finer grid so they still read as photos
  const photoTex = (id) => {
    const t = new THREE.CanvasTexture(drawMosaic(M.photos[id], M.palette, 12));
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
    return t;
  };

  const PW = 3, PH = PW * 1.5; // mosaic posters, 32×48 studs
  const low = 1 * PLATE + 2.2 + PH / 2;
  const rowY = [low + PH + 1.1, low]; // top row first
  const FRAMES = [
    { color: '#1B1D21', lip: '#720E0F' }, // games: black
    { color: '#720E0F', lip: '#1B1D21' }, // anime: dark red
    { color: '#5F625D', lip: '#1B1D21' }, // films: dark grey
    { color: '#AA7F2E', lip: '#1B1D21' }, // photographs: pearl gold
  ];
  WALLS.forEach((wall, wi) => {
    const a = faces[wi], fr = FRAMES[wi];
    let o = 0.55 + wi * 0.06;
    if (wall.items) {
      const n = wall.items.length, top = Math.ceil(n / 2);
      wall.items.forEach((id, i) => {
        const row = i < top ? 0 : 1, inRow = row ? n - top : top, col = row ? i - top : i;
        const u = (col - (inRow - 1) / 2) * (PW + 1.5);
        k.prop(hang(a, u, rowY[row], PW, PH, mosaicTex(id), { ...fr, label: TITLES[id] }), { order: o += 0.012 });
      });
    } else {
      // photographs: two landscapes over three portraits, in white mounts
      const H1 = 3.4, H2 = 4.4;
      const top = wall.photos.slice(0, 2), bottom = wall.photos.slice(2);
      top.forEach(([id, w, h], i) => { const W = H1 * (w / h); k.prop(hang(a, (i - 0.5) * (W + 2), rowY[0] + 0.3, W, H1, photoTex(id), { ...fr, mat: 0.25 }), { order: o += 0.012 }); });
      const widths = bottom.map(([, w, h]) => H2 * (w / h)), gap = 1.3;
      let u = -(widths.reduce((s, v) => s + v + 1.14, 0) + gap * (widths.length - 1)) / 2;
      bottom.forEach(([id], i) => { const W = widths[i]; k.prop(hang(a, u + W / 2 + 0.57, rowY[1], W, H2, photoTex(id), { ...fr, mat: 0.25 }), { order: o += 0.012 }); u += W + 1.14 + gap; });
    }
    // the wall's name in brick-built letters' place: a printed tile above the frames
    const sign = printed(6, 0.9, (g, W, H) => {
      g.fillStyle = '#720E0F'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#F2F3F2'; g.font = `700 ${H * 0.6}px "Bricolage Grotesque", system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(wall.name, W / 2, H / 2 + 2);
    }, { res: 90 });
    k.prop(place(sign, a, 0, wallTop - 0.75, HALF + 0.03), { order: 0.5 });
    // a gallery spot per wall, constant count so nothing recompiles
    const spot = new THREE.SpotLight('#FFE8C8', 70, 34, 0.5, 0.8, 1.3);
    spot.position.set(Math.sin(a) * 17, wallTop + 7, Math.cos(a) * 17);
    spot.target.position.set(Math.sin(a) * HALF, 8.5, Math.cos(a) * HALF);
    extra.add(spot, spot.target);
  });

  // ---- glass cases on the corners ----
  const caseAt = (x, z, inner, order) => {
    k.fill(x - 1, 1, z - 1, 2, 2, 2, 'charcoal', { order });
    k.tile(x - 1, 7, z - 1, 2, 2, 'white', { order: order + 0.01 });
    const glass = new THREE.Mesh(new THREE.BoxGeometry(2, 2.6, 2), new THREE.MeshPhysicalMaterial({ color: '#E8F2FF', transparent: true, opacity: 0.14, roughness: 0.05, clearcoat: 1, depthWrite: false }));
    glass.position.set(x, 8 * PLATE + 1.3, z);
    k.prop(glass, { order: order + 0.03 });
    inner.position.add(new THREE.Vector3(x, 8 * PLATE, z));
    k.prop(inner, { order: order + 0.02 });
  };
  const C = HALF + 3.2;
  // Portal: a companion cube
  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 1.1), printed(1, 1, (g, W, H) => {
    g.fillStyle = '#B9BDC2'; g.fillRect(0, 0, W, H);
    g.fillStyle = '#8E9297'; g.fillRect(0, 0, W, 14); g.fillRect(0, H - 14, W, 14); g.fillRect(0, 0, 14, H); g.fillRect(W - 14, 0, 14, H);
    g.fillStyle = '#E8559C'; g.beginPath(); const cx = W / 2, cy = H / 2 + 4, s = W * 0.11;
    g.moveTo(cx, cy + s * 1.1); g.bezierCurveTo(cx - s * 2, cy - s * 0.4, cx - s * 0.9, cy - s * 1.8, cx, cy - s * 0.6);
    g.bezierCurveTo(cx + s * 0.9, cy - s * 1.8, cx + s * 2, cy - s * 0.4, cx, cy + s * 1.1); g.fill();
  }).material);
  cube.position.y = 0.55; cube.rotation.y = 0.5; cube.castShadow = true;
  caseAt(-C, C, cube, 0.6);
  // One Piece: the straw hat
  const hat = new THREE.Group();
  parts.lf_hat.meshes.forEach((m, i) => hat.add(new THREE.Mesh(m.geometry, [plasticMat('#F0CC63', { roughness: 0.5, clearcoat: 0.15, side: THREE.DoubleSide }), plasticMat('#B3150F', { side: THREE.DoubleSide })][i] ?? plasticMat('#F0CC63'))));
  hat.scale.setScalar(0.9); hat.rotation.set(0.15, 0.6, 0);
  const hatBox = new THREE.Box3().setFromObject(hat); hat.position.y = -hatBox.min.y + 0.05;
  caseAt(C, C, hat, 0.62);
  // The Dark Knight: the cowl
  const cowl = new THREE.Group();
  parts.bm_cowl.meshes.forEach((m) => cowl.add(new THREE.Mesh(m.geometry, plasticMat('#18181B', { roughness: 0.22 }))));
  cowl.rotation.y = Math.PI * 0.85;
  const cowlBox = new THREE.Box3().setFromObject(cowl); cowl.position.y = -cowlBox.min.y + 0.05;
  caseAt(C, -C, cowl, 0.64);
  // photography: a little camera
  const cam = new THREE.Group();
  const black = plasticMat('#1B1D21');
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 0.6), black); body.position.y = 0.4;
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.55, 20), black); lens.rotation.x = Math.PI / 2; lens.position.set(0, 0.4, 0.55);
  const hump = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.45), black); hump.position.y = 0.92;
  const red = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.04, 12), plasticMat('#C91A09')); red.position.set(0.4, 0.82, 0.15);
  cam.add(body, lens, hump, red); cam.rotation.y = -2.3; cam.traverse((o) => { o.castShadow = true; });
  caseAt(-C, -C, cam, 0.66);

  // ---- a visitor ----
  const fig = new Minifig(parts, 'me');
  fig.hold('camera'); // a photographer in his own gallery
  const R = HALF + 3.4, P = (a, u = 0) => [Math.sin(a) * R + Math.cos(a) * u, Math.cos(a) * R - Math.sin(a) * u];
  const corner = (a) => [Math.sin(a + Math.PI / 4) * (R + 0.6) * 1.12, Math.cos(a + Math.PI / 4) * (R + 0.6) * 1.12];
  const look = (a) => a + Math.PI; // facing the wall
  const keys = [];
  // each hold starts as its step's text reaches the top of the screen
  const holds = [[0.03, 0.2], [0.29, 0.46], [0.55, 0.72], [0.8, 1]];
  faces.forEach((a, i) => {
    const [h0, h1] = holds[i];
    keys.push({ t: h0, at: P(a, -2.5), face: look(a), pose: { head: 0.2 } });
    keys.push({ t: (h0 + h1) / 2, at: P(a, 2.5), face: look(a), pose: { head: -0.25 } });
    if (i < 3) keys.push({ t: h1, at: P(a, 2.5), face: look(a), via: [corner(a)] });
  });
  keys.unshift({ t: 0, at: P(0, -2.5), face: look(0) });
  const actor = new Actor(fig, keys, { floor: 1 });
  k.prop(fig.root, { order: 1 });
  actor.update(0);

  // ---- camera: one wall per step, swinging round the corners between them ----
  const cam0 = (a, R = 62, H = 18, t) => ({ t, pos: [Math.sin(a + 0.3) * R, H, Math.cos(a + 0.3) * R], target: [Math.sin(a) * 7, 7, Math.cos(a) * 7], fov: 20 });
  const cams = [{ ...cam0(0, 84, 40, 0), fov: 21 }];
  faces.forEach((a, i) => {
    const [h0, h1] = holds[i];
    cams.push(cam0(a, 64, 18, h0 + 0.02), cam0(a, 60, 16, h1 - 0.06));
    if (i < 3) cams.push(cam0(a + Math.PI / 4, 70, 26, (h1 + holds[i + 1][0]) / 2));
  });

  return {
    id: 'museum', kit: k, extra,
    shift: [-0.19, -0.02],
    light: { key: '#FFE2C2', keyI: 1.1, dir: [0.5, 1, 0.8], sky: '#4A4258', ground: '#1A1214', hemiI: 0.85, env: 0.32, bg: ['#0B0A0E', '#1E1214'] },
    cams,
    update(t, time) {
      actor.update(t, time);
    },
  };
}
