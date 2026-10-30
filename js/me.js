// My minifigure, described by a settings object so builder.html can edit it.
// The site reads assets/me.json when it exists and falls back to ME_DEFAULT.
import * as THREE from 'three';
import { canvas, texture } from './prints.js';

export const ME_DEFAULT = {
  skin: '#F6D7B3',
  hair: { style: 'wavy', color: '#352100' },
  hat: { style: 'none', color: '#1B1D21' },
  face: { print: 'lopsided', brows: 'raised', eyes: 'bright', mouth: 'smirk', beard: 'none', glasses: 'none', glassesColor: '#1B1D21' },
  top: { style: 'coat', color: '#1B2A4A', trim: '#A95500', print: 'none' },
  legs: { color: '#352100', shoes: '#352100', belt: 'none' },
  backpack: { on: false, color: '#1B1D21' },
  hold: 'none',
};

// what the builder offers for each choice
export const ME_OPTIONS = {
  'hair.style': [['wavy', 'Wavy, centre parting'], ['swept', 'Swept'], ['messy', 'Messy'], ['none', 'None']],
  'hat.style': [['none', 'None'], ['beanie', 'Beanie'], ['cap', 'Cap']],
  'face.print': [['lopsided', 'Lopsided smile'], ['smirk', 'Smirk'], ['crooked', 'Crooked grin'], ['grin', 'Open grin'], ['beam', 'Big smile'], ['freckles', 'Freckles'], ['stubble', 'Stubble'], ['drawn', 'Draw my own']],
  'face.brows': [['straight', 'Straight'], ['arched', 'Arched'], ['thick', 'Thick'], ['raised', 'One raised']],
  'face.eyes': [['bright', 'Bright'], ['dots', 'Dots'], ['wink', 'Wink']],
  'face.mouth': [['grin', 'Grin'], ['smile', 'Smile'], ['smirk', 'Smirk'], ['laugh', 'Laugh']],
  'face.beard': [['none', 'None'], ['stubble', 'Stubble'], ['goatee', 'Goatee'], ['full', 'Full']],
  'face.glasses': [['none', 'None'], ['round', 'Round'], ['square', 'Square']],
  'top.style': [['coat', 'Coat and scarf'], ['hoodie', 'Hoodie'], ['jacket', 'Open jacket'], ['zip', 'Quarter zip'], ['sweater', 'Sweater']],
  'top.print': [['none', 'None'], ['net', 'Neural net'], ['humain', 'HUMAIN logo'], ['sigma', 'Σ']],
  'legs.belt': [['none', 'None'], ['brown', 'Brown'], ['black', 'Black']],
  hold: [['none', 'Nothing'], ['camera', 'Camera'], ['controller', 'Controller']],
};

const merge = (a, b) => {
  const out = structuredClone(a);
  for (const k in b || {}) out[k] = out[k] && typeof out[k] === 'object' ? { ...out[k], ...b[k] } : b[k];
  return out;
};

let me = structuredClone(ME_DEFAULT);
export const getMe = () => me;
export const setMe = (cfg) => { me = merge(ME_DEFAULT, cfg); };
export async function loadMe(url = 'assets/me.json') {
  try { const r = await fetch(url); if (r.ok) setMe(await r.json()); } catch { /* keep the default */ }
}

// mix a hex colour towards black (k < 0) or white (k > 0)
export function shade(hex, k) {
  const n = parseInt(hex.slice(1), 16), t = k < 0 ? 0 : 255, a = Math.abs(k);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(v + (t - v) * a));
  return `rgb(${c.join(',')})`;
}

