/**
 * PhaserEngine — lapisan 2D Phaser.js di atas canvas Three.js (PRD Bagian V,
 * Dev Planning 05). Canvas transparan, z-index 1, pointer-events dimatikan
 * kecuali saat zona interaksi aktif (Mode Frenzy). Fisika Matter.js dengan
 * gravitasi yang dikontrol integritas konstitusional, bukan konstanta.
 *
 * Modul ini mengimpor Phaser secara statis; pemanggilnya (bab) memuatnya lewat
 * dynamic import agar chunk vendor-phaser hanya diunduh saat dibutuhkan.
 */
import Phaser from 'phaser';
import {
  computeWordPhysics,
  gravityForIntegrity,
  type WordPhysics,
} from '@core/physics/wordMass.ts';
import { typographyStyle, type WordKind } from '@core/physics/TypographyStyle.ts';

export interface WordSpawnOptions {
  text: string;
  unitId: string;
  chapterId?: string;
  x: number;
  y: number;
  kind?: WordKind;
  fontSize?: number;
  isStatic?: boolean;
  angle?: number;
  velocity?: { x: number; y: number };
  /** menimpa hasil computeWordPhysics (mis. kata antagonis) */
  physics?: Partial<WordPhysics>;
  data?: Record<string, unknown>;
}

/** Text Phaser yang sudah diberi komponen Matter */
export type MatterText = Phaser.GameObjects.Text &
  Phaser.Physics.Matter.Components.Bounce &
  Phaser.Physics.Matter.Components.Friction &
  Phaser.Physics.Matter.Components.Mass &
  Phaser.Physics.Matter.Components.Static &
  Phaser.Physics.Matter.Components.Velocity &
  Phaser.Physics.Matter.Components.Transform &
  Phaser.Physics.Matter.Components.Sleep & { body: MatterJS.BodyType };

export interface WordHandle {
  id: number;
  text: string;
  unitId: string;
  chapterId: string | undefined;
  kind: WordKind;
  physics: WordPhysics;
  gameObject: MatterText;
  data: Record<string, unknown>;
}

export interface OverlayEvents {
  'word:dragstart': (word: WordHandle) => void;
  'word:dragend': (word: WordHandle) => void;
  'word:collide': (a: WordHandle | null, b: WordHandle | null, speed: number) => void;
  'word:sleep': (word: WordHandle) => void;
}

const WORD_LABEL_PREFIX = 'pf-word:';

export class OverlayScene extends Phaser.Scene {
  readonly words = new Map<number, WordHandle>();
  readonly emitter = new Phaser.Events.EventEmitter();
  private nextId = 1;
  private boundsEnabled = true;
  private readonly onCreated: (scene: OverlayScene) => void;
  private mouseSpring: MatterJS.ConstraintType | null = null;

  constructor(onCreated: (scene: OverlayScene) => void) {
    super({ key: 'overlay', active: true, visible: true });
    this.onCreated = onCreated;
  }

  create(): void {
    this.applyBounds();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize, this);
    this.matter.world.on(
      Phaser.Physics.Matter.Events.COLLISION_START,
      (event: Phaser.Physics.Matter.Events.CollisionStartEvent) => {
        for (const pair of event.pairs) {
          const a = this.handleForBody(pair.bodyA);
          const b = this.handleForBody(pair.bodyB);
          if (!a && !b) continue;
          const va = pair.bodyA.velocity;
          const vb = pair.bodyB.velocity;
          const speed = Math.hypot(va.x - vb.x, va.y - vb.y);
          this.emitter.emit('word:collide', a, b, speed);
        }
      },
    );
    this.matter.world.on(Phaser.Physics.Matter.Events.DRAG_START, (body: MatterJS.BodyType) => {
      const h = this.handleForBody(body);
      if (h) this.emitter.emit('word:dragstart', h);
    });
    this.matter.world.on(Phaser.Physics.Matter.Events.DRAG_END, (body: MatterJS.BodyType) => {
      const h = this.handleForBody(body);
      if (h) this.emitter.emit('word:dragend', h);
    });
    this.matter.world.on(
      Phaser.Physics.Matter.Events.SLEEP_START,
      (event: { source: MatterJS.BodyType }) => {
        const h = this.handleForBody(event.source);
        if (h) this.emitter.emit('word:sleep', h);
      },
    );
    this.onCreated(this);
  }

  /** drag-and-drop responsif lewat pegas mouse Matter (PRD: mekanik drag-and-drop) */
  enableDrag(enabled: boolean): void {
    if (enabled && !this.mouseSpring) {
      this.mouseSpring = this.matter.add.mouseSpring({
        length: 1,
        stiffness: 0.32,
        damping: 0.12,
      });
    } else if (!enabled && this.mouseSpring) {
      this.matter.world.removeConstraint(this.mouseSpring);
      this.mouseSpring = null;
    }
  }

  setGravity(y: number, x = 0): void {
    this.matter.world.setGravity(x, y);
  }

  setWorldBounds(enabled: boolean): void {
    this.boundsEnabled = enabled;
    this.applyBounds();
  }

  private applyBounds(): void {
    const { width, height } = this.scale;
    if (this.boundsEnabled) {
      // dinding kiri/kanan/bawah; atas terbuka agar kata bisa dijatuhkan dari luar layar
      this.matter.world.setBounds(0, -height, width, height * 2, 64, true, true, false, true);
    } else {
      this.matter.world.setBounds(0, 0, width, height, 64, false, false, false, false);
    }
  }

  private handleResize(): void {
    const { width, height } = this.scale;
    this.cameras.resize(width, height);
    this.applyBounds();
  }

  private handleForBody(body: MatterJS.BodyType | undefined): WordHandle | null {
    if (!body) return null;
    const label = (body.parent ?? body).label;
    if (typeof label !== 'string' || !label.startsWith(WORD_LABEL_PREFIX)) return null;
    const id = Number(label.slice(WORD_LABEL_PREFIX.length));
    return this.words.get(id) ?? null;
  }

  spawnWord(options: WordSpawnOptions): WordHandle {
    const kind = options.kind ?? 'pasal';
    const computed = computeWordPhysics(options.text, options.unitId, options.chapterId);
    const physics: WordPhysics = { ...computed, ...options.physics };
    const id = this.nextId++;

    const style = typographyStyle(kind, options.fontSize ?? 22);
    const text = this.add.text(options.x, options.y, options.text, style).setOrigin(0.5, 0.5);
    text.setShadow(0, 0, style.glow, 10, true, true);

    const padX = 10;
    const padY = 6;
    const go = this.matter.add.gameObject(text, {
      shape: {
        type: 'rectangle',
        width: text.width + padX,
        height: text.height + padY,
      },
      label: `${WORD_LABEL_PREFIX}${id}`,
      restitution: physics.restitution,
      friction: physics.friction,
      frictionAir: physics.frictionAir,
      isStatic: options.isStatic ?? false,
      angle: options.angle ?? 0,
      chamfer: { radius: 4 },
    }) as MatterText;
    go.setMass(physics.mass);
    if (options.velocity) go.setVelocity(options.velocity.x, options.velocity.y);

    const handle: WordHandle = {
      id,
      text: options.text,
      unitId: options.unitId,
      chapterId: options.chapterId,
      kind,
      physics,
      gameObject: go,
      data: options.data ?? {},
    };
    this.words.set(id, handle);
    return handle;
  }

  setWordKind(handle: WordHandle, kind: WordKind): void {
    handle.kind = kind;
    const style = typographyStyle(
      kind,
      Number.parseInt(String(handle.gameObject.style.fontSize), 10) || 22,
    );
    handle.gameObject.setStyle(style);
    handle.gameObject.setShadow(0, 0, style.glow, 10, true, true);
  }

  removeWord(handle: WordHandle): void {
    if (!this.words.has(handle.id)) return;
    this.words.delete(handle.id);
    handle.gameObject.destroy();
  }

  clearWords(): void {
    for (const h of Array.from(this.words.values())) this.removeWord(h);
  }

  get wordCount(): number {
    return this.words.size;
  }
}

