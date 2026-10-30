import { Stage } from './stage.js';
import { loadParts, Minifig } from './minifig.js';
import { Blocky, crowbar } from './blocky.js';
import { Kit } from './bricks.js';
import { worldMap, lightbox } from './extras.js';

document.querySelectorAll('.worldmap').forEach(worldMap);
lightbox(document.querySelector('.lightbox'));

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const chapters = [...document.querySelectorAll('.chapter')];

// progress stack: one brick per chapter
const stack = document.querySelector('.stack');
const bricks = chapters.map((ch) => {
  const li = document.createElement('li');
  const a = document.createElement('a');
  a.href = '#' + ch.id;
  a.innerHTML = `<span>${ch.dataset.title}</span>`;
  a.setAttribute('aria-label', ch.dataset.title);
  li.append(a); stack.append(li);
  return a;
});
const navLinks = [...document.querySelectorAll('.top nav a')];

async function boot() {
  const parts = await loadParts();
  const ctx = { Minifig, Blocky, crowbar, parts, reduced };
  const canvas = document.getElementById('stage');
  const stage = new Stage(canvas, { reduced });
  // if the GPU drops the context (driver reset, memory pressure), hide the broken frame
  // and reload once it's back; the browser keeps the scroll position
  canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); canvas.style.opacity = '0'; });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  for (const ch of chapters) {
    let scene;
    try {
      const mod = await import(`./scenes/${ch.dataset.scene}.js`);
      scene = mod[ch.dataset.scene](ctx);
    } catch (err) {
      console.warn('scene', ch.dataset.scene, err);
      scene = { kit: new Kit(), cams: [{ t: 0, pos: [30, 20, 30], target: [0, 0, 0] }], light: { key: '#fff', keyI: 1, dir: [1, 1, 1], sky: '#333', ground: '#111', hemiI: 0.5, env: 0.3, bg: ['#0A0A0C', '#0A0A0C'] } };
    }
    if (!scene.shift) scene.shift = ch.dataset.side === 'left' ? [0.2, 0] : ch.dataset.side === 'right' ? [-0.2, 0] : [0, -0.2]; // y < 0 lifts the diorama
    stage.add(ch, scene);
    // give the browser a breath between islands so the page never locks up while loading
    await new Promise((r) => setTimeout(r, 0));
  }
  stage.measure();
  await stage.warm();
  addEventListener('load', () => stage.measure());
  new ResizeObserver(() => stage.measure()).observe(document.body);
  document.documentElement.classList.add('ready');
  window.__stage = stage;

  let lastIdx = -1;
  const still = new URLSearchParams(location.search).has('still');
  // ?still: render only on request (used for screenshots under software GL)
  window.__render = (n = 1) => { for (let i = 0; i < n; i++) stage.frame(); };
  // Pacing: full rate while anything moves, 30 fps when only the ambient loops play,
  // and if frames stay slow while scrolling, step the stage's quality down.
  let lastFrame = 0, idleSince = 0, lastY = scrollY, slow = 0, settle = performance.now() + 3000, canDegrade = !still && !new URLSearchParams(location.search).has('hq'); // ?hq: never step down
  const loop = (now = performance.now()) => {
    if (still) return;
    requestAnimationFrame(loop);
    const moving = scrollY !== lastY || Math.abs(stage.sTarget - stage.s) > 0.002 || stage.intro < 1;
    lastY = scrollY;
    if (moving) idleSince = now;
    if (now - idleSince > 1500 && now - lastFrame < 30) return;
    const gap = now - lastFrame; lastFrame = now;
    if (canDegrade && moving && now > settle) {
      slow = gap > 28 ? slow + 1 : Math.max(0, slow - 2);
      if (slow > 45) { canDegrade = stage.degrade(); slow = 0; settle = now + 2000; }
    }
    const s = stage.frame();
    const idx = Math.min(chapters.length - 1, Math.floor(s + 0.02));
    if (idx !== lastIdx) {
      bricks.forEach((b, i) => { b.classList.toggle('done', i < idx); b.classList.toggle('now', i === idx); });
      navLinks.forEach((a) => a.setAttribute('aria-current', String(a.hash === '#' + chapters[idx].id)));
      lastIdx = idx;
    }
  };
  loop();
}
boot();
