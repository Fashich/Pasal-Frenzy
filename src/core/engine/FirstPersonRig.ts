/**
 * FirstPersonRig — rig kamera orang pertama: yaw (badan) → pitch (kepala) → kamera.
 * Gerak di bidang XZ; tabrakan diserahkan ke bab lewat `resolveMove`.
 */
import { MathUtils, Object3D, Vector3, type PerspectiveCamera } from 'three';
import type { InputFrame } from '@core/input/InputManager.ts';

export interface RigOptions {
  eyeHeight?: number;
  walkSpeed?: number;
  sprintSpeed?: number;
  /** batas pitch (radian) */
  maxPitch?: number;
  /** fungsi tabrakan: menerima posisi awal & tujuan (world), mengembalikan posisi final */
  resolveMove?: (from: Vector3, to: Vector3) => Vector3;
  headBob?: boolean;
}

const _forward = new Vector3();
const _right = new Vector3();
const _target = new Vector3();

export class FirstPersonRig {
  readonly yawObject = new Object3D();
  readonly pitchObject = new Object3D();
  readonly camera: PerspectiveCamera;
  eyeHeight: number;
  walkSpeed: number;
  sprintSpeed: number;
  maxPitch: number;
  headBob: boolean;
  resolveMove: ((from: Vector3, to: Vector3) => Vector3) | null;
  /** kecepatan aktual (units/s), dipakai audio langkah dan bob */
  speed = 0;
  private bobPhase = 0;
  private readonly velocity = new Vector3();

  constructor(camera: PerspectiveCamera, options: RigOptions = {}) {
    this.camera = camera;
    this.eyeHeight = options.eyeHeight ?? 1.7;
    this.walkSpeed = options.walkSpeed ?? 4;
    this.sprintSpeed = options.sprintSpeed ?? 7;
    this.maxPitch = options.maxPitch ?? MathUtils.degToRad(85);
    this.headBob = options.headBob ?? true;
    this.resolveMove = options.resolveMove ?? null;
    this.yawObject.add(this.pitchObject);
    this.pitchObject.add(camera);
    camera.position.set(0, 0, 0);
    camera.rotation.set(0, 0, 0);
    this.pitchObject.position.y = this.eyeHeight;
  }

  get position(): Vector3 {
    return this.yawObject.position;
  }

  get yaw(): number {
    return this.yawObject.rotation.y;
  }

  get pitch(): number {
    return this.pitchObject.rotation.x;
  }

  setPose(x: number, z: number, yaw = 0, pitch = 0): void {
    this.yawObject.position.set(x, 0, z);
    this.yawObject.rotation.y = yaw;
    this.pitchObject.rotation.x = MathUtils.clamp(pitch, -this.maxPitch, this.maxPitch);
  }

  update(dt: number, input: InputFrame): void {
    this.yawObject.rotation.y -= input.look.x;
    this.pitchObject.rotation.x = MathUtils.clamp(
      this.pitchObject.rotation.x - input.look.y,
      -this.maxPitch,
      this.maxPitch,
    );

    const targetSpeed = input.sprint ? this.sprintSpeed : this.walkSpeed;
    _forward.set(0, 0, -1).applyQuaternion(this.yawObject.quaternion);
    _right.set(1, 0, 0).applyQuaternion(this.yawObject.quaternion);

    const desired = _target
      .set(0, 0, 0)
      .addScaledVector(_forward, input.move.y)
      .addScaledVector(_right, input.move.x)
      .multiplyScalar(targetSpeed);

    // percepatan/perlambatan halus agar terasa berbobot
    const accel = desired.lengthSq() > 0 ? 12 : 16;
    this.velocity.lerp(desired, 1 - Math.exp(-accel * dt));
    this.speed = this.velocity.length();

    if (this.speed > 0.001) {
      const from = this.yawObject.position.clone();
      const to = from.clone().addScaledVector(this.velocity, dt);
      this.yawObject.position.copy(this.resolveMove ? this.resolveMove(from, to) : to);
    }

    if (this.headBob) {
      const amount = Math.min(this.speed / this.walkSpeed, 1);
      this.bobPhase += dt * (6 + amount * 4) * amount;
      this.pitchObject.position.y = this.eyeHeight + Math.sin(this.bobPhase) * 0.035 * amount;
    } else {
      this.pitchObject.position.y = this.eyeHeight;
    }
  }
}
