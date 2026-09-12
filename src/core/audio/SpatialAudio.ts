/**
 * SpatialAudio — sumber suara 3D dengan PannerNode model HRTF (PRD Bagian XIII).
 * Posisi diperbarui tiap frame dari posisi dunia Three.js; pemain bisa
 * "menutup mata" dan tetap tahu arah ancaman.
 */

export interface SpatialSourceOptions {
  refDistance?: number;
  maxDistance?: number;
  rolloffFactor?: number;
  /** 'HRTF' (default) atau 'equalpower' untuk perangkat lemah */
  panningModel?: PanningModelType;
}

export class SpatialSource {
  readonly panner: PannerNode;
  readonly gain: GainNode;
  readonly input: AudioNode;
  private readonly context: BaseAudioContext;
  private disposed = false;

  constructor(
    context: BaseAudioContext,
    destination: AudioNode,
    options: SpatialSourceOptions = {},
  ) {
    this.context = context;
    this.panner = context.createPanner();
    this.panner.panningModel = options.panningModel ?? 'HRTF';
    this.panner.distanceModel = 'inverse';
    this.panner.refDistance = options.refDistance ?? 1.5;
    this.panner.maxDistance = options.maxDistance ?? 80;
    this.panner.rolloffFactor = options.rolloffFactor ?? 1.1;
    this.panner.coneInnerAngle = 360;
    this.gain = context.createGain();
    this.gain.gain.value = 1;
    this.gain.connect(this.panner);
    this.panner.connect(destination);
    this.input = this.gain;
  }

  setPosition(x: number, y: number, z: number): void {
    if (this.disposed) return;
    const t = this.context.currentTime;
    const p = this.panner;
    if (p.positionX) {
      p.positionX.setTargetAtTime(x, t, 0.02);
      p.positionY.setTargetAtTime(y, t, 0.02);
      p.positionZ.setTargetAtTime(z, t, 0.02);
    } else {
      p.setPosition(x, y, z);
    }
  }

  setGain(v: number, timeConstant = 0.05): void {
    if (this.disposed) return;
    this.gain.gain.setTargetAtTime(Math.max(0, v), this.context.currentTime, timeConstant);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try {
      this.gain.disconnect();
      this.panner.disconnect();
    } catch {
      /* sudah terputus */
    }
  }
}

/** memperbarui posisi & orientasi listener dari matriks kamera (world) */
export function updateListenerFromCamera(
  context: BaseAudioContext,
  position: { x: number; y: number; z: number },
  forward: { x: number; y: number; z: number },
  up: { x: number; y: number; z: number },
): void {
  const l = context.listener;
  const t = context.currentTime;
  if (l.positionX) {
    l.positionX.setTargetAtTime(position.x, t, 0.02);
    l.positionY.setTargetAtTime(position.y, t, 0.02);
    l.positionZ.setTargetAtTime(position.z, t, 0.02);
    l.forwardX.setTargetAtTime(forward.x, t, 0.02);
    l.forwardY.setTargetAtTime(forward.y, t, 0.02);
    l.forwardZ.setTargetAtTime(forward.z, t, 0.02);
    l.upX.setTargetAtTime(up.x, t, 0.02);
    l.upY.setTargetAtTime(up.y, t, 0.02);
    l.upZ.setTargetAtTime(up.z, t, 0.02);
  } else {
    l.setPosition(position.x, position.y, position.z);
    l.setOrientation(forward.x, forward.y, forward.z, up.x, up.y, up.z);
  }
}
