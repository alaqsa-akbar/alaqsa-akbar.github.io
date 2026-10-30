// Canvas-drawn minifig prints. The LDraw head/torso UVs store artwork upside down,
// so every painter draws in "visual" coordinates on a vertically flipped context.
import * as THREE from 'three';

export const SKIN = {
  yellow: '#F2CD37',
  nougat: '#E09A6E',
  light: '#F6D7B3',
};

export function canvas(size) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.translate(0, size);
  g.scale(1, -1);
  return [c, g];
}

export function texture(c, flip = false) {
  const t = new THREE.CanvasTexture(c);
  t.flipY = flip;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// Head UV (512): front face panel spans x 108..403, y 12..247 (visual coords).
// Eye line ≈ 119, mouth ≈ 172, face centre x ≈ 255.
export function faceTexture(kind) {
  const [c, g] = canvas(512);
  const skin = kind === 'classic' ? SKIN.yellow : SKIN.nougat;
  g.fillStyle = skin;
  g.fillRect(0, 0, 512, 512);
  g.lineCap = 'round';
  g.lineJoin = 'round';
  // features are drawn at their LEGO size, then scaled up a touch so they read at a distance
  g.translate(256, 138); g.scale(1.22, 1.22); g.translate(-256, -138);

  if (kind === 'classic') {
    g.fillStyle = '#151515';
    for (const x of [228, 284]) {
      g.beginPath(); g.ellipse(x, 120, 8.5, 10, 0, 0, Math.PI * 2); g.fill();
    }
    g.strokeStyle = '#151515'; g.lineWidth = 6;
    g.beginPath(); g.arc(256, 132, 36, Math.PI * 0.2, Math.PI * 0.8); g.stroke();
  }

  if (kind === 'luffy') {
    // after the official LEGO Luffy (75639): thick brows, bright eyes, a huge open grin
    // showing his teeth, and the stitched scar under his left eye
    const ink = '#141010';
    g.fillStyle = ink;
    const brow = (x0, x1) => { g.beginPath(); g.moveTo(x0, 104); g.quadraticCurveTo((x0 + x1) / 2, 90, x1, 98); g.lineTo(x1, 103); g.quadraticCurveTo((x0 + x1) / 2, 97, x0, 108); g.fill(); };
    brow(204, 244); brow(308, 268);
    for (const x of [226, 286]) {
      g.fillStyle = ink; g.beginPath(); g.ellipse(x, 123, 9, 11.5, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(x + 3, 118, 3.2, 0, Math.PI * 2); g.fill();
    }
    // scar with stitches, under his left eye (viewer's right)
    g.strokeStyle = '#6E2A1E'; g.lineWidth = 2.6;
    g.beginPath(); g.moveTo(296, 141); g.quadraticCurveTo(306, 140, 314, 133); g.stroke();
    g.lineWidth = 2;
    for (const [x, y] of [[300, 140], [307, 137]]) { g.beginPath(); g.moveTo(x - 2, y - 5); g.lineTo(x + 2, y + 5); g.stroke(); }
    // the grin: a wide D, white teeth along the top, dark mouth and tongue below
    const mouth = new Path2D();
    mouth.moveTo(204, 146); mouth.quadraticCurveTo(256, 156, 308, 146);
    mouth.bezierCurveTo(300, 190, 278, 204, 256, 204); mouth.bezierCurveTo(234, 204, 212, 190, 204, 146);
    g.fillStyle = '#3A0E0C'; g.fill(mouth);
    g.save(); g.clip(mouth);
    g.fillStyle = '#C8473C'; g.beginPath(); g.ellipse(256, 206, 30, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(200, 140); g.quadraticCurveTo(256, 152, 312, 140); g.lineTo(312, 160); g.quadraticCurveTo(256, 176, 200, 160); g.fill();
    g.restore();
    g.strokeStyle = ink; g.lineWidth = 3.6; g.stroke(mouth);
    // cheeks pushed up by the smile
    g.strokeStyle = 'rgba(110,45,25,.5)'; g.lineWidth = 2.4;
    g.beginPath(); g.arc(197, 150, 8, -0.9, 0.9); g.stroke();
    g.beginPath(); g.arc(315, 150, 8, Math.PI - 0.9, Math.PI + 0.9); g.stroke();
  }
  return texture(c);
}

// Torso UV (1024): front block y 74..474, top edge x 330..690, waist x 270..750.
// Back block y 544..954. Side blocks x 20..250 and 770..1000 at the front's height.
// Luffy, after the official figure: a sleeveless dark red vest, open in a deep V and
// done up with three gold buttons, over the shorts' waistband and his yellow sash.
export function luffyTorsoTexture() {
  const [c, g] = canvas(1024);
  const red = '#8A1411', ink = '#2A0606', skin = SKIN.nougat;
  g.fillStyle = red; g.fillRect(0, 0, 1024, 1024);
  const grd = g.createLinearGradient(0, 74, 0, 474);
  grd.addColorStop(0, 'rgba(255,255,255,.07)'); grd.addColorStop(1, 'rgba(0,0,0,.16)');
  g.fillStyle = grd; g.fillRect(0, 60, 1024, 420);
  g.lineCap = 'round'; g.lineJoin = 'round';
  // the open V, down to mid-chest
  g.fillStyle = skin;
  g.beginPath(); g.moveTo(408, 60); g.lineTo(616, 60); g.quadraticCurveTo(586, 200, 518, 300); g.lineTo(506, 300); g.quadraticCurveTo(438, 200, 408, 60); g.fill();
  g.strokeStyle = 'rgba(120,52,28,.6)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(450, 112); g.quadraticCurveTo(478, 124, 502, 118); g.moveTo(574, 112); g.quadraticCurveTo(546, 124, 522, 118); g.stroke();
  g.beginPath(); g.moveTo(468, 190); g.quadraticCurveTo(490, 206, 508, 200); g.moveTo(556, 190); g.quadraticCurveTo(534, 206, 516, 200); g.stroke();
  // vest edges, outlined in black like the print
  g.strokeStyle = ink; g.lineWidth = 6;
  g.beginPath(); g.moveTo(408, 60); g.quadraticCurveTo(438, 200, 506, 300); g.lineTo(512, 300);
  g.moveTo(616, 60); g.quadraticCurveTo(586, 200, 518, 300); g.lineTo(512, 300); g.lineTo(512, 300); g.stroke();
  // the right front laps over the left: an edge running down to the hem, buttons beside it
  g.beginPath(); g.moveTo(518, 300); g.lineTo(524, 426); g.stroke();
  for (const y of [324, 364, 404]) {
    g.fillStyle = '#E2B13C'; g.beginPath(); g.arc(548, y, 10, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#7A5214'; g.lineWidth = 3; g.stroke();
  }
  // armholes and creases
  g.strokeStyle = ink; g.lineWidth = 5;
  g.beginPath(); g.moveTo(340, 70); g.quadraticCurveTo(372, 150, 338, 230); g.moveTo(684, 70); g.quadraticCurveTo(652, 150, 686, 230); g.stroke();
  g.lineWidth = 4;
  for (const [x0, y0, x1, y1] of [[350, 330, 400, 318], [362, 380, 418, 372], [624, 318, 674, 330], [606, 372, 662, 380], [430, 404, 470, 398]]) {
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
  }
  // the vest's hem, then the shorts' waistband with the sash wound round it, front and back
  const band = (y0) => {
    g.fillStyle = ink; g.fillRect(0, y0 - 4, 1024, 5);
    g.fillStyle = '#1E2C50'; g.fillRect(0, y0, 1024, 48);
    for (const yy of [y0 + 10, y0 + 28]) {
      g.fillStyle = '#E8C45C'; g.fillRect(0, yy, 1024, 11);
      g.strokeStyle = '#A9822A'; g.lineWidth = 2.5;
      for (let x = 0; x < 1024; x += 14) { g.beginPath(); g.moveTo(x, yy + 1); g.lineTo(x + 8, yy + 10); g.stroke(); }
    }
  };
  band(428); band(908);
  // the knot, on his right hip
  g.fillStyle = '#F0CF6A'; g.beginPath(); g.ellipse(424, 446, 22, 18, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#A9822A'; g.lineWidth = 3; g.stroke();
  // back: a centre seam
  g.strokeStyle = ink; g.lineWidth = 4; g.beginPath(); g.moveTo(512, 560); g.lineTo(512, 900); g.stroke();
  return texture(c);
}

// Planar front-projected textures for hips/legs (u: x, v: y, flipY default)
export function luffyLegsTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  // v=1 (top of canvas) is the hip axle; v=0 the sole
  g.fillStyle = SKIN.nougat; g.fillRect(0, 0, 256, 256);
  // denim shorts to the knee, frayed at the hem
  g.fillStyle = '#25396A'; g.fillRect(0, 0, 256, 118);
  const v = g.createLinearGradient(0, 0, 0, 118);
  v.addColorStop(0, 'rgba(0,0,0,.18)'); v.addColorStop(1, 'rgba(255,255,255,.06)');
  g.fillStyle = v; g.fillRect(0, 0, 256, 118);
  g.fillStyle = '#7F98C4';
  g.beginPath(); g.moveTo(0, 112);
  for (let x = 0; x <= 256; x += 8) g.lineTo(x + 4, 112 + ((x / 8) % 3 === 0 ? 18 : 11));
  g.lineTo(256, 112); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(10,20,50,.6)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(14, 40); g.quadraticCurveTo(44, 50, 52, 80); g.moveTo(242, 40); g.quadraticCurveTo(212, 50, 204, 80); g.stroke();
  // a loose end of the sash cord hanging down the front
  g.strokeStyle = '#E8C45C'; g.lineWidth = 5;
  g.beginPath(); g.moveTo(70, 0); g.quadraticCurveTo(58, 50, 66, 96); g.moveTo(82, 0); g.quadraticCurveTo(72, 52, 80, 100); g.stroke();
  // knees
  g.strokeStyle = 'rgba(122,58,34,.35)'; g.lineWidth = 3;
  for (const x of [64, 192]) { g.beginPath(); g.arc(x, 150, 12, 0.2, Math.PI - 0.2); g.stroke(); }
  // sandals: crossed dark straps over the foot and a sole
  g.fillStyle = '#3B2414'; g.fillRect(0, 242, 256, 14);
  g.strokeStyle = '#5A3418'; g.lineWidth = 9; g.lineCap = 'round';
  for (const x0 of [24, 152]) { g.beginPath(); g.moveTo(x0, 240); g.lineTo(x0 + 80, 214); g.moveTo(x0, 214); g.lineTo(x0 + 80, 240); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function beltTexture(band, base) {
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 128, 128);
  g.fillStyle = band; g.fillRect(0, 0, 128, 30);
  g.fillStyle = 'rgba(0,0,0,.25)';
  for (let x = 6; x < 128; x += 20) g.fillRect(x, 4, 12, 22);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
