// Chapter 6 — everyone around a campfire. My minifigure posts a letter,
// raises the flag on the mailbox, and joins the others.
import * as THREE from 'three';
import { Kit, PLATE } from '../bricks.js';
import { Actor, range } from '../actor.js';
import { island, hash2, printed } from './common.js';

export function campfire({ Minifig, Blocky, crowbar, parts }) {
  const k = new Kit({ seed: 6 });
  const extra = new THREE.Group();
  const inside = (x, z) => { const cx = x + 0.5, cz = z + 0.5; return (cx / 12) ** 2 + (cz / 8.6) ** 2 + (hash2(x >> 1, z >> 1, 6) - 0.5) * 0.16 < 1; };
  island(k, { x0: -12, z0: -9, w: 24, d: 18, inside, colors: ['stone', 'dbg', 'charcoal'],
    top: (x, z) => (Math.hypot(x + 0.5, z + 0.5) < 2.2 ? 'dbg' : hash2(x, z, 1) < 0.62 ? 'darkgreen' : hash2(x, z, 2) < 0.6 ? 'olive' : 'darktan') });

  // fire ring and logs to sit on
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; k.round(Math.round(Math.cos(a) * 1.6 - 0.5), 1, Math.round(Math.sin(a) * 1.6 - 0.5), 1, 'lbg', { h: 1 }); }
  k.brick(-5, 1, -1, 1, 4, 'brown', { h: 2, studs: false });          // Steve's log
  k.brick(1, 1, -5, 4, 1, 'darkbrown', { h: 2, studs: false, rot: 0 });  // Luffy's log
  k.brick(3, 1, 0.5, 1, 4, 'brown', { h: 2, studs: false });            // my log
  // tent (back left)
  k.slope(-10, 1, -7, 4, 2, 'darkred', { h: 6 });
  k.slope(-10, 1, -5, 4, 2, 'darkred', { h: 6, rot: 2 });
  // pine (back right)
  k.brick(8, 1, -6, 1, 1, 'darkbrown');
  for (let i = 0; i < 4; i++) k.cone(7 + (i > 1 ? 0.5 : 0), 4 + i * 3, -7 + (i > 1 ? 0.5 : 0), i > 1 ? 2 : 3, 'darkgreen', { h: 3 });
  // mailbox (right)
  k.bar(8, 1, 1, 6, 'dbg');
  k.fill(7, 7, 0, 2, 3, 2, 'red', { max: 6 });
  k.tile(7, 13, 0, 2, 3, 'red');
  const slot = printed(1.1, 0.25, (g, W, H) => { g.fillStyle = '#111'; g.fillRect(0, 0, W, H); });
  slot.position.set(8, 7 * PLATE + 4 * PLATE, 3.02); k.prop(slot, { order: 0.8 });
  const flagPivot = new THREE.Group(); flagPivot.position.set(9.05, 7 * PLATE + 1.2, 1.5);
  const flag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.5), new THREE.MeshPhysicalMaterial({ color: '#F2CD37', roughness: 0.3 }));
  flag.position.y = 0.6; flag.castShadow = true; flagPivot.add(flag); flagPivot.rotation.x = Math.PI / 2;
  k.prop(flagPivot, { order: 0.85 });

  // fire: stacked flame cones that flicker, plus warm light and embers
  const flames = [];
  const fireMats = ['#FFB13B', '#FF6A1A', '#C91A09'].map((c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false, transparent: true, opacity: 0.92 }));
  for (let i = 0; i < 5; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.45 - i * 0.05, 1.6 - i * 0.15, 6), fireMats[i % 3]);
    f.position.set(Math.cos(i * 2.4) * 0.35, 1 * PLATE + 0.8, Math.sin(i * 2.4) * 0.35);
    k.prop(f, { order: 0.9 }); flames.push(f);
  }
  for (let i = 0; i < 3; i++) { const log = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.8, 8), new THREE.MeshStandardMaterial({ color: '#3B2312', roughness: 0.9 })); log.rotation.set(Math.PI / 2, i * 1.05, 0.2); log.position.y = 1 * PLATE + 0.2; k.prop(log, { order: 0.88 }); }
  const fire = new THREE.PointLight('#FF8A3A', 70, 20, 1.5); fire.position.set(0, 2.2, 0); extra.add(fire);
  const EN = 40, emb = new Float32Array(EN * 3), embSeed = new Float32Array(EN * 2);
  for (let i = 0; i < EN; i++) embSeed.set([hash2(i, 1), hash2(i, 2)], i * 2);
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(emb, 3));
  const embers = new THREE.Points(eg, new THREE.PointsMaterial({ color: '#FFB45A', size: 0.16, transparent: true, depthWrite: false, toneMapped: false }));
  embers.frustumCulled = false; extra.add(embers);
  // moon
  const moon = printed(8, 8, (g, W, H) => {
    const gr = g.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W / 2);
    gr.addColorStop(0, 'rgba(245,240,225,1)'); gr.addColorStop(0.28, 'rgba(245,240,225,1)'); gr.addColorStop(0.32, 'rgba(160,170,200,.25)'); gr.addColorStop(1, 'rgba(160,170,200,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H);
  }, { emissive: true, res: 16 });
  moon.material.transparent = true; moon.material.depthWrite = false; moon.position.set(-26, 26, -40); moon.lookAt(0, 0, 30); extra.add(moon);

  // ---- the cast ----
  const seatLog = 2 * PLATE;
  const sitting = (o = {}) => ({ sit: 1, seat: seatLog, legL: 1.5, legR: 1.5, armL: 0.5, armR: 0.5, ...o });
  const steve = new Blocky('assets/skins/steve.png', { name: 'steve' });
  const steveA = new Actor(steve, [{ t: 0, at: [-4.5, 1], face: Math.PI / 2, pose: { sit: 1, seat: seatLog, legL: 1.5, legR: 1.5, armL: 0.7, armR: 0.7 } }], { floor: 1 });
  const luffy = new Minifig(parts, 'luffy');
  const luffyA = new Actor(luffy, [
    { t: 0, at: [3, -4.5], face: -0.55, pose: sitting({ armL: 0.4, armR: 0.4 }) },
    { t: 0.85, at: [3, -4.5], face: -0.55, pose: sitting({ armL: 0.4, armR: 0.4 }) },
    { t: 0.95, at: [3, -4.5], face: -0.4, pose: sitting({ armR: 2.8, armROut: 0.2 }) },
  ], { floor: 1 });
  const gordon = new Blocky('assets/skins/gordon.png', { name: 'gordon' });
  const bar = crowbar(); gordon.hold(bar, bar.userData.grip);
  const gordonA = new Actor(gordon, [{ t: 0, at: [-1.5, 4.6], face: Math.PI - 0.3, pose: { armR: 0.2, armL: 0.05 } }], { floor: 1 });
  const bat = new Minifig(parts, 'batman');
  const batA = new Actor(bat, [{ t: 0, at: [-4.2, -6.2], face: 0.6, pose: { armL: 0.7, armR: 0.7, armLOut: -0.25, armROut: -0.25, handL: 1.2, handR: -1.2 } }], { floor: 1 });
  const me = new Minifig(parts, 'me');
  const letter = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.06, 0.55), new THREE.MeshStandardMaterial({ color: '#F4F2EC', roughness: 0.6 }));
  letter.position.set(0, -0.15, 0.2); me.j.handR.add(letter);
  const post = { armR: 1.55, armL: 0.1, handR: 0.2 };
  const meA = new Actor(me, [
    { t: 0, at: [10, 5.5], face: -1.4, pose: { armR: 0.6 } },
    { t: 0.06, at: [10, 5.5], face: -1.4, via: [[9.5, 4.2]] },
    { t: 0.24, at: [8, 4.1], face: Math.PI },
    { t: 0.3, at: [8, 4.1], face: Math.PI, pose: post },
    { t: 0.42, at: [8, 4.1], face: Math.PI, pose: { ...post, armR: 1.45 } },
    { t: 0.48, at: [8, 4.1], face: -2.2, pose: { armR: 0.1 } },
    { t: 0.52, at: [8, 4.1], face: -2.2, via: [[6, 4.2]] },
    { t: 0.74, at: [4.8, 2.5], face: -Math.PI / 2 },
    { t: 0.84, at: [3.5, 2.5], face: -Math.PI / 2, slide: true, pose: sitting() },
    { t: 1, at: [3.5, 2.5], face: -Math.PI / 2, pose: sitting({ head: 0.3 }) },
  ], { floor: 1 });
  const actors = [steveA, luffyA, gordonA, batA, meA];
  for (const [a, o] of [[steve, 0.96], [luffy, 0.97], [gordon, 0.98], [bat, 0.99], [me, 1]]) k.prop(a.root, { order: o });
  actors.forEach((a) => a.update(0));

  return {
    id: 'campfire', kit: k, extra,
    shift: [0, -0.1],
    light: { key: '#8FA6FF', keyI: 0.7, dir: [-0.6, 1, -0.7], sky: '#2A3150', ground: '#120C0A', hemiI: 0.55, env: 0.22, bg: ['#06070C', '#120A0B'] },
    cams: [
      { t: 0, pos: [8, 50, 50], target: [0, 0.5, 0], fov: 21 },
      { t: 1, pos: [4, 42, 46], target: [0, 1.5, 0], fov: 20 },
    ],
    update(t, time) {
      actors.forEach((a) => a.update(t, time));
      letter.visible = t < 0.42;
      flagPivot.rotation.x = Math.PI / 2 * (1 - range(t, 0.42, 0.48));
      const fl = 0.85 + Math.sin(time * 13) * 0.08 + Math.sin(time * 7.3) * 0.06;
      fire.userData.level = 70 * fl;
      flames.forEach((f, i) => { f.scale.set(1, 0.8 + Math.sin(time * (9 + i) + i) * 0.22, 1); f.rotation.y = time * (0.5 + i * 0.2); });
      const a = eg.attributes.position.array;
      for (let i = 0; i < EN; i++) {
        const life = (time * 0.35 + embSeed[i * 2]) % 1;
        a[i * 3] = Math.sin(embSeed[i * 2 + 1] * 20 + time) * 0.5 * life; a[i * 3 + 1] = 1 + life * 6; a[i * 3 + 2] = Math.cos(embSeed[i * 2 + 1] * 17 + time * 0.8) * 0.5 * life;
      }
      eg.attributes.position.needsUpdate = true;
      // Gordon taps the crowbar on his shoulder; Steve warms his hands
      gordon.j.armR.rotation.x = -0.2 - Math.max(0, Math.sin(time * 0.9)) * 0.25;
      steve.j.armL.rotation.x = -0.7 - Math.sin(time * 1.4) * 0.05;
    },
  };
}
