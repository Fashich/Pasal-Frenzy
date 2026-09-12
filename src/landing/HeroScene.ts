/**
 * HeroScene — ruang hampa di balik landing page: pratinjau hidup prolog.
 * Partikel cahaya putih-kekuningan (GPU, shader) dan kata-kata Pembukaan
 * (troika-three-text, font Playfair Display lokal) melayang perlahan;
 * dua kata dari alinea yang sama sesekali beresonansi (busur cahaya biru);
 * pointer memberi paralaks kamera dan tolakan lembut; scroll membawa kamera
 * makin dalam ke kehampaan.
 */
import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  FogExp2,
  Group,
  Line,
  LineBasicMaterial,
  Points,
  ShaderMaterial,
  Vector3,
} from 'three';
import { Text } from 'troika-three-text';
import playfairUrl from '@fontsource/playfair-display/files/playfair-display-latin-400-normal.woff?url';
import { ThreeEngine, type RenderQuality } from '@core/engine/ThreeEngine.ts';
import { pembukaan } from '@data/pembukaan.ts';
import { getKataWeight } from '@data/pasalWeights.ts';

export interface HeroSceneOptions {
  reducedMotion?: boolean;
  /** perangkat lemah/sentuh: partikel lebih sedikit, tanpa paralaks pointer */
  lite?: boolean;
}

interface WordNode {
  text: Text;
  home: Vector3;
  velocity: Vector3;
  phase: number;
  alinea: number;
  baseColor: Color;
  glow: number;
}

interface Arc {
  line: Line;
  a: WordNode;
  b: WordNode;
  life: number;
}

const particleVertex = /* glsl */ `
attribute float aSeed;
attribute float aSize;
uniform float u_time;
uniform float u_pixelRatio;
varying float vSeed;
varying float vFade;
void main() {
  vSeed = aSeed;
  vec3 p = position;
  float t = u_time;
  p.x += sin(t * 0.13 + aSeed * 6.2831) * 1.4;
  p.y += cos(t * 0.09 + aSeed * 3.1416) * 0.9;
  p.z += sin(t * 0.07 + aSeed * 9.42) * 1.1;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  float dist = max(1.0, -mv.z);
  gl_PointSize = aSize * u_pixelRatio * (140.0 / dist);
  vFade = smoothstep(120.0, 20.0, dist);
  gl_Position = projectionMatrix * mv;
}
`;

const particleFragment = /* glsl */ `
uniform float u_dim;
varying float vSeed;
varying float vFade;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  float alpha = smoothstep(0.5, 0.05, d) * (0.35 + 0.65 * vFade) * (1.0 - 0.6 * u_dim);
  vec3 warm = vec3(0.98, 0.94, 0.80);
  vec3 cool = vec3(0.23, 0.51, 0.96);
  vec3 col = mix(warm, cool, step(0.82, vSeed));
  gl_FragColor = vec4(col, alpha * 0.9);
}
`;

const HERO_QUALITY = (lite: boolean): RenderQuality => ({
  preset: lite ? 'rendah' : 'sedang',
  pixelRatioCap: lite ? 1 : 1.5,
  msaaSamples: 0,
  shadows: false,
  shadowMapSize: 512,
  postProcessing: false,
});

export class HeroScene {
  readonly engine: ThreeEngine;
  private readonly group = new Group();
  private readonly words: WordNode[] = [];
  private readonly arcs: Arc[] = [];
  private readonly particles: Points<BufferGeometry, ShaderMaterial>;
  private readonly reducedMotion: boolean;
  private readonly lite: boolean;
  private pointer = { x: 0, y: 0 };
  private scroll = 0;
  /** 0..1 peredupan kata & partikel saat konten menutupi latar */
  private dim = 0;
  private nextArcAt = 1.2;
  private readonly fog: FogExp2;
  private offUpdate: (() => void) | null = null;
  private readonly wordColor = new Color('#dbe7ff');

  constructor(container: HTMLElement, options: HeroSceneOptions = {}) {
    this.reducedMotion = options.reducedMotion ?? false;
    this.lite = options.lite ?? false;
    this.engine = new ThreeEngine(container, {
      quality: HERO_QUALITY(this.lite),
      logarithmicDepthBuffer: false,
      background: 0x080810,
    });
    this.engine.camera.fov = 58;
    this.engine.camera.updateProjectionMatrix();
    this.fog = new FogExp2(0x080810, 0.028);
    this.engine.scene.fog = this.fog;
    this.engine.scene.add(this.group);

    this.particles = this.buildParticles(this.lite ? 420 : 1300);
    this.group.add(this.particles);
    this.buildWords(this.lite ? 26 : 44);
  }

