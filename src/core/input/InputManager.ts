/**
 * InputManager — abstraksi masukan lintas perangkat (PRD Bagian XIV).
 *
 * Desktop: pointer lock + mouse look, WASD/panah, Shift lari, E/Spasi interaksi,
 *          Esc jeda.
 * Sentuh:  dua zona — separuh kiri joystick gerak, separuh kanan seret untuk
 *          melihat, ketuk singkat di kanan = interaksi.
 * Gamepad: stik kiri gerak, stik kanan lihat, A interaksi, Start jeda.
 * XR:      diisi oleh AFrameManager (feature/07) lewat setExternalFrame().
 *
 * Setiap frame, konsumen memanggil consumeFrame() untuk mendapat snapshot dan
 * mengosongkan delta.
 */
import {
  constitutionalBus,
  type ConstitutionalEventBus,
  type InputMode,
} from '@core/engine/ConstitutionalEventBus.ts';

export interface InputFrame {
  /** -1..1, x = kanan, y = maju */
  move: { x: number; y: number };
  /** delta pandangan (radian-ish, sudah dikali sensitivitas) */
  look: { x: number; y: number };
  interactPressed: boolean;
  interactHeld: boolean;
  sprint: boolean;
  pausePressed: boolean;
  mode: InputMode;
  pointerLocked: boolean;
}

export interface InputOptions {
  bus?: ConstitutionalEventBus;
  mouseSensitivity?: number;
  touchLookSensitivity?: number;
  gamepadLookSensitivity?: number;
  /** radius joystick sentuh (px) */
  joystickRadius?: number;
  /** meminta pointer lock saat klik di elemen (desktop) */
  autoPointerLock?: boolean;
}

interface TouchState {
  id: number;
  zone: 'move' | 'look';
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  startedAt: number;
  moved: boolean;
}

const KEY_MAP: Record<string, keyof InputManager['keys']> = {
  KeyW: 'forward',
  ArrowUp: 'forward',
  KeyS: 'back',
  ArrowDown: 'back',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  ShiftLeft: 'sprint',
  ShiftRight: 'sprint',
  KeyE: 'interact',
  Space: 'interact',
  Enter: 'interact',
  Escape: 'pause',
  KeyP: 'pause',
};

export class InputManager {
  readonly element: HTMLElement;
  readonly keys = {
    forward: false,
    back: false,
    left: false,
    right: false,
    sprint: false,
    interact: false,
    pause: false,
  };
  mode: InputMode = 'pointer';
  enabled = true;

  private readonly bus: ConstitutionalEventBus;
  private readonly mouseSensitivity: number;
  private readonly touchLookSensitivity: number;
  private readonly gamepadLookSensitivity: number;
  private readonly joystickRadius: number;
  private readonly autoPointerLock: boolean;

  private lookDx = 0;
  private lookDy = 0;
  private interactEdge = false;
  private pauseEdge = false;
  private interactWasHeld = false;
  private pauseWasHeld = false;
  private touches = new Map<number, TouchState>();
  private touchMove = { x: 0, y: 0 };
  private gamepadIndex: number | null = null;
  private gamepadInteractWas = false;
  private gamepadPauseWas = false;
  private externalFrame: Partial<InputFrame> | null = null;
  private pointerLocked = false;
  private disposed = false;