export interface PhaserEngineOptions {
  /** ukuran awal; setelah itu mengikuti container (Scale.RESIZE) */
  width?: number;
  height?: number;
  debugPhysics?: boolean;
}

export class PhaserEngine {
  readonly game: Phaser.Game;
  readonly ready: Promise<OverlayScene>;
  readonly container: HTMLElement;
  scene: OverlayScene | null = null;
  private interactive = false;

  constructor(container: HTMLElement, options: PhaserEngineOptions = {}) {
    this.container = container;
    let resolveReady: (s: OverlayScene) => void = () => undefined;
    this.ready = new Promise<OverlayScene>((resolve) => {
      resolveReady = resolve;
    });
    const scene = new OverlayScene((s) => {
      this.scene = s;
      this.applyCanvasStyle();
      resolveReady(s);
    });

    this.game = new Phaser.Game({
      type: Phaser.WEBGL,
      parent: container,
      transparent: true,
      backgroundColor: 'rgba(0,0,0,0)',
      width: (options.width ?? container.clientWidth) || 1280,
      height: (options.height ?? container.clientHeight) || 720,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.NO_CENTER },
      physics: {
        default: 'matter',
        matter: {
          gravity: { x: 0, y: gravityForIntegrity(1) },
          enableSleeping: true,
          debug: options.debugPhysics ?? false,
        },
      },
      render: { antialias: true, powerPreference: 'high-performance', transparent: true },
      audio: { noAudio: true },
      banner: false,
      autoFocus: false,
      disableContextMenu: true,
      input: { activePointers: 3 },
      fps: { target: 60, forceSetTimeOut: false },
      scene: [scene],
    });
  }

  private applyCanvasStyle(): void {
    const canvas = this.game.canvas;
    if (!canvas) return;
    canvas.classList.add('pf-canvas', 'pf-canvas--phaser');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.pointerEvents = this.interactive ? 'auto' : 'none';
  }

  /** zona interaksi aktif: canvas menerima pointer (drag kata) */
  setInteractive(enabled: boolean): void {
    this.interactive = enabled;
    if (this.game.canvas) this.game.canvas.style.pointerEvents = enabled ? 'auto' : 'none';
    this.scene?.enableDrag(enabled);
  }

  get isInteractive(): boolean {
    return this.interactive;
  }

  /** gravitasi kata mengikuti integritas konstitusional */
  applyIntegrity(integrity: number): void {
    this.scene?.setGravity(gravityForIntegrity(integrity));
  }

  /** memastikan font tipografi sudah termuat sebelum teks dirender ke tekstur */
  static async ensureFonts(): Promise<void> {
    if (typeof document === 'undefined' || !('fonts' in document)) return;
    try {
      await Promise.all([
        document.fonts.load('700 24px "JetBrains Mono"'),
        document.fonts.load('400 24px "JetBrains Mono"'),
      ]);
    } catch {
      /* font fallback monospace */
    }
  }

  destroy(): void {
    this.scene?.clearWords();
    this.game.destroy(true);
    this.scene = null;
  }
}
