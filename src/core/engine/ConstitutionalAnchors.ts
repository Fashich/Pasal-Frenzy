/**
 * ConstitutionalAnchors — titik-titik stabil di ruang yang mempertahankan
 * geometri Euclidean (PRD/Dev Planning 03). Anchor = pasal fundamental yang
 * sudah solid; radiusnya mengikuti masteryLevel pasal tersebut.
 */
import { Vector3, type Camera } from 'three';
import { MAX_ANCHORS } from '@core/math/hyperbolic.ts';
import type { GlobalUniformSet } from './GlobalUniforms.ts';

export interface AnchorDef {
  id: string;
  position: Vector3;
  /** radius dasar (world units) */
  baseRadius: number;
  /** id pasal untuk mengambil mastery (opsional) */
  pasalId?: string;
}

const _view = new Vector3();

export class ConstitutionalAnchors {
  private readonly anchors = new Map<string, AnchorDef>();
  /** pengambil mastery 0..1 per pasal; default 0 */
  getMastery: (pasalId: string) => number = () => 0;

  add(def: AnchorDef): void {
    this.anchors.set(def.id, def);
  }

  remove(id: string): void {
    this.anchors.delete(id);
  }

  clear(): void {
    this.anchors.clear();
  }

  get size(): number {
    return this.anchors.size;
  }

  /** radius efektif: dasar × (0.5 + mastery), mastery 1 → 1.5× dasar */
  radiusOf(def: AnchorDef): number {
    const mastery = def.pasalId ? this.getMastery(def.pasalId) : 1;
    return def.baseRadius * (0.5 + Math.min(1, Math.max(0, mastery)));
  }

  /** mengunggah posisi anchor (view space) ke uniform; dipanggil tiap frame */
  upload(camera: Camera, uniforms: GlobalUniformSet): void {
    camera.updateMatrixWorld();
    let i = 0;
    for (const def of this.anchors.values()) {
      if (i >= MAX_ANCHORS) break;
      _view.copy(def.position).applyMatrix4(camera.matrixWorldInverse);
      const slot = uniforms.u_anchors.value[i];
      if (slot) slot.set(_view.x, _view.y, _view.z, this.radiusOf(def));
      i += 1;
    }
    uniforms.u_anchorCount.value = i;
  }

  /** daftar untuk cermin CPU (warpViewPosition) */
  toViewAnchors(camera: Camera): { x: number; y: number; z: number; r: number }[] {
    camera.updateMatrixWorld();
    const out: { x: number; y: number; z: number; r: number }[] = [];
    for (const def of this.anchors.values()) {
      if (out.length >= MAX_ANCHORS) break;
      _view.copy(def.position).applyMatrix4(camera.matrixWorldInverse);
      out.push({ x: _view.x, y: _view.y, z: _view.z, r: this.radiusOf(def) });
    }
    return out;
  }
}