  constructor(element: HTMLElement, options: InputOptions = {}) {
    this.element = element;
    this.bus = options.bus ?? constitutionalBus;
    this.mouseSensitivity = options.mouseSensitivity ?? 0.0022;
    this.touchLookSensitivity = options.touchLookSensitivity ?? 0.005;
    this.gamepadLookSensitivity = options.gamepadLookSensitivity ?? 0.04;
    this.joystickRadius = options.joystickRadius ?? 56;
    this.autoPointerLock = options.autoPointerLock ?? true;

    element.style.touchAction = 'none';
    element.addEventListener('keydown', this.onKeyDown);
    element.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    window.addEventListener('blur', this.onBlur);
    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerUp);
    element.addEventListener('contextmenu', this.onContextMenu);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
    window.addEventListener('gamepadconnected', this.onGamepadConnected);
    window.addEventListener('gamepaddisconnected', this.onGamepadDisconnected);
  }

  /* ---------------------------- keyboard ---------------------------- */
  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (!this.enabled) return;
    const key = KEY_MAP[e.code];
    if (!key) return;
    if (e.repeat) {
      e.preventDefault();
      return;
    }
    this.keys[key] = true;
    if (key !== 'pause') this.setMode('pointer');
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault();
    }
  };

  private readonly onKeyUp = (e: KeyboardEvent): void => {
    const key = KEY_MAP[e.code];
    if (key) this.keys[key] = false;
  };

  private readonly onBlur = (): void => {
    for (const k of Object.keys(this.keys) as (keyof typeof this.keys)[]) this.keys[k] = false;
    this.touches.clear();
    this.touchMove = { x: 0, y: 0 };
  };

  private readonly onContextMenu = (e: Event): void => e.preventDefault();

  /* ----------------------------- pointer ---------------------------- */
  private readonly onPointerDown = (e: PointerEvent): void => {
    if (!this.enabled) return;
    if (e.pointerType === 'touch') {
      this.setMode('touch');
      const rect = this.element.getBoundingClientRect();
      const zone: TouchState['zone'] = e.clientX - rect.left < rect.width / 2 ? 'move' : 'look';
      // satu jari per zona
      for (const t of this.touches.values()) if (t.zone === zone) return;
      this.touches.set(e.pointerId, {
        id: e.pointerId,
        zone,
        startX: e.clientX,
        startY: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        startedAt: performance.now(),
        moved: false,
      });
      try {
        this.element.setPointerCapture(e.pointerId);
      } catch {
        /* abaikan */
      }
      return;
    }
    this.setMode('pointer');
    if (e.button === 0) {
      if (this.autoPointerLock && !this.pointerLocked) void this.requestPointerLock();
      else this.interactEdge = true;
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    if (!this.enabled) return;
    if (e.pointerType === 'touch') {
      const t = this.touches.get(e.pointerId);
      if (!t) return;
      const dx = e.clientX - t.lastX;
      const dy = e.clientY - t.lastY;
      t.lastX = e.clientX;
      t.lastY = e.clientY;
      if (Math.hypot(e.clientX - t.startX, e.clientY - t.startY) > 8) t.moved = true;
      if (t.zone === 'look') {
        this.lookDx += dx * this.touchLookSensitivity;
        this.lookDy += dy * this.touchLookSensitivity;
      } else {
        const ox = (e.clientX - t.startX) / this.joystickRadius;
        const oy = (e.clientY - t.startY) / this.joystickRadius;
        const len = Math.hypot(ox, oy);
        const scale = len > 1 ? 1 / len : 1;
        this.touchMove = { x: ox * scale, y: -oy * scale };
      }
      return;
    }
    if (this.pointerLocked) {
      this.lookDx += e.movementX * this.mouseSensitivity;
      this.lookDy += e.movementY * this.mouseSensitivity;
    }
  };

  private readonly onPointerUp = (e: PointerEvent): void => {
    if (e.pointerType !== 'touch') return;
    const t = this.touches.get(e.pointerId);
    if (!t) return;
    this.touches.delete(e.pointerId);
    if (t.zone === 'move') this.touchMove = { x: 0, y: 0 };
    else if (!t.moved && performance.now() - t.startedAt < 250) this.interactEdge = true;
  };

  private readonly onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.element;
  };

  async requestPointerLock(): Promise<void> {
    if (typeof this.element.requestPointerLock !== 'function') return;
    try {
      const r = this.element.requestPointerLock({ unadjustedMovement: true }) as
        Promise<void> | undefined;
      if (r && typeof r.then === 'function') await r;
    } catch {
      try {
        const fallback = this.element.requestPointerLock() as Promise<void> | undefined;
        if (fallback && typeof fallback.catch === 'function') {
          fallback.catch(() => {
            /* pointer lock ditolak (iframe, WebView, atau tanpa gesture) */
          });
        }
      } catch {
        /* pointer lock tidak tersedia (mis. WebView tertentu) */
      }
    }
  }

  exitPointerLock(): void {
    if (document.pointerLockElement === this.element) document.exitPointerLock();
  }

  /* ----------------------------- gamepad ---------------------------- */
  private readonly onGamepadConnected = (e: GamepadEvent): void => {
    this.gamepadIndex = e.gamepad.index;
  };

  private readonly onGamepadDisconnected = (e: GamepadEvent): void => {
    if (this.gamepadIndex === e.gamepad.index) this.gamepadIndex = null;
  };

  private pollGamepad(): { move: { x: number; y: number }; look: { x: number; y: number } } | null {
    if (this.gamepadIndex === null || typeof navigator.getGamepads !== 'function') return null;
    const gp = navigator.getGamepads()[this.gamepadIndex];
    if (!gp) return null;
    const dz = (v: number) => (Math.abs(v) < 0.15 ? 0 : v);
    const lx = dz(gp.axes[0] ?? 0);
    const ly = dz(gp.axes[1] ?? 0);
    const rx = dz(gp.axes[2] ?? 0);
    const ry = dz(gp.axes[3] ?? 0);
    const interact = gp.buttons[0]?.pressed ?? false;
    const pause = gp.buttons[9]?.pressed ?? false;
    if (interact && !this.gamepadInteractWas) this.interactEdge = true;
    if (pause && !this.gamepadPauseWas) this.pauseEdge = true;
    this.gamepadInteractWas = interact;
    this.gamepadPauseWas = pause;
    this.keys.sprint = this.keys.sprint || (gp.buttons[10]?.pressed ?? false);
    if (lx !== 0 || ly !== 0 || rx !== 0 || ry !== 0 || interact) this.setMode('gamepad');
    return {
      move: { x: lx, y: -ly },
      look: { x: rx * this.gamepadLookSensitivity, y: ry * this.gamepadLookSensitivity },
    };
  }

  /* ----------------------------- XR / eksternal --------------------- */
  setExternalFrame(frame: Partial<InputFrame> | null): void {
    this.externalFrame = frame;
    if (frame) this.setMode('xr');
  }

  /* ----------------------------- frame ------------------------------ */
  consumeFrame(): InputFrame {
    const gp = this.pollGamepad();

    let mx = (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0);
    let my = (this.keys.forward ? 1 : 0) - (this.keys.back ? 1 : 0);
    if (mx === 0 && my === 0) {
      mx = this.touchMove.x;
      my = this.touchMove.y;
    }
    if (mx === 0 && my === 0 && gp) {
      mx = gp.move.x;
      my = gp.move.y;
    }
    const len = Math.hypot(mx, my);
    if (len > 1) {
      mx /= len;
      my /= len;
    }

    const interactHeld = this.keys.interact;
    if (interactHeld && !this.interactWasHeld) this.interactEdge = true;
    this.interactWasHeld = interactHeld;
    if (this.keys.pause && !this.pauseWasHeld) this.pauseEdge = true;
    this.pauseWasHeld = this.keys.pause;

    const frame: InputFrame = {
      move: { x: mx, y: my },
      look: { x: this.lookDx + (gp?.look.x ?? 0), y: this.lookDy + (gp?.look.y ?? 0) },
      interactPressed: this.interactEdge,
      interactHeld: interactHeld || this.touches.size > 0,
      sprint: this.keys.sprint,
      pausePressed: this.pauseEdge,
      mode: this.mode,
      pointerLocked: this.pointerLocked,
    };
    if (this.externalFrame) Object.assign(frame, this.externalFrame);

    this.lookDx = 0;
    this.lookDy = 0;
    this.interactEdge = false;
    this.pauseEdge = false;
    return frame;
  }

  private setMode(mode: InputMode): void {
    if (this.mode === mode) return;
    this.mode = mode;
    this.bus.emit('INPUT_MODE_CHANGED', { mode });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const el = this.element;
    el.removeEventListener('keydown', this.onKeyDown);
    el.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    window.removeEventListener('blur', this.onBlur);
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerUp);
    el.removeEventListener('contextmenu', this.onContextMenu);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
    window.removeEventListener('gamepadconnected', this.onGamepadConnected);
    window.removeEventListener('gamepaddisconnected', this.onGamepadDisconnected);
    this.exitPointerLock();
  }
}
