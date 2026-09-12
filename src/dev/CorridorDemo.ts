/**
 * CorridorDemo — scene pengembangan untuk memverifikasi ThreeEngine, ruang
 * hiperbolik, anchor, portal, dan input. Dibuka lewat `?dev=corridor`.
 * Tidak masuk bundle produksi kecuali dipanggil (dynamic import).
 *
 * Tombol: WASD gerak, mouse lihat (klik untuk pointer lock), Shift lari,
 * [ / ] turunkan / naikkan integritas 0.1, F toggle Frenzy naratif,
 * 1/2/3 preset kualitas.
 */
import {
  AmbientLight,
  BoxGeometry,
  CanvasTexture,
  Color,
  DirectionalLight,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  PointLight,
  SRGBColorSpace,
  Vector3,
} from 'three';
import { ConstitutionalAnchors } from '@core/engine/ConstitutionalAnchors.ts';
import { FirstPersonRig } from '@core/engine/FirstPersonRig.ts';
import { PortalSystem } from '@core/engine/PortalSystem.ts';
import { QUALITY_PRESETS, ThreeEngine } from '@core/engine/ThreeEngine.ts';
import { InputManager } from '@core/input/InputManager.ts';
import { applyConstitutionalWarpDeep } from '@core/shaders/ConstitutionalMaterial.ts';
import { constitutionalStore } from '@core/store/ConstitutionalStore.ts';
import { createUudIndex } from '@data/uud1945.ts';

const CORRIDOR_LENGTH = 90;
const CORRIDOR_WIDTH = 6;
const CORRIDOR_HEIGHT = 4;

function makeTextTexture(lines: string[], accent: string): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0b1230';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 6;
    ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
    ctx.fillStyle = '#f8f8f8';
    ctx.font = '700 40px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';
    let y = 40;
    for (const line of lines) {
      ctx.fillText(line, 40, y);
      y += 52;
    }
  }
  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function wrap(text: string, max = 40): string[] {
  const words = text.split(' ');
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > max) {
      out.push(line.trim());
      line = w;
    } else line = `${line} ${w}`;
  }
  if (line.trim()) out.push(line.trim());
  return out.slice(0, 8);
}

