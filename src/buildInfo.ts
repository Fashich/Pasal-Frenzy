/**
 * Informasi build yang aman dipakai di main thread maupun Web Worker.
 * Memakai import.meta.env (diganti statis oleh Vite di dev dan build),
 * bukan `define` global yang di mode dev hanya disuntik lewat klien HMR.
 */
import { version } from '../package.json';

export type BuildTarget = 'dev' | 'pages' | 'app';

const rawTarget = import.meta.env.VITE_TARGET;
export const BUILD_TARGET: BuildTarget =
  rawTarget === 'pages' || rawTarget === 'app' ? rawTarget : 'dev';

export const APP_VERSION: string = version;

/** true saat berjalan di Electron/Capacitor (aset lokal, tanpa service worker) */
export const IS_APP_BUILD = BUILD_TARGET === 'app';
