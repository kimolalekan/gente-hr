/**
 * WCAG 2.1 contrast helpers used by the theme editor's automated contrast
 * check (AA = 4.5:1 for normal text, AAA = 7:1).
 */
import type { ThemePalette, ThemeVar } from './themes';

export interface ContrastPair {
  label: string;
  fg: ThemeVar;
  bg: ThemeVar;
}

export const CONTRAST_PAIRS: ContrastPair[] = [
  { label: 'Primary text on Primary', fg: 'primary-foreground', bg: 'primary' },
  { label: 'Main text on Background', fg: 'foreground', bg: 'background' },
  { label: 'Muted text on Background', fg: 'muted-foreground', bg: 'background' },
  { label: 'Text on Card', fg: 'card-foreground', bg: 'card' },
  { label: 'Text on Popover', fg: 'popover-foreground', bg: 'popover' },
  { label: 'Destructive on Background', fg: 'destructive', bg: 'background' },
  { label: 'Success on Background', fg: 'success', bg: 'background' },
  { label: 'Warning on Background', fg: 'warning', bg: 'background' },
  { label: 'Info on Background', fg: 'info', bg: 'background' },
];

export interface ContrastEvaluation extends ContrastPair {
  ratio: number | null;
  status: { pass: boolean; label: 'AA' | 'AAA' | 'Fail' } | null;
}

function hexToRgb(hex: string): [number, number, number] | null {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3 ? cleaned.split('').map((c) => c + c).join('') : cleaned;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

function luminance(rgb: [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio between two hex colors, or null when either is invalid. */
export function contrastRatio(a: string, b: string): number | null {
  const ca = hexToRgb(a);
  const cb = hexToRgb(b);
  if (!ca || !cb) return null;
  const la = luminance(ca);
  const lb = luminance(cb);
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

export function contrastStatus(ratio: number): { pass: boolean; label: 'AA' | 'AAA' | 'Fail' } {
  if (ratio >= 7) return { pass: true, label: 'AAA' };
  if (ratio >= 4.5) return { pass: true, label: 'AA' };
  return { pass: false, label: 'Fail' };
}

export function formatRatio(ratio: number): string {
  return `${ratio.toFixed(2)}:1`;
}

export function evaluatePairs(palette: ThemePalette): ContrastEvaluation[] {
  return CONTRAST_PAIRS.map((pair) => {
    const ratio = contrastRatio(palette[pair.fg], palette[pair.bg]);
    return {
      ...pair,
      ratio,
      status: ratio === null ? null : contrastStatus(ratio),
    };
  });
}
