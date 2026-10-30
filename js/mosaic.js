// Brick mosaics, like the LEGO Art sets: one 1×1 round tile per cell on a black baseplate.
// assets/mosaics.json holds each poster as rows of palette letters (A = palette[0]).

let data;
export async function loadMosaics(url = 'assets/mosaics.json') {
  data ??= fetch(url).then((r) => r.json());
  return data;
}

// Draw a mosaic into a canvas, `px` pixels per stud.
export function drawMosaic(rows, palette, px = 16, canvas = document.createElement('canvas')) {
  const h = rows.length, w = rows[0].length;
  canvas.width = w * px; canvas.height = h * px;
  const g = canvas.getContext('2d');
  g.fillStyle = '#05131D'; g.fillRect(0, 0, canvas.width, canvas.height);
  const r = px * 0.46;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const cx = (x + 0.5) * px, cy = (y + 0.5) * px;
      g.fillStyle = palette[rows[y].charCodeAt(x) - 65];
      g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
      // moulded rim: light from the top left, a soft shade bottom right
      g.lineWidth = px * 0.07;
      g.strokeStyle = 'rgba(255,255,255,.28)'; g.beginPath(); g.arc(cx, cy, r * 0.82, Math.PI * 0.95, Math.PI * 1.75); g.stroke();
      g.strokeStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.arc(cx, cy, r * 0.9, Math.PI * 0.05, Math.PI * 0.75); g.stroke();
    }
  }
  return canvas;
}
