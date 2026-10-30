// Articulated LEGO minifigures assembled from rigid parts (assets/minifig.glb).
// Every part's origin sits on its real joint, so poses are plain rotations.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { faceTexture, luffyTorsoTexture, luffyLegsTexture, beltTexture, SKIN } from './prints.js';
import { getMe, loadMe, meFaceTexture, meTorsoTexture, meLegsTexture, shade, sweptHairGeometry, heldItem } from './me.js';

const plastic = new Map();
export function plasticMat(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!plastic.has(key)) {
    plastic.set(key, new THREE.MeshPhysicalMaterial({
      color, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.3, ...opts,
    }));
  }
  return plastic.get(key);
}

function planarUV(geo) {
  geo.computeBoundingBox();
  const b = geo.boundingBox, p = geo.attributes.position;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    uv[i * 2] = (p.getX(i) - b.min.x) / (b.max.x - b.min.x);
    uv[i * 2 + 1] = (p.getY(i) - b.min.y) / (b.max.y - b.min.y);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

let partsPromise;
export function loadParts(url = 'assets/minifig.glb') {
  // extra LEGO hair pieces from the LDraw library live in their own files, in head space
  const loader = new GLTFLoader();
  // (and real LEGO face prints, as thin decals that sit on the head)
  partsPromise ??= Promise.all([loader.loadAsync(url), loader.loadAsync('assets/hair-26139.glb'), loader.loadAsync('assets/faces.glb'), loadMe()]).then(([gltf, hair, faces]) => {
    const parts = {};
    for (const scene of [gltf.scene, hair.scene, faces.scene]) scene.traverse((o) => {
      if (!o.isMesh) return;
      const node = o.parent?.isMesh || o.parent === scene ? o : o.parent;
      const name = (o.name.match(/^(mf|bm|ld|lf)_[A-Za-z]+/) || node.name.match(/^(mf|bm|ld|lf)_[A-Za-z]+/) || [o.name])[0];
      const pos = new THREE.Vector3(); node.getWorldPosition(pos);
      if (!parts[name]) parts[name] = { pos, meshes: [] };
      parts[name].meshes.push({ geometry: o.geometry, material: o.material });
    });
    for (const k of ['mf_legL', 'mf_legR', 'mf_hips', 'mf_armL', 'mf_armR']) planarUV(parts[k].meshes[0].geometry);
    return parts;
  });
  return partsPromise;
}

const loader = new THREE.TextureLoader();
function tex(url) {
  const t = loader.load(url); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export const FIGS = {
  classic: () => ({
    head: { part: 'ld_head', mat: plasticMat('#ffffff', { map: faceTexture('classic') }) },
    torso: { part: 'mf_torso', mat: plasticMat('#C91A09') },
    arms: plasticMat('#C91A09'), hands: plasticMat(SKIN.yellow),
    hips: plasticMat('#1B1B1D'), legs: plasticMat('#1B1B1D'),
  }),
  batman: () => ({
    head: { part: 'ld_head', mat: plasticMat('#ffffff', { map: tex('assets/batman-face.png') }) },
    torso: { part: 'bm_torso', mat: plasticMat('#ffffff', { map: tex('assets/batman-torso.png') }) },
    arms: plasticMat('#1E1E21'), hands: plasticMat('#1E1E21'),
    hips: plasticMat('#ffffff', { map: beltTexture('#E3B53B', '#1E1E21') }), legs: plasticMat('#1E1E21'),
    extras: [
      { part: 'bm_cowl', joint: 'head', mat: plasticMat('#18181B', { roughness: 0.22 }) },
      { part: 'bm_cape', joint: 'torso', mat: new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.85, side: THREE.DoubleSide }), name: 'cape' },
    ],
  }),
  // me: every choice lives in js/me.js (and assets/me.json, written by builder.html)
  me: () => {
    const m = getMe();
    // printed parts get their own material: plasticMat's cache key would serialise the texture
    const printedMat = (map) => new THREE.MeshPhysicalMaterial({ color: '#ffffff', map, roughness: 0.3, clearcoat: 0.35, clearcoatRoughness: 0.3 });
    const extras = [];
    if (m.face.print !== 'drawn') extras.push({ part: 'ld_face' + m.face.print[0].toUpperCase() + m.face.print.slice(1), joint: 'head', mat: null, decal: true });
    const hairPart = { messy: 'lf_hair', wavy: 'ld_hairWavy' }[m.hair.style];
    if (hairPart && m.hat.style === 'none') extras.push({ part: hairPart, joint: 'head', mat: plasticMat(m.hair.color, { roughness: 0.35 }) });
    return {
      head: { part: 'ld_head', mat: printedMat(meFaceTexture(m)) },
      torso: { part: 'bm_torso', mat: printedMat(meTorsoTexture(m)) },
      arms: plasticMat(m.top.color), hands: plasticMat(m.skin),
      hips: m.legs.belt !== 'none' ? printedMat(beltTexture(m.legs.belt === 'brown' ? '#582A12' : '#1B1D21', m.legs.color)) : plasticMat(m.legs.color),
      legs: printedMat(meLegsTexture(m)),
      extras,
      hat: m.hat.style !== 'none' && m.hat,
      swept: m.hair.style === 'swept' && m.hat.style === 'none' && m.hair.color,
      hold: m.hold,
      backpack: m.backpack.on && m.backpack.color,
    };
  },
  // Luffy, after the official LEGO figure (75639): glossy straw hat over thick wavy black
  // hair, sleeveless red vest, yellow sash, frayed denim shorts, bare legs and sandals
  luffy: () => ({
    head: { part: 'ld_head', mat: plasticMat('#ffffff', { map: faceTexture('luffy') }) },
    torso: { part: 'bm_torso', mat: plasticMat('#ffffff', { map: luffyTorsoTexture() }) },
    arms: plasticMat(SKIN.nougat), hands: plasticMat(SKIN.nougat),
    hips: plasticMat('#25396A'), legs: plasticMat('#ffffff', { map: luffyLegsTexture() }),
    extras: [{ part: 'ld_hairWavy', joint: 'head', mat: plasticMat('#141416', { roughness: 0.32 }) }],
    straw: true,
  }),

};

