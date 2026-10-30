// One persistent stage. Chapters in the page map to dioramas; scroll position drives
// which diorama is built, how far its story has played, and where the camera sits.
//
// Look: soft shadows, AO baked per brick (bricks.js), a touch of bloom and a tilt-shift band, which
// together give the toy-photography feel of LEGO Builder's Journey.
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { HorizontalTiltShiftShader } from 'three/addons/shaders/HorizontalTiltShiftShader.js';
import { VerticalTiltShiftShader } from 'three/addons/shaders/VerticalTiltShiftShader.js';
import { clamp01, smooth, range } from './actor.js';
import { PLATE } from './bricks.js';

const lerp = (a, b, u) => a + (b - a) * u;
const v3 = (a) => new THREE.Vector3(...a);

// Softer contact shadows: three's PCF takes 5 jittered taps, which turns grainy once the
// penumbra is wide. 12 taps keep a wide, smooth falloff (only the key light casts shadows).
function smootherPCF() {
  const chunk = THREE.ShaderChunk.shadowmap_pars_fragment;
  const start = chunk.indexOf('shadow = (\n'), end = chunk.indexOf(') * 0.2;', start);
  if (start < 0 || end < 0 || !chunk.slice(start, end).includes('vogelDiskSample( 4, 5, phi )')) return; // three changed: keep its version
  THREE.ShaderChunk.shadowmap_pars_fragment = chunk.slice(0, start) +
    'shadow = 0.0;\n\t\t\t\tfor ( int i = 0; i < 12; i ++ ) shadow += texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( i, 12, phi ) * radius, shadowCoord.z ) );\n\t\t\t\tshadow *= 1.0 / 12.0' +
    chunk.slice(end + ') * 0.2'.length);
}

// The studio the plastic reflects: three's neutral RoomEnvironment plus a warm softbox up
// and to the front left. Clearcoat picks it up as the soft rectangular highlight you see
// on photographed bricks.
function studio(L) {
  const room = new RoomEnvironment();
  const x = new THREE.Color(L.key), m = Math.max(x.r, x.g, x.b, 1e-3);
  const box = new THREE.Mesh(new THREE.PlaneGeometry(5, 3.5), new THREE.MeshBasicMaterial({ color: x.multiplyScalar(1 / m).lerp(new THREE.Color('#ffffff'), 0.4).multiplyScalar(18), side: THREE.DoubleSide }));
  box.position.copy(new THREE.Vector3(...L.dir).normalize().multiplyScalar(6));
  box.lookAt(0, 0, 0);
  room.add(box);
  return room;
}