  private buildParticles(count: number): Points<BufferGeometry, ShaderMaterial> {
    const positions = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 50;
      positions[i * 3 + 2] = -Math.random() * 130 + 8;
      seeds[i] = Math.random();
      sizes[i] = 1.2 + Math.random() * 2.6;
    }
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(positions, 3));
    geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1));
    geometry.setAttribute('aSize', new BufferAttribute(sizes, 1));
    const material = new ShaderMaterial({
      uniforms: {
        u_time: this.engine.uniforms.set.u_time,
        u_pixelRatio: { value: this.engine.size.dpr },
        u_dim: { value: 0 },
      },
      vertexShader: particleVertex,
      fragmentShader: particleFragment,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const points = new Points(geometry, material);
    points.frustumCulled = false;
    return points;
  }

  private buildWords(count: number): void {
    const pool: { teks: string; alinea: number; weight: number }[] = [];
    for (const al of pembukaan.alinea) {
      for (const k of al.kata) {
        if (k.bersih.length < 4) continue;
        pool.push({
          teks: k.bersih,
          alinea: al.nomor,
          weight: getKataWeight(k.bersih)?.tfidfNorm ?? 0.3,
        });
      }
    }
    // pilih merata dari seluruh Pembukaan
    const step = Math.max(1, Math.floor(pool.length / count));
    const chosen = pool.filter((_, i) => i % step === 0).slice(0, count);
    for (const item of chosen) {
      const text = new Text();
      text.text = item.teks;
      text.font = playfairUrl;
      text.fontSize = 0.55 + item.weight * 0.75;
      text.color = this.wordColor.getHex();
      text.anchorX = 'center';
      text.anchorY = 'middle';
      text.material.transparent = true;
      text.material.opacity = 0.82;
      text.material.depthWrite = false;
      const home = new Vector3(
        (Math.random() - 0.5) * 34,
        (Math.random() - 0.5) * 18,
        -6 - Math.random() * 34,
      );
      text.position.copy(home);
      text.sync();
      this.group.add(text);
      this.words.push({
        text,
        home,
        velocity: new Vector3(),
        phase: Math.random() * Math.PI * 2,
        alinea: item.alinea,
        baseColor: this.wordColor.clone(),
        glow: 0,
      });
    }
  }

  /**
   * Menunggu semua teks selesai dirender ke SDF (tahap pemuatan nyata).
   * Dibatasi timeoutMs: jika font gagal/lambat, aplikasi tetap lanjut dan
   * troika merender saat siap (tidak pernah mengunci preloader).
   */
  async ready(onProgress?: (fraction: number) => void, timeoutMs = 8000): Promise<void> {
    let done = 0;
    const all = Promise.all(
      this.words.map(
        (w) =>
          new Promise<void>((resolve) => {
            w.text.sync(() => {
              done += 1;
              onProgress?.(done / this.words.length);
              resolve();
            });
          }),
      ),
    );
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
    await Promise.race([all, timeout]);
    this.engine.renderer.compile(this.engine.scene, this.engine.camera);
  }

  get wordCount(): number {
    return this.words.length;
  }

  setPointer(nx: number, ny: number): void {
    this.pointer.x = nx;
    this.pointer.y = ny;
  }

  /** 0..1 progres scroll halaman */
  setScroll(progress: number): void {
    this.scroll = Math.min(1, Math.max(0, progress));
  }

  /** 0..1: kata memudar dan partikel meredup agar tidak bersaing dengan teks konten */
  setDim(t: number): void {
    this.dim = Math.min(1, Math.max(0, t));
    const wordOpacity = 0.82 * (1 - 0.9 * this.dim);
    for (const w of this.words) w.text.material.opacity = wordOpacity;
    (this.particles.material.uniforms['u_dim'] as { value: number }).value = this.dim;
  }

  start(): void {
    if (this.offUpdate) return;
    this.offUpdate = this.engine.onUpdate((dt, elapsed) => this.update(dt, elapsed));
    this.engine.start();
  }

  stop(): void {
    this.offUpdate?.();
    this.offUpdate = null;
    this.engine.stop();
  }

  private update(dt: number, elapsed: number): void {
    const cam = this.engine.camera;
    const targetZ = -this.scroll * 30;
    const px = this.lite ? 0 : this.pointer.x * 1.4;
    const py = this.lite ? 0 : this.pointer.y * 0.9;
    const k = 1 - Math.exp(-dt * 2.2);
    cam.position.x += (px - cam.position.x) * k;
    cam.position.y += (py - cam.position.y) * k;
    cam.position.z += (targetZ - cam.position.z) * k;
    cam.rotation.x = -this.scroll * 0.06;
    this.fog.density = 0.028 + this.scroll * 0.012;
    (this.particles.material.uniforms['u_pixelRatio'] as { value: number }).value =
      this.engine.size.dpr;

    if (this.reducedMotion) return;

    const aspect = cam.aspect;
    const tanHalf = Math.tan((cam.fov * Math.PI) / 360);
    for (const w of this.words) {
      const t = w.text;
      // drift lembut di sekitar posisi rumah
      const driftX = Math.sin(elapsed * 0.22 + w.phase) * 0.9;
      const driftY = Math.cos(elapsed * 0.17 + w.phase * 1.3) * 0.6;
      const target = new Vector3(w.home.x + driftX, w.home.y + driftY, w.home.z);

      // tolakan pointer: proyeksikan pointer ke kedalaman kata
      if (!this.lite) {
        const depth = cam.position.z - t.position.z;
        const worldX = cam.position.x + this.pointer.x * tanHalf * depth * aspect;
        const worldY = cam.position.y + this.pointer.y * tanHalf * depth;
        const dx = t.position.x - worldX;
        const dy = t.position.y - worldY;
        const dist = Math.hypot(dx, dy);
        const radius = 4.5;
        if (dist < radius && dist > 0.001) {
          const push = ((radius - dist) / radius) * 6;
          w.velocity.x += (dx / dist) * push * dt;
          w.velocity.y += (dy / dist) * push * dt;
        }
      }
      // pegas ke target + redaman
      w.velocity.x += (target.x - t.position.x) * 1.6 * dt;
      w.velocity.y += (target.y - t.position.y) * 1.6 * dt;
      w.velocity.z += (target.z - t.position.z) * 1.6 * dt;
      w.velocity.multiplyScalar(Math.exp(-dt * 1.8));
      t.position.addScaledVector(w.velocity, dt);
      t.rotation.z = Math.sin(elapsed * 0.3 + w.phase) * 0.03;

      if (w.glow > 0) {
        w.glow = Math.max(0, w.glow - dt * 0.8);
        t.color = w.baseColor.clone().lerp(new Color('#ffffff'), w.glow).getHex();
        t.scale.setScalar(1 + w.glow * 0.12);
      }
    }

    // busur resonansi antar kata satu alinea
    this.nextArcAt -= dt;
    if (this.nextArcAt <= 0 && this.arcs.length < 3) {
      this.spawnArc();
      this.nextArcAt = 1.4 + Math.random() * 1.8;
    }
    for (let i = this.arcs.length - 1; i >= 0; i--) {
      const arc = this.arcs[i];
      if (!arc) continue;
      arc.life += dt;
      const p = arc.life / 1.5;
      const opacity = p < 0.3 ? p / 0.3 : Math.max(0, 1 - (p - 0.3) / 0.7);
      (arc.line.material as LineBasicMaterial).opacity = opacity * 0.9;
      const pos = arc.line.geometry.getAttribute('position') as BufferAttribute;
      pos.setXYZ(0, arc.a.text.position.x, arc.a.text.position.y, arc.a.text.position.z);
      pos.setXYZ(1, arc.b.text.position.x, arc.b.text.position.y, arc.b.text.position.z);
      pos.needsUpdate = true;
      if (p >= 1) {
        this.group.remove(arc.line);
        arc.line.geometry.dispose();
        (arc.line.material as LineBasicMaterial).dispose();
        this.arcs.splice(i, 1);
      }
    }
  }

  private spawnArc(): void {
    const a = this.words[Math.floor(Math.random() * this.words.length)];
    if (!a) return;
    const candidates = this.words.filter(
      (w) => w !== a && w.alinea === a.alinea && w.text.position.distanceTo(a.text.position) < 16,
    );
    const b = candidates[Math.floor(Math.random() * candidates.length)];
    if (!b) return;
    const geometry = new BufferGeometry();
    geometry.setAttribute('position', new BufferAttribute(new Float32Array(6), 3));
    const material = new LineBasicMaterial({
      color: 0x3b82f6,
      transparent: true,
      opacity: 0,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const line = new Line(geometry, material);
    line.frustumCulled = false;
    this.group.add(line);
    a.glow = 1;
    b.glow = 1;
    this.arcs.push({ line, a, b, life: 0 });
  }

  dispose(): void {
    this.stop();
    for (const w of this.words) w.text.dispose();
    for (const arc of this.arcs) {
      arc.line.geometry.dispose();
      (arc.line.material as LineBasicMaterial).dispose();
    }
    this.particles.geometry.dispose();
    this.particles.material.dispose();
    this.engine.dispose();
  }
}