export class Minifig {
  constructor(parts, kind) {
    const spec = FIGS[kind]();
    this.kind = kind;
    this.root = new THREE.Group();
    this.root.name = kind;
    this.body = new THREE.Group(); // receives hip drop / sitting offset
    this.root.add(this.body);
    const P = (n) => parts[n].pos;
    const mesh = (name, mat) => {
      const g = new THREE.Group();
      parts[name].meshes.forEach((m, i) => {
        const mm = new THREE.Mesh(m.geometry, mat == null ? m.material : Array.isArray(mat) ? mat[i] ?? mat[0] : mat);
        mm.castShadow = true; mm.receiveShadow = true; g.add(mm);
      });
      return g;
    };
    const joint = (parent, at, parentAt) => {
      const j = new THREE.Group(); j.position.copy(at).sub(parentAt || new THREE.Vector3()); parent.add(j); return j;
    };
    const J = (this.j = {});
    J.hips = joint(this.body, P('mf_hips'));
    J.hips.add(mesh('mf_hips', spec.hips));
    J.legL = joint(J.hips, P('mf_legL'), P('mf_hips')); J.legL.add(mesh('mf_legL', spec.legs));
    J.legR = joint(J.hips, P('mf_legR'), P('mf_hips')); J.legR.add(mesh('mf_legR', spec.legs));
    J.torso = joint(J.hips, P('mf_torso'), P('mf_hips'));
    J.torso.add(mesh(spec.torso.part, spec.torso.mat));
    J.head = joint(J.torso, P('mf_head'), P('mf_torso')); J.head.add(mesh(spec.head.part, spec.head.mat));
    J.armL = joint(J.torso, P('mf_armL'), P('mf_torso')); J.armL.add(mesh('mf_armL', spec.arms));
    J.armR = joint(J.torso, P('mf_armR'), P('mf_torso')); J.armR.add(mesh('mf_armR', spec.arms));
    J.handL = joint(J.armL, P('mf_handL'), P('mf_armL')); J.handL.add(mesh('mf_handL', spec.hands));
    J.handR = joint(J.armR, P('mf_handR'), P('mf_armR')); J.handR.add(mesh('mf_handR', spec.hands));
    // wrists twist around the forearm axis
    this.wristAxis = new THREE.Vector3(0, 1, 0.25).normalize();
    this.extras = {};
    for (const e of spec.extras || []) {
      const m = mesh(e.part, e.mats || e.mat);
      const holder = joint(J[e.joint], P(e.part), P('mf_' + e.joint));
      holder.add(m);
      // the straw hat's brim would shade the whole face; let it receive light only
      if (e.name === 'hat') m.traverse((c) => { c.castShadow = false; });
      // printed decals sit a hair's breadth off the head: no shadows of their own, and drawn in front
      if (e.decal) m.traverse((c) => { if (c.isMesh) { c.castShadow = false; c.material.polygonOffset = true; c.material.polygonOffsetFactor = -2; } });
      if (e.name) this.extras[e.name] = holder;
    }
    if (spec.backpack) {
      // a small pack on the torso's back face, sized from the torso itself
      const torso = J.torso.children[0];
      // torso meshes sit untransformed under the joint, so their geometry bounds are in joint space
      const b = new THREE.Box3();
      torso.traverse((m) => { if (m.isMesh) { m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox); } });
      const size = b.getSize(new THREE.Vector3());
      const bp = new THREE.Group();
      const pack = new THREE.Mesh(new RoundedBoxGeometry(size.x * 0.7, size.y * 0.56, 0.36, 3, 0.09), plasticMat(spec.backpack, { roughness: 0.6 }));
      const flap = new THREE.Mesh(new RoundedBoxGeometry(size.x * 0.72, size.y * 0.2, 0.4, 3, 0.08), plasticMat(shade(spec.backpack, 0.12), { roughness: 0.6 }));
      flap.position.y = size.y * 0.19;
      // a zipped front pocket on the outside
      const pocket = new THREE.Mesh(new RoundedBoxGeometry(size.x * 0.5, size.y * 0.24, 0.14, 3, 0.05), plasticMat(shade(spec.backpack, 0.06), { roughness: 0.6 }));
      pocket.position.set(0, -size.y * 0.12, -0.2);
      bp.add(pack, flap, pocket); bp.traverse((m) => { m.castShadow = true; });
      bp.position.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2 - size.y * 0.2, b.min.z - 0.15); // figures face +z
      J.torso.add(bp);
    }
    if (spec.hat) {
      // a beanie or a cap, sized from the head the same way
      const b = new THREE.Box3();
      J.head.children[0].traverse((m) => { if (m.isMesh) { m.geometry.computeBoundingBox(); b.union(m.geometry.boundingBox); } });
      const r = (b.max.x - b.min.x) * 0.55, cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2, top = b.max.y;
      const mat = plasticMat(spec.hat.color, { roughness: spec.hat.style === 'beanie' ? 0.75 : 0.35 });
      const hat = new THREE.Group();
      const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat);
      dome.scale.y = spec.hat.style === 'beanie' ? 1.05 : 0.8;
      hat.add(dome);
      if (spec.hat.style === 'beanie') {
        const cuff = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.04, r * 1.04, r * 0.42, 24), plasticMat(shade(spec.hat.color, -0.15), { roughness: 0.75 }));
        cuff.position.y = r * 0.08; hat.add(cuff);
      } else {
        const brim = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.95, r * 0.95, 0.08, 24, 1, false, -Math.PI / 2, Math.PI), mat);
        brim.scale.z = 1.25; brim.position.set(0, 0.04, r * 0.3); hat.add(brim); // figures face +z
      }
      hat.position.set(cx, top - r * (spec.hat.style === 'cap' ? 0.72 : 0.62), cz);
      hat.traverse((m) => { m.castShadow = true; m.receiveShadow = true; });
      J.head.add(hat);
    }
    if (spec.straw) {
      // the moulded LEGO straw hat: smooth yellow plastic, a round crown, a wide brim with a
      // lifted edge and the red band; it sits on top of the hair, tipped back off the face
      J.head.updateWorldMatrix(true, true);
      const hb = new THREE.Box3().setFromObject(J.head), at = new THREE.Vector3(); J.head.getWorldPosition(at);
      const V = (pts) => pts.map(([x, y]) => new THREE.Vector2(x, y));
      const yellow = plasticMat('#F4C21B', { roughness: 0.22, side: THREE.DoubleSide });
      const brim = new THREE.Mesh(new THREE.LatheGeometry(V([[0.8, 0.0], [1.15, -0.03], [1.4, 0.0], [1.54, 0.1], [1.52, 0.16], [1.38, 0.08], [1.15, 0.05], [0.8, 0.08]]), 48), yellow);
      const crown = new THREE.Mesh(new THREE.LatheGeometry(V([[0.84, 0.04], [0.88, 0.42], [0.82, 0.66], [0.6, 0.86], [0.3, 0.94], [0.0, 0.96]]), 40), yellow);
      const band = new THREE.Mesh(new THREE.LatheGeometry(V([[0.87, 0.16], [0.915, 0.17], [0.92, 0.4], [0.88, 0.41]]), 40), plasticMat('#8E1712', { roughness: 0.3 }));
      const hat = new THREE.Group(); hat.add(brim, crown, band);
      hat.traverse((m) => { if (m.isMesh) { m.castShadow = false; m.receiveShadow = true; } }); // its shade would black out the face
      hat.position.set(0, hb.max.y - at.y - 0.5, -0.12); hat.rotation.x = -0.24;
      const holder = new THREE.Group(); holder.add(hat); J.head.add(holder);
      this.extras.hat = holder;
    }
    if (spec.swept) {
      const hair = new THREE.Mesh(sweptHairGeometry(), plasticMat(spec.swept, { roughness: 0.38, side: THREE.DoubleSide }));
      hair.castShadow = hair.receiveShadow = true;
      J.head.add(hair);
    }
    if (spec.hold && spec.hold !== 'none') this.hold(spec.hold);
    this.legLength = P('mf_hips').y;
    this.height = 5.1;
  }

  // put a camera or controller in the left hand (replacing whatever was there)
  hold(kind) {
    this.held?.removeFromParent();
    this.held = null;
    if (!kind || kind === 'none') return;
    this.held = heldItem(kind);
    // the hand's C-grip opens forward; items sit across it
    this.held.position.set(0.05, -0.2, 0.42);
    this.j.handL.add(this.held);
  }

  // pose: radians. legs/arms swing (+ = forward), head yaw, waist yaw, sit 0..1
  setPose(p) {
    const J = this.j;
    J.legL.rotation.x = -(p.legL || 0);
    J.legR.rotation.x = -(p.legR || 0);
    J.armL.rotation.x = -(p.armL || 0);
    J.armR.rotation.x = -(p.armR || 0);
    J.armL.rotation.z = p.armLOut || 0;
    J.armR.rotation.z = -(p.armROut || 0);
    J.handL.quaternion.setFromAxisAngle(this.wristAxis, p.handL || 0);
    J.handR.quaternion.setFromAxisAngle(this.wristAxis, p.handR || 0);
    J.head.rotation.y = p.head || 0;
    J.torso.rotation.y = p.waist || 0;
    // keep the lower foot on the ground while legs swing: rigid legs drop the hips
    const a = Math.max(Math.abs(p.legL || 0), Math.abs(p.legR || 0));
    const sit = p.sit || 0;
    const drop = this.legLength * (1 - Math.cos(Math.min(a, 1.2))) * (1 - sit);
    // seated: hip pin rests 0.46 above the seat surface
    this.body.position.y = -drop + (p.lift || 0) + sit * ((p.seat ?? 1.2) + 0.46 - this.legLength);
    // a cape swings out behind whatever limb moves back, so arms and legs never pass through it
    // (positive x rotation lifts the hem away from the body)
    if (this.extras.cape) {
      const back = Math.max(0, J.armL.rotation.x, J.armR.rotation.x, J.legL.rotation.x * 1.15, J.legR.rotation.x * 1.15);
      // Legs swing back on every step, so following them directly flaps the cape up and down
      // twice a stride. It rises at once (nothing pokes through) and settles back slowly,
      // so a walk holds it out in one steady sweep.
      const want = back * 0.95, now = performance.now() / 1000;
      if (this.capeAt === undefined || now - this.capeAt > 0.5) this.capeHold = want;
      else if (now > this.capeAt) this.capeHold = Math.max(want, this.capeHold - (now - this.capeAt) * 0.3);
      else this.capeHold = Math.max(want, this.capeHold);
      this.capeAt = now;
      this.extras.cape.rotation.x = 0.06 + this.capeHold + (p.cape || 0);
    }
  }
}

// Shared walk-cycle math. phase in radians.
export function walkPose(phase, amp = 0.55) {
  const s = Math.sin(phase);
  return { legL: s * amp, legR: -s * amp, armL: -s * amp * 0.8, armR: s * amp * 0.8, waist: s * 0.06, head: -s * 0.04 };
}
export const MINIFIG_STRIDE = 2 * 2 * 1.42 * Math.sin(0.55); // distance per full cycle
