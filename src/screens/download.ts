/**
 * Menyimpan berkas teks ke perangkat pengguna.
 * Web: Blob + tautan unduh. Electron/Capacitor: jembatan diisi lewat
 * window.pasalFrenzyBridge (feature/17-18); jika ada, dipakai lebih dulu.
 */
export interface NativeBridge {
  saveTextFile?: (name: string, content: string, mime: string) => Promise<boolean>;
}

declare global {
  interface Window {
    pasalFrenzyBridge?: NativeBridge;
  }
}

export async function downloadTextFile(name: string, content: string, mime: string): Promise<void> {
  const bridge = window.pasalFrenzyBridge;
  if (bridge?.saveTextFile) {
    const ok = await bridge.saveTextFile(name, content, mime);
    if (ok) return;
  }
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
