// Page extras that don't need the 3D stage: the round-tile world map and the photo lightbox.

// World map drawn as 1×1 round tiles, like the LEGO World Map mosaic.
// assets/worldmap.json holds one character per tile (country index, '.' for sea).
// Visited countries drop in when the map scrolls into view; hovering a tile or a
// country in the list lifts that country and draws the route from home.
export async function worldMap(canvas) {
  const data = await (await fetch('assets/worldmap.json')).json();
  const visited = canvas.dataset.visited.split(',').map((s) => s.trim());
  const home = canvas.dataset.home || visited[0];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const label = canvas.parentElement.querySelector('.map-label');
  const chips = [...document.querySelectorAll(`[data-country]`)];

  // per-country tile lists and centres
  const tiles = new Map();
  data.rows.forEach((row, y) => [...row].forEach((ch, x) => {
    if (ch === '.') return;
    const code = data.codes[ch.charCodeAt(0) - 49];
    if (!tiles.has(code)) tiles.set(code, []);
    tiles.get(code).push([x, y]);
  }));
  const centre = (code) => {
    const t = tiles.get(code) || [[0, 0]];
    // the tile nearest the mean: big countries (US) shouldn't aim at the sea
    const mx = t.reduce((a, p) => a + p[0], 0) / t.length, my = t.reduce((a, p) => a + p[1], 0) / t.length;
    return t.reduce((b, p) => ((p[0] - mx) ** 2 + (p[1] - my) ** 2 < (b[0] - mx) ** 2 + (b[1] - my) ** 2 ? p : b));
  };
  const name = (code) => chips.find((c) => c.dataset.country === code)?.textContent || data.names?.[data.codes.indexOf(code)] || code;
  const order = new Map(visited.map((c, i) => [c, i]));

  let hover = null, start = null, cell = 0, W = 0, H = 0, raf = 0;
  const g = canvas.getContext('2d');
  let ctx = g;
  const size = () => {
    const dpr = Math.min(devicePixelRatio, 2);
    W = canvas.clientWidth; if (!W) return false;
    cell = W / data.w; H = cell * data.h;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintBase();
    return true;
  };

  const tile = (x, y, fill, hi, r, lift = 0) => {
    const c = ctx, cx = (x + 0.5) * cell, cy = (y + 0.5) * cell - lift;
    if (lift) { c.fillStyle = 'rgba(0,0,0,.45)'; c.beginPath(); c.arc(cx + lift * 0.3, cy + lift, r, 0, 7); c.fill(); }
    c.fillStyle = fill; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.fill();
    c.fillStyle = hi; c.beginPath(); c.arc(cx - r * 0.25, cy - r * 0.25, r * 0.45, 0, 7); c.fill();
  };

  // sea and unvisited land never change: paint them once per size
  const base = document.createElement('canvas');
  const paintBase = () => {
    base.width = canvas.width; base.height = canvas.height;
    const bg = base.getContext('2d'); const keep = g;
    bg.setTransform(canvas.width / W, 0, 0, canvas.height / H, 0, 0);
    ctx = bg;
    const r = cell * 0.42;
    data.rows.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === '.') tile(x, y, '#12151B', 'rgba(255,255,255,.04)', r);
      else tile(x, y, '#3A3D42', 'rgba(255,255,255,.14)', r);
    }));
    ctx = keep;
  };

  const draw = (now) => {
    raf = 0;
    if (!cell && !size()) return;
    const el = start === null ? 0 : (now - start) / 1000;
    g.clearRect(0, 0, W, H);
    g.drawImage(base, 0, 0, W, H);
    const r = cell * 0.42;
    let busy = false;
    for (const [code, list] of tiles) {
      const v = order.has(code);
      if (!v && code !== hover) continue;
      for (const [x, y] of list) {
        if (!v) { tile(x, y, '#5A5E64', 'rgba(255,255,255,.18)', r); continue; }
        // visited: drop in, one country after another, each tile a touch later
        const d = reduced ? 1 : Math.min(1, Math.max(0, (el - order.get(code) * 0.09 - ((x * 7 + y * 13) % 10) * 0.012) / 0.35));
        if (d < 1) busy = true;
        if (d <= 0) continue;
        const e = 1 - (1 - d) ** 3;
        const lift = (code === hover ? cell * 0.35 : 0) + (1 - e) * cell * 3;
        g.globalAlpha = Math.min(1, d * 2);
        tile(x, y, code === home ? '#FE8A18' : '#C91A09', 'rgba(255,190,170,.55)', r, lift);
        g.globalAlpha = 1;
      }
    }
    // route from home to the hovered country
    if (hover && hover !== home && order.has(hover)) {
      const [ax, ay] = centre(home), [bx, by] = centre(hover);
      const A = [(ax + 0.5) * cell, (ay + 0.5) * cell], B = [(bx + 0.5) * cell, (by + 0.5) * cell];
      const dist = Math.hypot(B[0] - A[0], B[1] - A[1]);
      const C = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2 - dist * 0.35];
      g.strokeStyle = '#F2F3F2'; g.lineWidth = Math.max(1.5, cell * 0.22); g.lineCap = 'round';
      g.setLineDash([cell * 0.1, cell * 0.7]); g.lineDashOffset = reduced ? 0 : -now / 40;
      g.beginPath(); g.moveTo(...A); g.quadraticCurveTo(...C, ...B); g.stroke(); g.setLineDash([]);
      busy = !reduced;
    }
    // home: a pulsing ring
    const [hx, hy] = centre(home);
    const pulse = reduced ? 0.5 : (now / 1400) % 1;
    g.strokeStyle = `rgba(254,138,24,${1 - pulse})`; g.lineWidth = 1.5;
    g.beginPath(); g.arc((hx + 0.5) * cell, (hy + 0.5) * cell, cell * (0.8 + pulse * 2.2), 0, 7); g.stroke();
    if (busy || !reduced) raf = requestAnimationFrame(draw);
  };
  const kick = () => { if (!raf && visible) raf = requestAnimationFrame(draw); };

  let visible = false;
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && start === null) start = performance.now();
    if (visible) kick(); else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }, { threshold: 0.25 }).observe(canvas);
  new ResizeObserver(() => { size(); kick(); }).observe(canvas);

  const setHover = (code, x, y) => {
    hover = code;
    chips.forEach((c) => c.classList.toggle('on', c.dataset.country === code));
    if (label) {
      if (code) {
        label.textContent = name(code);
        label.hidden = false;
        const [cx, cy] = x !== undefined ? [x, y] : centre(code).map((v) => (v + 0.5) * cell);
        label.style.left = cx + 'px'; label.style.top = cy + 'px';
        label.classList.toggle('been', order.has(code));
      } else label.hidden = true;
    }
    kick();
  };
  canvas.addEventListener('pointermove', (e) => {
    const b = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - b.left) / cell), y = Math.floor((e.clientY - b.top) / cell);
    const ch = data.rows[y]?.[x];
    if (!ch || ch === '.') return setHover(null);
    // hover only reaches named tiles; the label follows the pointer
    setHover(data.codes[ch.charCodeAt(0) - 49], (x + 0.5) * cell, y * cell);
  });
  canvas.addEventListener('pointerleave', () => setHover(null));
  chips.forEach((c) => {
    const on = () => setHover(c.dataset.country), off = () => setHover(null);
    c.addEventListener('pointerenter', on); c.addEventListener('focus', on);
    c.addEventListener('pointerleave', off); c.addEventListener('blur', off);
  });
}

export function lightbox(dialog) {
  const img = dialog.querySelector('img');
  document.querySelectorAll('a.photo').forEach((a) => {
    a.addEventListener('click', (e) => {
      e.preventDefault();
      img.src = a.href; img.alt = a.querySelector('img').alt;
      dialog.showModal();
    });
  });
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
}
