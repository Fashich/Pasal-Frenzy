/**
 * Deklarasi tipe minimal untuk troika-three-text (paket tidak menyertakan .d.ts).
 * Hanya anggota yang dipakai proyek ini.
 */
declare module 'troika-three-text' {
  import type { Material, Mesh } from 'three';

  export class Text extends Mesh {
    text: string;
    font: string | null;
    fontSize: number;
    color: number | string;
    anchorX: number | 'left' | 'center' | 'right' | string;
    anchorY: number | 'top' | 'top-baseline' | 'middle' | 'bottom-baseline' | 'bottom' | string;
    maxWidth: number;
    textAlign: 'left' | 'right' | 'center' | 'justify';
    letterSpacing: number;
    lineHeight: number | 'normal';
    outlineWidth: number | string;
    outlineColor: number | string;
    outlineBlur: number | string;
    fillOpacity: number;
    material: Material & { opacity: number; transparent: boolean; depthWrite: boolean };
    sync(callback?: () => void): void;
    dispose(): void;
  }

  export function preloadFont(
    options: { font?: string; characters?: string; sdfGlyphSize?: number },
    callback: () => void,
  ): void;
}