export function runCorridorDemo(root: HTMLElement): () => void {
  root.innerHTML = '';
  root.style.position = 'relative';
  root.style.height = '100dvh';

  const engine = new ThreeEngine(root, { quality: QUALITY_PRESETS.sedang });
  const { scene, camera, uniforms } = engine;
  scene.background = new Color(0x080810);

  const rig = new FirstPersonRig(camera, {
    resolveMove: (_from, to) =>
      new Vector3(
        Math.max(-CORRIDOR_WIDTH / 2 + 0.5, Math.min(CORRIDOR_WIDTH / 2 - 0.5, to.x)),
        0,
        Math.max(-CORRIDOR_LENGTH + 1, Math.min(4, to.z)),
      ),
  });
  rig.setPose(0, 3);
  scene.add(rig.yawObject);

  const input = new InputManager(engine.renderer.domElement);

  // ---- geometri koridor ----
  const world = new Group();
  const floorMat = new MeshStandardMaterial({ color: 0x14162a, roughness: 0.85, metalness: 0.1 });
  const wallMat = new MeshStandardMaterial({ color: 0x0f1224, roughness: 0.6, metalness: 0.2 });
  const floor = new Mesh(new PlaneGeometry(CORRIDOR_WIDTH, CORRIDOR_LENGTH, 6, 90), floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.position.z = -CORRIDOR_LENGTH / 2 + 4;
  floor.receiveShadow = true;
  const ceiling = floor.clone();
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = CORRIDOR_HEIGHT;
  world.add(floor, ceiling);

  for (const side of [-1, 1]) {
    const wall = new Mesh(new PlaneGeometry(CORRIDOR_LENGTH, CORRIDOR_HEIGHT, 90, 4), wallMat);
    wall.rotation.y = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    wall.position.set((side * CORRIDOR_WIDTH) / 2, CORRIDOR_HEIGHT / 2, -CORRIDOR_LENGTH / 2 + 4);
    wall.receiveShadow = true;
    world.add(wall);
  }

  // panel kaca berisi teks pasal asli (28A-28J) di sepanjang koridor
  const index = createUudIndex();
  const ids = ['28A', '28B', '28C', '28D', '28E', '28F', '28G', '28H', '28I', '28J'];
  ids.forEach((id, i) => {
    const ref = index.pasalById.get(id);
    if (!ref) return;
    const text = ref.pasal.teks ?? ref.pasal.ayat.map((a) => `(${a.nomor}) ${a.teks}`).join(' ');
    const tex = makeTextTexture([`Pasal ${id}`, ...wrap(text)], i % 2 ? '#dc2626' : '#3b82f6');
    const panel = new Mesh(
      new BoxGeometry(0.12, 2.4, 4.6, 1, 6, 12),
      new MeshPhysicalMaterial({
        map: tex,
        roughness: 0.05,
        metalness: 0,
        transmission: 0.35,
        thickness: 0.4,
        transparent: true,
        opacity: 0.95,
        emissive: new Color(i % 2 ? 0x3a0a0a : 0x0a1a3a),
        emissiveIntensity: 0.6,
      }),
    );
    const side = i % 2 === 0 ? -1 : 1;
    panel.position.set(side * (CORRIDOR_WIDTH / 2 - 0.2), 1.9, -6 - i * 8);
    panel.castShadow = true;
    world.add(panel);
  });

  // pilar dan pintu emas di ujung
  for (let z = -4; z > -CORRIDOR_LENGTH; z -= 12) {
    for (const side of [-1, 1]) {
      const pillar = new Mesh(
        new BoxGeometry(0.4, CORRIDOR_HEIGHT, 0.4, 1, 8, 1),
        new MeshStandardMaterial({ color: 0x1e2340, roughness: 0.4, metalness: 0.5 }),
      );
      pillar.position.set(side * (CORRIDOR_WIDTH / 2 - 0.3), CORRIDOR_HEIGHT / 2, z);
      pillar.castShadow = true;
      world.add(pillar);
    }
  }
  const door = new Mesh(
    new BoxGeometry(2.2, 3.2, 0.3, 4, 6, 1),
    new MeshStandardMaterial({
      color: 0xd4a017,
      emissive: 0xd4a017,
      emissiveIntensity: 0.8,
      roughness: 0.3,
      metalness: 0.8,
    }),
  );
  door.position.set(0, 1.6, -CORRIDOR_LENGTH + 2);
  world.add(door);
  scene.add(world);

  // ---- pencahayaan (PRD Bagian IV) ----
  scene.add(new AmbientLight(0xffffff, 0.1));
  const sun = new DirectionalLight(0xfff2d6, 1.2);
  sun.position.set(6, 12, 8);
  sun.castShadow = engine.quality.shadows;
  sun.shadow.mapSize.set(engine.quality.shadowMapSize, engine.quality.shadowMapSize);
  sun.shadow.camera.left = -20;
  sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20;
  sun.shadow.camera.bottom = -60;
  scene.add(sun);
  for (let i = 0; i < 6; i++) {
    const light = new PointLight(i % 2 ? 0xdc2626 : 0x3b82f6, 40, 22, 2);
    light.position.set(0, CORRIDOR_HEIGHT - 0.5, -8 - i * 14);
    scene.add(light);
  }

  // ---- anchor konstitusional (radius mengikuti mastery Pasal 1) ----
  const anchors = new ConstitutionalAnchors();
  anchors.getMastery = (id) => constitutionalStore.getState().getMastery(id);
  anchors.add({ id: 'pasal-1', position: new Vector3(0, 1.7, 0), baseRadius: 7, pasalId: '1' });
  constitutionalStore.getState().collectPasal('1', '1-3', 'demo');
  constitutionalStore.getState().recordArgumentUse(['1'], true, 1);

  // ---- portal: dari z=-30 (kiri) ke z=-70 (kanan) ----
  const portals = new PortalSystem(uniforms.set);
  const [pa, pb] = portals.createPair(
    { width: 2, height: 3, rim: [0.23, 0.51, 0.96] },
    { width: 2, height: 3, rim: [0.86, 0.15, 0.15] },
  );
  pa.mesh.position.set(-CORRIDOR_WIDTH / 2 + 0.15, 1.6, -30);
  pa.mesh.rotation.y = Math.PI / 2;
  pb.mesh.position.set(CORRIDOR_WIDTH / 2 - 0.15, 1.6, -70);
  pb.mesh.rotation.y = -Math.PI / 2;
  scene.add(pa.mesh, pb.mesh);
  // penanda emisif di depan portal tujuan agar pandangan lewat portal A jelas terlihat
  const beacon = new Mesh(
    new BoxGeometry(0.6, 2.6, 0.6, 2, 6, 2),
    new MeshStandardMaterial({
      color: 0xd4a017,
      emissive: 0xd4a017,
      emissiveIntensity: 2.5,
      roughness: 0.4,
      metalness: 0.2,
    }),
  );
  beacon.position.set(0.4, 1.3, -70);
  world.add(beacon);

  applyConstitutionalWarpDeep(world, uniforms.set);

  // ---- HUD sederhana ----
  const hud = document.createElement('div');
  hud.className = 'pf-devhud';
  hud.style.cssText =
    'position:absolute;left:12px;top:12px;padding:8px 12px;background:rgba(8,8,16,.7);color:#f8f8f8;font:12px/1.5 "JetBrains Mono",monospace;border:1px solid #1e3a8a;pointer-events:none;white-space:pre';
  root.appendChild(hud);

  let fpsAcc = 0;
  let fpsFrames = 0;
  let fps = 0;
  const offUpdate = engine.onUpdate((dt) => {
    const frame = input.consumeFrame();
    rig.update(dt, frame);
    anchors.upload(camera, uniforms.set);
    portals.render(engine.renderer, scene, camera);

    fpsAcc += dt;
    fpsFrames += 1;
    if (fpsAcc >= 0.5) {
      fps = Math.round(fpsFrames / fpsAcc);
      fpsAcc = 0;
      fpsFrames = 0;
    }
    const s = constitutionalStore.getState();
    hud.textContent =
      `integritas ${s.integrity.toFixed(3)} (${s.getIntegrityLevel()})  target ${s.integrityTarget.toFixed(2)}\n` +
      `frenzy ${s.frenzyActive ? 'AKTIF' : 'off'}  tekanan ${uniforms.set.u_democracyPressure.value.toFixed(2)}\n` +
      `fps ${fps}  mode ${frame.mode}  lock ${frame.pointerLocked ? 'ya' : 'tidak'}  kualitas ${engine.quality.preset}\n` +
      `[ ] integritas, F frenzy, 1/2/3 kualitas, klik = pointer lock`;
  });

  const onKey = (e: KeyboardEvent) => {
    const s = constitutionalStore.getState();
    if (e.code === 'BracketLeft' || e.key === '[') s.updateIntegrity(-0.1, 'demo: tekan [');
    if (e.code === 'BracketRight' || e.key === ']') s.updateIntegrity(+0.1, 'demo: tekan ]');
    if (e.code === 'KeyF') {
      if (s.frenzyActive) s.deactivateFrenzy('manual');
      else s.activateFrenzy('naratif');
    }
    if (e.code === 'Digit1') engine.setQuality(QUALITY_PRESETS.rendah);
    if (e.code === 'Digit2') engine.setQuality(QUALITY_PRESETS.sedang);
    if (e.code === 'Digit3') engine.setQuality(QUALITY_PRESETS.tinggi);
  };
  window.addEventListener('keydown', onKey);

  engine.start();
  // akses debug dari konsol / alat uji (hanya scene dev)
  (window as unknown as { __pf?: unknown }).__pf = {
    engine,
    store: constitutionalStore,
    rig,
    portals,
    anchors,
  };

  return () => {
    window.removeEventListener('keydown', onKey);
    offUpdate();
    input.dispose();
    portals.dispose();
    engine.dispose();
    hud.remove();
  };
}
