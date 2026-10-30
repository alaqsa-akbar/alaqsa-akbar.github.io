// Scroll-driven character choreography. Keys are evaluated from a normalised time t,
// so scrolling backwards replays the action backwards with valid poses.
//
// key: { t, at: [x, z], y?, face?: radians, pose?: {...}, via?: [[x, z], ...] }
import * as THREE from 'three';
import { walkPose, MINIFIG_STRIDE } from './minifig.js';
import { blockyWalk, BLOCKY_STRIDE, Blocky } from './blocky.js';
import { PLATE } from './bricks.js';

export const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);
export const smooth = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
export const range = (t, a, b) => smooth((t - a) / (b - a));
const lerp = (a, b, u) => a + (b - a) * u;
function lerpAngle(a, b, u) { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * u; }

const JOINTS = ['legL', 'legR', 'armL', 'armR', 'armLOut', 'armROut', 'handL', 'handR', 'head', 'headPitch', 'waist', 'sit', 'seat', 'lift', 'cape'];
export function mixPose(a = {}, b = {}, u) {
  const o = {};
  for (const k of JOINTS) {
    const va = a[k] ?? (k === 'seat' ? b[k] : 0), vb = b[k] ?? (k === 'seat' ? a[k] : 0);
    if (va === undefined && vb === undefined) continue;
    o[k] = lerp(va ?? 0, vb ?? 0, u);
  }
  return o;
}
function addPose(a, b, w = 1) { const o = { ...a }; for (const k in b) o[k] = (o[k] || 0) + b[k] * w; return o; }

export class Actor {
  constructor(fig, keys, { floor = 0 } = {}) {
    this.fig = fig;
    this.blocky = fig instanceof Blocky;
    this.stride = this.blocky ? BLOCKY_STRIDE : MINIFIG_STRIDE;
    this.keys = keys.map((k) => ({ y: floor, face: undefined, pose: {}, ...k }));
    // resolve facing defaults and pre-build curved paths
    for (let i = 0; i < this.keys.length; i++) {
      const k = this.keys[i], n = this.keys[i + 1];
      if (n && (n.at[0] !== k.at[0] || n.at[1] !== k.at[1])) {
        const pts = [k.at, ...(k.via || []), n.at].map(([x, z]) => new THREE.Vector3(x, 0, z));
        k.path = pts.length > 2 ? new THREE.CatmullRomCurve3(pts, false, 'centripetal') : new THREE.LineCurve3(pts[0], pts[1]);
        k.len = k.path.getLength();
      }
    }
    for (let i = 0; i < this.keys.length; i++) {
      const k = this.keys[i];
      if (k.face === undefined) {
        const src = k.path ? k : this.keys[i - 1]?.path ? this.keys[i - 1] : null;
        if (src) { const tg = src.path.getTangentAt(src === k ? 0.02 : 0.98); k.face = Math.atan2(tg.x, tg.z); }
        else k.face = 0;
      }
    }
    this.root = fig.root;
  }

  update(t, time = 0) {
    const K = this.keys;
    let i = 0;
    while (i < K.length - 1 && t >= K[i + 1].t) i++;
    const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
    const u = b === a ? 0 : clamp01((t - a.t) / (b.t - a.t));
    let x, z, y, yaw, pose;
    if (a.path && b !== a) {
      // ease in/out along the path; walk phase follows the distance travelled
      const e = smooth(u) * 0.7 + u * 0.3;
      const p = a.path.getPointAt(e), tg = a.path.getTangentAt(Math.min(0.999, Math.max(0.001, e)));
      x = p.x; z = p.z; y = lerp(a.y, b.y, smooth(u));
      const d = e * a.len;
      const env = Math.min(1, d / 0.9, (a.len - d) / 0.9);
      const moveYaw = Math.atan2(tg.x, tg.z);
      const phase = (d / this.stride) * Math.PI * 2;
      const gait = this.blocky ? blockyWalk(phase) : walkPose(phase);
      if (a.slide) {
        // shuffled into place (onto a seat, along a ledge): no gait, keep authored facing
        yaw = lerpAngle(a.face, b.face, smooth(u));
        pose = mixPose(a.pose, b.pose, smooth(u));
      } else {
        yaw = lerpAngle(lerpAngle(a.face, moveYaw, smooth(e / 0.12)), b.face, smooth((e - 0.88) / 0.12));
        pose = addPose(mixPose(a.pose, b.pose, smooth(u)), gait, Math.max(0, env));
      }
      // a small hop when the floor height changes (stepping onto a plate or ledge)
      if (a.y !== b.y) y += Math.sin(Math.PI * clamp01(u)) * 0.35;
    } else {
      x = a.at[0]; z = a.at[1];
      y = a.y;
      yaw = lerpAngle(a.face, b.face, smooth(u));
      pose = mixPose(a.pose, b.pose, smooth(u));
    }
    // idle life: barely-there breathing and glance
    pose.head = (pose.head || 0) + Math.sin(time * 0.7 + x) * 0.05;
    this.root.position.set(x, y * PLATE, z);
    this.root.rotation.y = yaw;
    this.fig.setPose(pose);
    this.t = t;
  }
}
