/**
 * TypographyRenderer — gaya teks kata fisika (Dev Planning 05 #2).
 * Font JetBrains Mono (feel dokumen legal); warna: biru = konstitusional solid,
 * merah = antagonis, abu = netral, emas = pencapaian (PRD Bagian XIV).
 */
export type WordKind = 'pasal' | 'antagonis' | 'netral' | 'emas';

export interface WordStyle {
  fontFamily: string;
  fontSize: string;
  fontStyle: string;
  color: string;
  stroke: string;
  strokeThickness: number;
  padding: { x: number; y: number };
  /** warna cahaya (shadow) */
  glow: string;
}

export const WORD_COLORS: Record<WordKind, { fill: string; stroke: string; glow: string }> = {
  pasal: { fill: '#dbe7ff', stroke: '#1e3a8a', glow: '#3b82f6' },
  antagonis: { fill: '#ffe4e4', stroke: '#7f1d1d', glow: '#dc2626' },
  netral: { fill: '#d1d5db', stroke: '#374151', glow: '#6b7280' },
  emas: { fill: '#fff4cc', stroke: '#7a5a00', glow: '#d4a017' },
};

export function typographyStyle(kind: WordKind, fontSizePx: number): WordStyle {
  const c = WORD_COLORS[kind];
  return {
    fontFamily: '"JetBrains Mono", ui-monospace, Consolas, monospace',
    fontSize: `${Math.round(fontSizePx)}px`,
    fontStyle: kind === 'netral' ? '400' : '700',
    color: c.fill,
    stroke: c.stroke,
    strokeThickness: Math.max(2, Math.round(fontSizePx / 9)),
    padding: { x: 4, y: 2 },
    glow: c.glow,
  };
}