// ---- head ----
// Head UV (512): front face panel spans x 108..403, y 12..247; eye line ≈ 120, mouth ≈ 160.
export function meFaceTexture(m = me) {
  const [c, g] = canvas(512);
  const f = m.face, ink = '#1a1210';
  g.fillStyle = m.skin; g.fillRect(0, 0, 512, 512);
  g.lineCap = 'round'; g.lineJoin = 'round';
  g.translate(256, 138); g.scale(1.22, 1.22); g.translate(-256, -138);

  // facial hair goes down first so the mouth sits on top
  const jaw = () => {
    g.beginPath(); g.moveTo(198, 128); g.quadraticCurveTo(200, 206, 256, 222); g.quadraticCurveTo(312, 206, 314, 128);
    g.lineTo(304, 130); g.quadraticCurveTo(300, 150, 284, 150); g.quadraticCurveTo(256, 140, 228, 150); g.quadraticCurveTo(212, 150, 208, 130); g.closePath();
  };
  if (f.beard === 'full') { g.fillStyle = m.hair.color; jaw(); g.fill(); }
  if (f.beard === 'stubble') {
    g.save(); jaw(); g.clip();
    g.fillStyle = 'rgba(30,20,16,.07)'; g.fillRect(190, 120, 140, 110);
    g.fillStyle = 'rgba(30,20,16,.3)';
    for (let i = 0; i < 260; i++) { const x = 196 + ((i * 47) % 120), y = 128 + ((i * 29) % 96); g.fillRect(x, y, 1.6, 1.6); }
    g.restore();
  }
  if (f.beard === 'goatee') {
    g.fillStyle = m.hair.color;
    g.beginPath(); g.moveTo(226, 154); g.quadraticCurveTo(256, 138, 286, 154); g.quadraticCurveTo(256, 147, 226, 154); g.fill();
    g.beginPath(); g.ellipse(256, 204, 15, 13, 0, 0, Math.PI * 2); g.fill();
  }

  // a real LEGO print (faces.glb) sits on top; then only skin, facial hair and glasses are painted here
  if (f.print && f.print !== 'drawn') { drawGlasses(g, f); return texture(c); }

  // brows: tapered strokes, like LEGO's printed faces, a shade darker than the hair
  g.fillStyle = m.hair.style === 'none' ? ink : shade(m.hair.color, -0.25);
  const brow = (x0, x1, lift, w) => {
    const y0 = 102, mx = (x0 + x1) / 2;
    g.beginPath(); g.moveTo(x0, y0 + 1);
    g.quadraticCurveTo(mx, y0 - lift - w, x1, y0 - lift * 0.35 - 1);
    g.quadraticCurveTo(mx, y0 - lift + w * 0.35, x0, y0 + 1); g.fill();
  };
  const bw = f.brows === 'thick' ? 12 : 8.5, arch = f.brows === 'arched' ? 9 : 5;
  brow(209, 242, arch, bw);
  if (f.brows === 'raised') brow(303, 270, 14, bw); else brow(303, 270, arch, bw);

  // eyes with a single catchlight
  for (const [i, x] of [227, 285].entries()) {
    if (f.eyes === 'wink' && i === 1) {
      g.strokeStyle = ink; g.lineWidth = 4.5; g.beginPath(); g.arc(x, 127, 9, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); continue;
    }
    g.fillStyle = '#141010'; g.beginPath(); g.ellipse(x, 122, 7.6, 10, 0, 0, Math.PI * 2); g.fill();
    if (f.eyes !== 'dots') { g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 2.5, 117.5, 2.6, 0, Math.PI * 2); g.fill(); }
  }

  // mouth: filled, tapered shapes rather than plain strokes
  const crescent = (x0, y0, x1, y1, cx, top, bottom) => {
    g.fillStyle = ink; g.beginPath(); g.moveTo(x0, y0);
    g.quadraticCurveTo(cx, top, x1, y1); g.quadraticCurveTo(cx, bottom, x0, y0); g.fill();
  };
  const dimple = (x, y, flip) => {
    g.strokeStyle = 'rgba(26,18,16,.8)'; g.lineWidth = 2.4;
    g.beginPath(); flip ? g.arc(x, y, 7, -0.55, 0.7) : g.arc(x, y, 7, Math.PI - 0.7, Math.PI + 0.55); g.stroke();
  };
  if (f.mouth === 'grin' || f.mouth === 'laugh') {
    const w = f.mouth === 'laugh' ? 40 : 34, d = f.mouth === 'laugh' ? 40 : 31;
    g.fillStyle = '#3a0d0d';
    g.beginPath(); g.moveTo(256 - w, 156); g.quadraticCurveTo(256, 164, 256 + w, 156); g.quadraticCurveTo(256 + w - 6, 156 + d, 256, 156 + d); g.quadraticCurveTo(256 - w + 6, 156 + d, 256 - w, 156); g.fill();
    g.fillStyle = '#fbf6ee';
    g.beginPath(); g.moveTo(259 - w, 158); g.quadraticCurveTo(256, 165, 253 + w, 158); g.lineTo(250 + w, 166); g.quadraticCurveTo(256, 172, 262 - w, 166); g.closePath(); g.fill();
    if (f.mouth === 'laugh') { g.fillStyle = '#b4423a'; g.beginPath(); g.ellipse(256, 186, 17, 6, 0, 0, Math.PI * 2); g.fill(); }
    dimple(256 - w - 6, 158, true); dimple(256 + w + 6, 158, false);
  } else if (f.mouth === 'smile') {
    crescent(222, 157, 290, 157, 256, 175, 185);
    dimple(216, 155, true); dimple(296, 155, false);
  } else {
    // a lopsided smirk rising to the right, with one dimple
    crescent(228, 163, 290, 151, 262, 172, 181);
    dimple(297, 153, false);
  }

  drawGlasses(g, f);
  return texture(c);
}