export class Stage {
  constructor(canvas, { reduced = false } = {}) {
    this.reduced = reduced;
    const r = (this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }));
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.18;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;

    this.scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(r);
    // one studio for every chapter: a PMREM per chapter cost ~6 MB of GPU memory each
    this.scene.environment = pm.fromScene(studio({ key: '#FFF1E0', dir: [-0.5, 1, 0.7] }), 0.04).texture;
    pm.dispose();
    this.scene.environmentIntensity = 0.35;

    // background gradient lives in the scene so post-processing sees an opaque frame
    this.bgCanvas = document.createElement('canvas'); this.bgCanvas.width = 2; this.bgCanvas.height = 256;
    this.bgTex = new THREE.CanvasTexture(this.bgCanvas); this.bgTex.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = this.bgTex;
    // depth haze: the back of each island melts into the sky, like Builder's Journey
    this.scene.fog = new THREE.Fog('#000000', 60, 200);

    this.camera = new THREE.PerspectiveCamera(20, 1, 1, 400);

    this.key = new THREE.DirectionalLight('#ffffff', 2);
    this.key.castShadow = true;
    this.key.shadow.mapSize.set(2048, 2048);
    this.key.shadow.radius = 7; // soft penumbra; refit per chapter in frame()
    this.key.shadow.bias = -0.0004;
    this.key.shadow.normalBias = 0.035;
    Object.assign(this.key.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 });
    this.scene.add(this.key, this.key.target);
    this.hemi = new THREE.HemisphereLight('#ffffff', '#000000', 0.5);
    this.scene.add(this.hemi);
    // Practical lights (lamps, screens, fire). Every light in the scene costs every pixel of
    // every brick, so chapters don't add their own: each frame the strongest lights of the
    // visible chapters are copied into this small fixed pool. A fixed count also means no
    // shader recompiles mid-scroll.
    this.practicals = new THREE.Group();
    this.scene.add(this.practicals);
    const pool = (n, make) => Array.from({ length: n }, () => { const l = make(); l.intensity = 0; this.practicals.add(l); if (l.target) this.practicals.add(l.target); return l; });
    this.pool = {
      PointLight: pool(6, () => new THREE.PointLight()),
      SpotLight: pool(4, () => new THREE.SpotLight()),
      DirectionalLight: pool(1, () => new THREE.DirectionalLight()),
    };

    // quality tier: full post on capable desktops, plain render on phones
    this.fancy = !reduced && innerWidth >= 820 && (navigator.hardwareConcurrency || 8) > 4 && !new URLSearchParams(location.search).has('lite');
    if (this.fancy) { smootherPCF(); this.setupPost(); }

    this.pointer = new THREE.Vector2(); this.pointerS = new THREE.Vector2();
    addEventListener('pointermove', (e) => this.pointer.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5));

    this.chapters = [];
    this.s = 0; this.sTarget = 0;
    this.intro = reduced ? 1 : 0;
    this.last = performance.now();
    this.time = 0;
    addEventListener('resize', () => this.resize());
    this.resize();
  }

  setupPost() {
    const r = this.renderer;
    const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 });
    const c = (this.composer = new EffectComposer(r, rt));
    c.addPass(new RenderPass(this.scene, this.camera));
    // threshold above 1: only emissive things (portals, screens, fire) bloom, not white bricks in sunlight
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.28, 0.45, 1.35);
    // bloom is a soft glow: half resolution looks the same and costs a quarter
    const bloomSize = this.bloom.setSize.bind(this.bloom);
    this.bloom.setSize = (w, h) => bloomSize(Math.ceil(w / 2), Math.ceil(h / 2));
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    this.tiltH = new ShaderPass(HorizontalTiltShiftShader);
    this.tiltV = new ShaderPass(VerticalTiltShiftShader);
    c.addPass(this.tiltH); c.addPass(this.tiltV);
  }

  add(chapterEl, scene) {
    scene.root = new THREE.Group();
    scene.root.add(scene.kit.build());
    if (scene.extra) {
      scene.lights = [];
      scene.extra.traverse((o) => { if (o.isLight) scene.lights.push(o); });
      for (const l of scene.lights) {
        l.userData.base ??= l.intensity;
        // the scene keeps animating this object; frame() copies it into the pool
        // (extras sit at the origin, so its position is already in world space)
        l.removeFromParent();
      }
      scene.root.add(scene.extra);
    }
    this.scene.add(scene.root);
    // how far the bricks reach from the origin, for fitting the shadow map
    let R = 6;
    for (const p of scene.kit.pieces) R = Math.max(R, Math.hypot(Math.max(Math.abs(p.x), Math.abs(p.x + p.fw)), Math.max(Math.abs(p.z), Math.abs(p.z + p.fd)), (p.y + p.h) * PLATE));
    scene.reach = R + 1;
    this.chapters.push({ el: chapterEl, scene });
  }

  // copy the brightest wanted lights of each type into the pool; the rest of the pool goes dark
  fillPool(wanted) {
    wanted.sort((a, b) => b.intensity - a.intensity);
    const used = { PointLight: 0, SpotLight: 0, DirectionalLight: 0 };
    for (const src of wanted) {
      const list = this.pool[src.type]; if (!list || used[src.type] >= list.length) continue;
      const l = list[used[src.type]++];
      l.color.copy(src.color); l.intensity = src.intensity; l.position.copy(src.position);
      if ('distance' in src) { l.distance = src.distance; l.decay = src.decay; }
      if (src.isSpotLight) { l.angle = src.angle; l.penumbra = src.penumbra; l.target.position.copy(src.target.position); }
      else if (src.isDirectionalLight) l.target.position.copy(src.target.position);
    }
    for (const type in this.pool) this.pool[type].slice(used[type]).forEach((l) => { l.intensity = 0; });
  }

  // Step quality down when frames run slow (main.js decides when). Never steps back up,
  // so it can't oscillate. 1: render at 1× pixels; 2: no post-processing; 3: smaller shadow map.
  degrade() {
    this.quality = (this.quality || 0) + 1;
    if (this.quality === 1) this.dprCap = 1;
    if (this.quality === 2 && this.composer) { this.composer.dispose(); this.composer = null; }
    if (this.quality === 3) { this.key.shadow.mapSize.set(1024, 1024); this.key.shadow.map?.dispose(); this.key.shadow.map = null; }
    this.resize();
    return this.quality < 3;
  }

  // First-visit smoothness: compile every shader and upload every chapter's bricks and
  // textures to the GPU while the page loads, instead of on first sight mid-scroll.
  async warm() {
    this.chapters.forEach(({ scene }) => { scene.kit.update(1, 0, true); scene.root.visible = true; });
    const cam = new THREE.PerspectiveCamera(110, 1, 1, 600); // compile walks the whole scene; the camera only sets the shader variant
    // compile off the main thread where the browser can; otherwise in one go, behind the loading state
    if (this.renderer.extensions.has('KHR_parallel_shader_compile')) await this.renderer.compileAsync(this.scene, cam);
    else this.renderer.compile(this.scene, cam);
    // upload every texture now too (mosaics, prints, screens), so none decodes on first sight
    const seen = new Set();
    this.scene.traverse((o) => {
      for (const m of [].concat(o.material || [])) for (const v of Object.values(m)) {
        if (v && v.isTexture && !seen.has(v)) { seen.add(v); this.renderer.initTexture(v); }
      }
    });
    this.chapters.forEach(({ scene }) => scene.kit.update(0, 0, true));
  }

  resize() {
    const w = innerWidth, h = innerHeight;
    this.w = w; this.h = h;
    this.mobile = w < 820;
    // cap the pixel count too: big high-DPI screens would otherwise push 8+ megapixels through every pass
    const dpr = Math.min(devicePixelRatio, this.dprCap ?? (this.fancy ? 1.5 : 1.75), Math.sqrt(2.6e6 / (w * h)));
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    if (this.composer) {
      this.composer.setPixelRatio(dpr); this.composer.setSize(w, h);
      this.tiltH.uniforms.h.value = 1.6 / (w * dpr); this.tiltV.uniforms.v.value = 1.6 / (h * dpr);
    }
    this.measure();
  }

  measure() {
    const vh = innerHeight;
    this.bounds = [0];
    for (let i = 1; i < this.chapters.length; i++) {
      const top = this.chapters[i].el.getBoundingClientRect().top + scrollY;
      this.bounds.push(Math.max(this.bounds[i - 1] + 1, top - vh * 0.5));
    }
    this.bounds.push(Math.max(this.bounds.at(-1) + 1, document.documentElement.scrollHeight - vh));
  }

  scrollToS(y) {
    const B = this.bounds;
    for (let i = 0; i < B.length - 1; i++) if (y < B[i + 1] || i === B.length - 2) return i + clamp01((y - B[i]) / (B[i + 1] - B[i]));
    return 0;
  }

  // scene camera keys: [{ t, pos, target, fov }]
  camAt(scene, t) {
    const K = scene.cams;
    let i = 0; while (i < K.length - 1 && t >= K[i + 1].t) i++;
    const a = K[i], b = K[Math.min(i + 1, K.length - 1)];
    const u = a === b ? 0 : smooth((t - a.t) / (b.t - a.t));
    const shift = this.mobile ? (scene.mobileShift || [0, -0.24]) : (scene.shift || [0, 0]);
    const target = v3(a.target).lerp(v3(b.target), u);
    // pull back on narrow/tall viewports so the whole diorama stays in frame
    const back = 1.18 * Math.max(1, 1.55 / this.camera.aspect) ** 0.72;
    const pos = v3(a.pos).lerp(v3(b.pos), u).sub(target).multiplyScalar(back).add(target);
    return { pos, target, fov: lerp(a.fov ?? 20, b.fov ?? 20, u), shift };
  }

  paintBackground(top, bottom) {
    const key = top + bottom;
    if (key === this.bgKey) return;
    this.bgKey = key;
    const g = this.bgCanvas.getContext('2d'), gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, top); gr.addColorStop(1, bottom);
    g.fillStyle = gr; g.fillRect(0, 0, 2, 256);
    this.bgTex.needsUpdate = true;
  }

  frame() {
    const now = performance.now(), dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.reduced) this.time += dt; // reduced motion: ambient loops hold still
    this.sTarget = this.scrollToS(scrollY);
    if (this.first !== false) {
      // arriving mid-page (reload, deep link): start there instead of replaying every chapter
      this.first = false; this.s = this.sTarget;
      if (this.sTarget > 0.5) this.intro = 1;
    }
    // a big jump (fast fling, nav link) skips the chapters in between instead of
    // flashing every island past the camera
    const gap = this.sTarget - this.s;
    if (Math.abs(gap) > 0.7) this.s = this.sTarget - Math.sign(gap) * 0.35;
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 5);
    this.s += (this.sTarget - this.s) * k;
    if (Math.abs(this.sTarget - this.s) < 1e-4) this.s = this.sTarget;
    if (this.intro < 1) this.intro = Math.min(1, this.intro + dt / 2.6);
    const s = this.s, N = this.chapters.length;

    let cam = null, light = null, wsum = 0, reach = 0;
    const wanted = [];
    this.chapters.forEach(({ scene }, i) => {
      const build = i === 0 ? smooth(this.intro) : range(s, i - 0.08, i + 0.12);
      const breakUp = i === N - 1 ? 0 : range(s, i + 0.86, i + 1.0);
      const t = clamp01((s - i) / 0.84);
      scene.kit.update(this.reduced ? (build > 0 ? 1 : 0) : build, this.reduced ? (breakUp >= 1 ? 1 : 0) : breakUp);
      scene.root.visible = scene.kit.group.visible;
      if (scene.root.visible && scene.update) scene.update(t, this.time, dt, { build, breakUp });
      // practical lights fade with their island instead of switching
      const fade = scene.root.visible ? smooth(build) * (1 - smooth(breakUp)) : 0;
      for (const l of scene.lights || []) { l.intensity = (l.userData.level ?? l.userData.base) * fade; if (l.intensity > 0.001) wanted.push(l); }
      // weight for camera / light blending
      const w = i === 0 ? 1 - range(s, 0.9, 1.06) : i === N - 1 ? range(s, i - 0.1, i + 0.06) : range(s, i - 0.1, i + 0.06) * (1 - range(s, i + 0.9, i + 1.06));
      if (w > 0.0001) {
        const c = this.camAt(scene, t);
        if (!cam) cam = { pos: c.pos.multiplyScalar(w), target: c.target.multiplyScalar(w), fov: c.fov * w, sx: c.shift[0] * w, sy: c.shift[1] * w };
        else { cam.pos.addScaledVector(c.pos, w); cam.target.addScaledVector(c.target, w); cam.fov += c.fov * w; cam.sx += c.shift[0] * w; cam.sy += c.shift[1] * w; }
        const L = scene.light;
        if (!light) light = { key: new THREE.Color(L.key).multiplyScalar(w), keyI: L.keyI * w, dir: v3(L.dir).multiplyScalar(w), sky: new THREE.Color(L.sky).multiplyScalar(w), ground: new THREE.Color(L.ground).multiplyScalar(w), hemiI: L.hemiI * w, env: L.env * w, bg: [new THREE.Color(L.bg[0]).multiplyScalar(w), new THREE.Color(L.bg[1]).multiplyScalar(w)] };
        else {
          light.key.add(new THREE.Color(L.key).multiplyScalar(w)); light.keyI += L.keyI * w; light.dir.addScaledVector(v3(L.dir), w);
          light.sky.add(new THREE.Color(L.sky).multiplyScalar(w)); light.ground.add(new THREE.Color(L.ground).multiplyScalar(w));
          light.hemiI += L.hemiI * w; light.env += L.env * w;
          light.bg[0].add(new THREE.Color(L.bg[0]).multiplyScalar(w)); light.bg[1].add(new THREE.Color(L.bg[1]).multiplyScalar(w));
        }
        wsum += w; reach += scene.reach * w;
      }
    });
    this.fillPool(wanted);
    if (cam && wsum > 0) {
      const inv = 1 / wsum;
      cam.pos.multiplyScalar(inv); cam.target.multiplyScalar(inv); cam.fov *= inv; cam.sx *= inv; cam.sy *= inv;
      // a slow drift toward the pointer, like leaning in over a real diorama
      if (!this.reduced && !this.mobile) this.pointerS.lerp(this.pointer, 1 - Math.exp(-dt * 2.5));
      this.camera.position.copy(cam.pos);
      this.camera.lookAt(cam.target);
      const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
      const dist = cam.pos.distanceTo(cam.target);
      this.camera.position.addScaledVector(right, this.pointerS.x * dist * 0.035).y -= this.pointerS.y * dist * 0.02;
      this.camera.lookAt(cam.target);
      this.camera.fov = cam.fov;
      // shift the frame so the diorama sits beside the text instead of under it
      // positive shift x moves the diorama right; negative shift y moves it up
      this.camera.setViewOffset(this.w, this.h, -cam.sx * this.w, -cam.sy * this.h, this.w, this.h);
      this.camera.updateProjectionMatrix();
      light.key.multiplyScalar(inv); light.sky.multiplyScalar(inv); light.ground.multiplyScalar(inv);
      this.key.color.copy(light.key); this.key.intensity = light.keyI * inv * 1.25;
      this.key.position.copy(light.dir.multiplyScalar(inv).normalize().multiplyScalar(50));
      // generous bounce light keeps shadows readable and soft rather than black
      this.hemi.color.copy(light.sky); this.hemi.groundColor.copy(light.ground); this.hemi.intensity = light.hemiI * inv * 1.45;
      this.scene.environmentIntensity = light.env * inv;
      // fit the shadow map to the island: crisper texels, and a penumbra ~0.3 studs wide
      const R = Math.min(40, reach * inv), sc = this.key.shadow.camera;
      if (Math.abs(sc.right - R) > 0.05) {
        Object.assign(sc, { left: -R, right: R, top: R, bottom: -R }); sc.updateProjectionMatrix();
      }
      this.key.shadow.radius = this.fancy ? (0.3 * this.key.shadow.mapSize.x) / (2 * R) : 3;
      const [b0, b1] = light.bg.map((c) => '#' + c.multiplyScalar(inv).getHexString());
      this.paintBackground(b0, b1);
      const camDist = cam.pos.distanceTo(cam.target);
      this.scene.fog.color.set(b1).lerp(new THREE.Color(b0), 0.35);
      this.scene.fog.near = camDist * 0.92; this.scene.fog.far = camDist * 2.1;
      document.documentElement.style.setProperty('--sky-top', b0);
      document.documentElement.style.setProperty('--sky-bottom', b1);
      if (this.composer) {
        // keep the sharp band on the diorama, wherever the layout puts it
        const focus = 0.5 - cam.sy;
        this.tiltH.uniforms.r.value = focus; this.tiltV.uniforms.r.value = focus;
      }
    }
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
    return s;
  }
}