function drawGlasses(g, f) {
  // glasses on top of everything
  if (f.glasses !== 'none') {
    g.strokeStyle = f.glassesColor; g.lineWidth = 5;
    g.fillStyle = 'rgba(200,225,255,.18)';
    for (const x of [227, 285]) {
      g.beginPath();
      if (f.glasses === 'round') g.arc(x, 121, 19, 0, Math.PI * 2); else g.roundRect(x - 22, 106, 44, 30, 6);
      g.fill(); g.stroke();
    }
    g.beginPath(); g.moveTo(246, 117); g.quadraticCurveTo(256, 111, 266, 117); g.stroke();
    g.beginPath(); g.moveTo(206, 116); g.lineTo(192, 112); g.moveTo(306, 116); g.lineTo(320, 112); g.stroke();
  }
}

// ---- torso ----
// Torso UV (1024): front block y 74..474, top edge x 330..690, waist x 270..750.
// Back block y 544..954. Side blocks x 20..250 and 770..1000 at the front's height.
let logo;
function humainLogo(onload) {
  if (!logo) {
    logo = new Image();
    logo.src = new URL('../assets/logos/humain.svg', import.meta.url).href;
  }
  if (!logo.complete) logo.addEventListener('load', onload, { once: true });
  return logo.complete && logo.naturalWidth ? logo : null;
}

export function meTorsoTexture(m = me) {
  const [c, g] = canvas(1024);
  const t = texture(c);
  const paint = () => { drawTorso(g, m, () => { paint(); t.needsUpdate = true; }); };
  paint();
  return t;
}

function drawTorso(g, m, retry) {
  const top = m.top, col = top.color, dark = shade(col, -0.22), deep = shade(col, -0.4), light = shade(col, 0.12);
  g.clearRect(0, 0, 1024, 1024);
  g.fillStyle = col; g.fillRect(0, 0, 1024, 1024);
  g.lineCap = 'round'; g.lineJoin = 'round';

  // fabric shading: lighter at the chest, darker towards the hem and the sides
  const v = g.createLinearGradient(0, 74, 0, 474);
  v.addColorStop(0, 'rgba(255,255,255,.08)'); v.addColorStop(1, 'rgba(0,0,0,.14)');
  g.fillStyle = v; g.fillRect(0, 60, 1024, 420);
  const h = g.createLinearGradient(270, 0, 750, 0);
  h.addColorStop(0, 'rgba(0,0,0,.12)'); h.addColorStop(0.25, 'rgba(0,0,0,0)'); h.addColorStop(0.75, 'rgba(0,0,0,0)'); h.addColorStop(1, 'rgba(0,0,0,.12)');
  g.fillStyle = h; g.fillRect(260, 60, 504, 420);

  // armhole seams, front and back
  g.strokeStyle = dark; g.lineWidth = 5;
  for (const y0 of [74, 544]) {
    g.beginPath(); g.moveTo(342, y0 + 6); g.quadraticCurveTo(362, y0 + 96, 334, y0 + 176); g.stroke();
    g.beginPath(); g.moveTo(682, y0 + 6); g.quadraticCurveTo(662, y0 + 96, 690, y0 + 176); g.stroke();
  }

  if (top.style === 'coat') {
    // an open coat over a cream shirt and braces, with a knitted scarf in the trim colour
    const shirt = '#E4CD9E', sc = top.trim;
    g.fillStyle = shirt;
    g.beginPath(); g.moveTo(404, 60); g.lineTo(620, 60); g.lineTo(590, 474); g.lineTo(434, 474); g.fill();
    g.strokeStyle = shade(shirt, -0.25); g.lineWidth = 3;
    for (const x of [470, 548]) { g.beginPath(); g.moveTo(x, 260); g.quadraticCurveTo(x + 6, 360, x - 4, 470); g.stroke(); }
    // braces
    g.strokeStyle = '#2A1A0C'; g.lineWidth = 12;
    g.beginPath(); g.moveTo(452, 250); g.lineTo(462, 474); g.moveTo(574, 250); g.lineTo(564, 474); g.stroke();
    g.fillStyle = '#C8A24A'; for (const x of [462, 564]) { g.beginPath(); g.arc(x, 446, 8, 0, Math.PI * 2); g.fill(); }
    // scarf: a band round the neck, one end hanging down the front with fringe
    const knit = (path) => {
      g.fillStyle = sc; path(); g.fill();
      g.save(); path(); g.clip();
      g.strokeStyle = shade(sc, -0.3); g.lineWidth = 4;
      for (let y = 40; y < 400; y += 16) { g.beginPath(); g.moveTo(380, y); g.lineTo(660, y + 24); g.stroke(); }
      g.strokeStyle = shade(sc, 0.25); g.lineWidth = 3;
      for (let y = 48; y < 400; y += 32) { g.beginPath(); g.moveTo(380, y + 30); g.lineTo(660, y); g.stroke(); }
      g.restore();
      g.strokeStyle = shade(sc, -0.45); g.lineWidth = 3; path(); g.stroke();
    };
    knit(() => { g.beginPath(); g.moveTo(410, 60); g.quadraticCurveTo(512, 150, 616, 60); g.lineTo(600, 128); g.quadraticCurveTo(512, 200, 426, 128); g.closePath(); });
    knit(() => { g.beginPath(); g.moveTo(520, 140); g.lineTo(590, 140); g.lineTo(582, 300); g.lineTo(514, 296); g.closePath(); });
    g.strokeStyle = sc; g.lineWidth = 5;
    for (let x = 520; x < 584; x += 10) { g.beginPath(); g.moveTo(x, 298); g.lineTo(x - 2, 330); g.stroke(); }
    // coat fronts with dark edges and pocket flaps
    g.fillStyle = col;
    g.beginPath(); g.moveTo(270, 60); g.lineTo(404, 60); g.quadraticCurveTo(398, 260, 434, 474); g.lineTo(270, 474); g.fill();
    g.beginPath(); g.moveTo(754, 60); g.lineTo(620, 60); g.quadraticCurveTo(626, 260, 590, 474); g.lineTo(754, 474); g.fill();
    g.strokeStyle = shade(col, -0.5); g.lineWidth = 5;
    g.beginPath(); g.moveTo(404, 60); g.quadraticCurveTo(398, 260, 434, 474); g.moveTo(620, 60); g.quadraticCurveTo(626, 260, 590, 474); g.stroke();
    g.strokeStyle = light; g.lineWidth = 3;
    g.beginPath(); g.moveTo(392, 70); g.quadraticCurveTo(386, 260, 420, 470); g.moveTo(632, 70); g.quadraticCurveTo(638, 260, 604, 470); g.stroke();
    g.strokeStyle = shade(col, -0.5); g.lineWidth = 4;
    g.beginPath(); g.moveTo(320, 380); g.lineTo(392, 386); g.moveTo(704, 380); g.lineTo(632, 386); g.stroke();
  } else if (top.style === 'jacket') {
    // an open jacket over a tee in the trim colour
    g.fillStyle = top.trim;
    g.beginPath(); g.moveTo(452, 60); g.lineTo(572, 60); g.lineTo(560, 474); g.lineTo(464, 474); g.fill();
    g.fillStyle = shade(top.trim, -0.18); g.beginPath(); g.ellipse(512, 74, 62, 30, 0, 0, Math.PI); g.fill();
    g.fillStyle = shade(top.trim, -0.1); g.beginPath(); g.ellipse(512, 74, 52, 22, 0, 0, Math.PI); g.fill();
    // lapels and the zip edges
    g.fillStyle = light;
    g.beginPath(); g.moveTo(420, 60); g.lineTo(456, 60); g.lineTo(476, 200); g.lineTo(446, 160); g.fill();
    g.beginPath(); g.moveTo(604, 60); g.lineTo(568, 60); g.lineTo(548, 200); g.lineTo(578, 160); g.fill();
    g.strokeStyle = deep; g.lineWidth = 8;
    g.beginPath(); g.moveTo(456, 60); g.lineTo(464, 474); g.moveTo(568, 60); g.lineTo(560, 474); g.stroke();
    g.strokeStyle = '#9EA3A8'; g.lineWidth = 3; g.setLineDash([4, 6]);
    g.beginPath(); g.moveTo(462, 70); g.lineTo(470, 470); g.moveTo(562, 70); g.lineTo(554, 470); g.stroke(); g.setLineDash([]);
    // slanted pockets
    g.strokeStyle = deep; g.lineWidth = 6;
    g.beginPath(); g.moveTo(352, 360); g.lineTo(404, 420); g.moveTo(672, 360); g.lineTo(620, 420); g.stroke();
  } else {
    if (top.style === 'hoodie') {
      // the hood lies around the neck, with drawstrings and a kangaroo pocket
      g.fillStyle = dark; g.beginPath(); g.ellipse(512, 70, 158, 74, 0, 0, Math.PI); g.fill();
      g.fillStyle = light; g.beginPath(); g.ellipse(512, 66, 142, 60, 0, 0, Math.PI); g.fill();
      g.fillStyle = deep; g.beginPath(); g.ellipse(512, 70, 98, 44, 0, 0, Math.PI); g.fill();
      g.fillStyle = m.skin; g.beginPath(); g.ellipse(512, 66, 80, 32, 0, 0, Math.PI); g.fill();
      g.strokeStyle = top.trim; g.lineWidth = 6;
      g.beginPath(); g.moveTo(482, 118); g.quadraticCurveTo(474, 180, 478, 236); g.stroke();
      g.beginPath(); g.moveTo(542, 118); g.quadraticCurveTo(552, 170, 546, 222); g.stroke();
      g.fillStyle = shade(top.trim, -0.25); g.fillRect(472, 232, 12, 22); g.fillRect(540, 218, 12, 22);
      g.fillStyle = shade(col, -0.08); g.strokeStyle = dark; g.lineWidth = 5;
      g.beginPath(); g.moveTo(412, 330); g.lineTo(612, 330); g.lineTo(652, 440); g.lineTo(372, 440); g.closePath(); g.fill(); g.stroke();
      g.beginPath(); g.moveTo(412, 330); g.lineTo(382, 410); g.moveTo(612, 330); g.lineTo(642, 410); g.stroke();
    } else if (top.style === 'zip') {
      // quarter zip: a stand-up collar folded open into a V, piped in the trim colour,
      // over a metal zip with a slider and pull tab
      const collar = shade(col, 0.2), metal = '#C8CCD0';
      g.fillStyle = m.skin; g.beginPath(); g.moveTo(468, 60); g.lineTo(556, 60); g.lineTo(512, 156); g.fill();
      g.fillStyle = shade(m.skin, -0.12); g.beginPath(); g.moveTo(488, 60); g.lineTo(536, 60); g.lineTo(512, 112); g.fill();
      const flap = (sx) => {
        const X = (x) => 512 + sx * (x - 512);
        g.beginPath(); g.moveTo(X(404), 60); g.quadraticCurveTo(X(414), 104, X(440), 120);
        g.lineTo(X(508), 170); g.lineTo(X(468), 60); g.closePath();
      };
      for (const sx of [-1, 1]) {
        flap(sx); g.fillStyle = collar; g.fill();
        g.strokeStyle = deep; g.lineWidth = 4; g.stroke();
        // trim piping along the open edge, and the fold line
        g.strokeStyle = top.trim; g.lineWidth = 5;
        g.beginPath(); g.moveTo(512 + sx * (468 - 512), 62); g.lineTo(512 + sx * (507 - 512), 164); g.stroke();
        g.strokeStyle = dark; g.lineWidth = 3;
        g.beginPath(); g.moveTo(512 + sx * (420 - 512), 66); g.quadraticCurveTo(512 + sx * (430 - 512), 98, 512 + sx * (452 - 512), 110); g.stroke();
      }
      // zip tape, teeth and placket stitching
      g.fillStyle = deep; g.fillRect(504, 164, 16, 150);
      g.fillStyle = metal;
      for (let y = 168; y < 310; y += 7) g.fillRect(y % 14 < 7 ? 505 : 512, y, 7, 4);
      g.strokeStyle = light; g.lineWidth = 2; g.setLineDash([6, 6]);
      g.beginPath(); g.moveTo(496, 170); g.lineTo(496, 312); g.moveTo(528, 170); g.lineTo(528, 312); g.stroke(); g.setLineDash([]);
      g.strokeStyle = deep; g.lineWidth = 3; g.beginPath(); g.moveTo(512, 314); g.lineTo(512, 446); g.stroke();
      // slider and pull, with a soft shadow
      g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.roundRect(507, 176, 16, 44, 5); g.fill();
      g.fillStyle = metal; g.beginPath(); g.roundRect(502, 166, 20, 16, 4); g.fill();
      g.fillStyle = shade('#C8CCD0', 0.3); g.beginPath(); g.roundRect(505, 176, 14, 40, 5); g.fill();
      g.fillStyle = deep; g.beginPath(); g.roundRect(509, 202, 6, 9, 3); g.fill();
    } else {
      // crew-neck sweater
      g.fillStyle = m.skin; g.beginPath(); g.ellipse(512, 74, 92, 40, 0, 0, Math.PI); g.fill();
      g.strokeStyle = dark; g.lineWidth = 12; g.beginPath(); g.ellipse(512, 74, 98, 46, 0, 0, Math.PI); g.stroke();
    }
    // ribbed hem
    g.fillStyle = dark; g.fillRect(260, 446, 504, 28);
    g.strokeStyle = deep; g.lineWidth = 2;
    for (let x = 266; x < 764; x += 10) { g.beginPath(); g.moveTo(x, 448); g.lineTo(x, 472); g.stroke(); }
  }

  // chest print, on the wearer's left
  // (on a jacket it goes on the tee; next to backpack straps it shrinks to fit between them)
  const jacket = top.style === 'jacket', narrow = m.backpack.on && !jacket;
  const px = jacket ? 512 : narrow ? 578 : 604, py = jacket ? 190 : 176, ink = jacket ? deep : top.trim, sc = jacket ? 0.62 : narrow ? 0.55 : 1;
  if (top.print === 'net') {
    const L = [[-44, [-26, 0, 26]], [0, [-36, -12, 12, 36]], [44, [-14, 14]]].map(([x, ys]) => [x * sc, ys.map((y) => y * sc)]);
    g.strokeStyle = ink; g.globalAlpha = 0.55; g.lineWidth = 2.5;
    for (let i = 0; i < 2; i++) for (const a of L[i][1]) for (const b of L[i + 1][1]) {
      g.beginPath(); g.moveTo(px + L[i][0], py + a); g.lineTo(px + L[i + 1][0], py + b); g.stroke();
    }
    g.globalAlpha = 1; g.fillStyle = ink;
    for (const [x, ys] of L) for (const y of ys) { g.beginPath(); g.arc(px + x, py + y, 7 * Math.max(sc, 0.8), 0, Math.PI * 2); g.fill(); }
  } else if (top.print === 'sigma') {
    g.fillStyle = ink; g.font = `700 ${Math.round(92 * sc)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('Σ', px, py);
  } else if (top.print === 'humain') {
    const img = humainLogo(retry);
    if (img) {
      const w = 130 * sc, hgt = w * img.naturalHeight / img.naturalWidth;
      const o = document.createElement('canvas'); o.width = w * 2; o.height = hgt * 2;
      const og = o.getContext('2d'); og.drawImage(img, 0, 0, o.width, o.height);
      og.globalCompositeOperation = 'source-in'; og.fillStyle = ink; og.fillRect(0, 0, o.width, o.height);
      g.drawImage(o, px - w / 2, py - hgt / 2, w, hgt);
    }
  }

  // backpack straps over everything, with a chest strap and buckle
  if (m.backpack.on) {
    const b = m.backpack.color, hi = shade(b, 0.22), lo = shade(b, -0.35), clip = '#6F7378';
    const strap = (pts) => {
      g.fillStyle = b; g.beginPath(); g.moveTo(...pts[0]); pts.slice(1).forEach((p) => g.lineTo(...p)); g.fill();
      // padded edges catch the light on one side and fall into shade on the other
      g.lineWidth = 4; g.strokeStyle = hi; g.beginPath(); g.moveTo(...pts[0]); g.lineTo(...pts[3]); g.stroke();
      g.strokeStyle = lo; g.beginPath(); g.moveTo(...pts[1]); g.lineTo(...pts[2]); g.stroke();
    };
    strap([[368, 60], [418, 60], [404, 474], [354, 474]]);
    strap([[606, 60], [656, 60], [670, 474], [620, 474]]);
    g.strokeStyle = 'rgba(255,255,255,.16)'; g.lineWidth = 2.5; g.setLineDash([9, 7]);
    g.beginPath(); g.moveTo(386, 74); g.lineTo(373, 456); g.moveTo(638, 74); g.lineTo(651, 456); g.stroke(); g.setLineDash([]);
    // ladder-lock adjusters near the waist
    g.fillStyle = clip;
    for (const [x0, x1] of [[357, 402], [622, 667]]) { g.beginPath(); g.roundRect(x0, 404, x1 - x0, 16, 4); g.fill(); }
    // sternum strap with a two-part buckle
    g.fillStyle = b; g.fillRect(400, 264, 224, 14);
    g.fillStyle = lo; g.fillRect(400, 276, 224, 3);
    g.fillStyle = clip; g.beginPath(); g.roundRect(482, 256, 34, 30, 6); g.fill();
    g.fillStyle = shade(clip, 0.25); g.beginPath(); g.roundRect(512, 260, 30, 22, 5); g.fill();
    g.fillStyle = b; g.fillRect(490, 266, 16, 10);
    g.fillStyle = b; g.fillRect(360, 544, 70, 60); g.fillRect(594, 544, 70, 60);
  }

  // back
  if (top.style === 'hoodie') {
    g.fillStyle = dark; g.beginPath(); g.ellipse(512, 548, 150, 150, 0, 0, Math.PI); g.fill();
    g.strokeStyle = deep; g.lineWidth = 5; g.beginPath(); g.moveTo(512, 548); g.lineTo(512, 690); g.stroke();
  } else {
    g.strokeStyle = dark; g.lineWidth = 5; g.beginPath(); g.moveTo(330, 620); g.quadraticCurveTo(512, 650, 694, 620); g.stroke();
  }
  if (top.style === 'coat') { g.strokeStyle = shade(col, -0.5); g.lineWidth = 5; g.beginPath(); g.moveTo(512, 760); g.lineTo(512, 954); g.stroke(); }
  else if (top.style !== 'jacket') { g.fillStyle = dark; g.fillRect(260, 926, 504, 28); }
}

// ---- legs ----
// Planar front projection: canvas top is the hip axle, bottom the sole.
export function meLegsTexture(m = me) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d'), L = m.legs;
  g.fillStyle = L.color; g.fillRect(0, 0, 256, 256);
  const v = g.createLinearGradient(0, 0, 0, 256);
  v.addColorStop(0, 'rgba(0,0,0,.12)'); v.addColorStop(0.5, 'rgba(255,255,255,.04)'); v.addColorStop(1, 'rgba(0,0,0,.1)');
  g.fillStyle = v; g.fillRect(0, 0, 256, 256);
  // front pockets and a centre seam on each leg
  g.strokeStyle = shade(L.color, -0.3); g.lineWidth = 3;
  g.beginPath(); g.moveTo(14, 70); g.quadraticCurveTo(40, 80, 50, 108); g.moveTo(242, 70); g.quadraticCurveTo(216, 80, 206, 108); g.stroke();
  g.globalAlpha = 0.5;
  g.beginPath(); g.moveTo(64, 120); g.lineTo(64, 214); g.moveTo(192, 120); g.lineTo(192, 214); g.stroke();
  g.globalAlpha = 1;
  if (L.shoes && L.shoes !== L.color) {
    g.fillStyle = L.shoes; g.fillRect(0, 220, 256, 36);
    g.fillStyle = shade(L.shoes, -0.25); g.fillRect(0, 244, 256, 12);
    g.strokeStyle = shade(L.shoes, -0.35); g.lineWidth = 3;
    for (const x0 of [40, 168]) for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x0 + i * 14, 226); g.lineTo(x0 + i * 14 + 10, 236); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---- swept hair ----
// A middle-parted cut that sweeps down over the temples to jaw length, built as a shell
// around the head (head joint space: the head is a cylinder of radius ~0.63, y -0.55..0.55, face +z).
export function sweptHairGeometry() {
  const U = 160, V = 48, Rh = 0.715, base = 0.4, crown = 0.5;
  // how far down the hair reaches at each azimuth (0 = straight ahead): a high arch over the
  // forehead from the parting, down past the temples, to the jaw at the sides and the neck behind
  const hem = (a) => {
    const c = Math.abs(a), ease = (x) => 0.5 - Math.cos(Math.min(1, Math.max(0, x)) * Math.PI) / 2;
    if (c < 0.14) return 0.37;
    if (c < 0.95) return 0.37 - ease((c - 0.14) / 0.81) * 0.36;
    if (c < 1.6) return 0.01 - ease((c - 0.95) / 0.65) * 0.17;
    return -0.16 - ease((c - 1.6) / 1.2) * 0.17;
  };
  const pos = [], idx = [];
  // U columns that wrap round (no duplicated seam column, so normals stay smooth behind)
  for (let i = 0; i < U; i++) {
    const a = (i / U) * Math.PI * 2 - Math.PI, side = Math.sign(a) || 1;
    const hy = hem(a), front = Math.max(0, Math.cos(a));
    for (let j = 0; j <= V; j++) {
      const t = j / V;
      // dome over the top, then straight down the side to the hem
      const split = 0.42;
      let d, y;
      if (t < split) { const f = (t / split) * Math.PI / 2; d = Math.sin(f); y = base + crown * Math.cos(f); }
      else { const s = (t - split) / (1 - split); d = 1 + Math.sin(s * Math.PI) * 0.06 * (1 - front * 0.6); y = base - s * (base - hy); }
      // strands combed from the parting towards each side, a groove along the parting,
      // and the swoop lifting off the forehead as it falls
      d += 0.03 * Math.sin(a * 11 + t * 6 * side) * Math.min(1, t * 3) + 0.012 * Math.sin(a * 27 + t * 9 * side) * Math.min(1, t * 3);
      d -= 0.07 * Math.exp(-((a / 0.1) ** 2)) * front * Math.sin(Math.min(1, t / (split + 0.15)) * Math.PI);
      d += 0.12 * front ** 2 * Math.max(0, t - 0.3) + 0.05 * Math.sin(Math.min(t / split, 1) * Math.PI) * (1 - front * 0.5); // swoop and volume
      if (t > split) d += 0.05 * (1 - front) * ((t - split) / (1 - split)) ** 3; // a slight flick at the ends
      const R = Rh * d;
      pos.push(Math.sin(a) * R, y, Math.cos(a) * R);
    }
  }
  // underside lip: from the hem back in to the head so the shell looks solid
  const lip = pos.length / 3;
  for (let i = 0; i < U; i++) {
    const a = (i / U) * Math.PI * 2 - Math.PI;
    pos.push(Math.sin(a) * 0.6, hem(a) + 0.04, Math.cos(a) * 0.6);
  }
  for (let i = 0; i < U; i++) {
    const n = (i + 1) % U;
    for (let j = 0; j < V; j++) {
      const p = i * (V + 1) + j, q = n * (V + 1) + j;
      idx.push(p, p + 1, q, q, p + 1, q + 1);
    }
    const p = i * (V + 1) + V, q = n * (V + 1) + V;
    idx.push(p, lip + i, q, q, lip + i, lip + n);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

// ---- things to hold ----
export function heldItem(kind) {
  const black = new THREE.MeshPhysicalMaterial({ color: '#1B1D21', roughness: 0.35, clearcoat: 0.3 });
  const g = new THREE.Group();
  if (kind === 'camera') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55, 0.42), black);
    const hump = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.2, 0.34), black); hump.position.y = 0.36;
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.26, 20), black); lens.rotation.x = Math.PI / 2; lens.position.z = 0.32;
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.14, 20), new THREE.MeshPhysicalMaterial({ color: '#203040', roughness: 0.05, metalness: 0.3 }));
    glass.position.z = 0.455;
    g.add(body, hump, lens, glass);
  } else if (kind === 'controller') {
    const shape = new THREE.Shape();
    shape.moveTo(-0.5, 0.2); shape.lineTo(0.5, 0.2); shape.quadraticCurveTo(0.72, 0.18, 0.7, -0.15);
    shape.quadraticCurveTo(0.68, -0.42, 0.48, -0.36); shape.lineTo(0.3, -0.18); shape.lineTo(-0.3, -0.18); shape.lineTo(-0.48, -0.36);
    shape.quadraticCurveTo(-0.68, -0.42, -0.7, -0.15); shape.quadraticCurveTo(-0.72, 0.18, -0.5, 0.2);
    const pad = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.16, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }), black);
    pad.rotation.x = -Math.PI / 2; g.add(pad);
    const dot = (x, z, c) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12), new THREE.MeshPhysicalMaterial({ color: c, roughness: 0.3 })); m.position.set(x, 0.2, -z); g.add(m); };
    dot(0.36, 0.08, '#5A93DB'); dot(0.46, 0, '#C91A09'); dot(0.36, -0.08, '#C91A09'); dot(0.26, 0, '#5A93DB');
    dot(-0.36, 0, '#5F625D'); dot(-0.14, -0.1, '#5F625D'); dot(0.14, -0.1, '#5F625D');
  }
  g.traverse((m) => { m.castShadow = true; });
  return g;
}
