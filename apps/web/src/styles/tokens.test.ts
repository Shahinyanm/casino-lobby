import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Proves WCAG AA for the real tokens.css in both themes and for every accent hue a player can pick.
 * Out-of-gamut colors are clipped per channel, the cruder of the two things a browser may do.
 */

type Oklch = { l: number; c: number; h: number | 'accent' };

const css = readFileSync(new URL('./tokens.css', import.meta.url), 'utf8');

function themeTokens(selector: string): Map<string, Oklch> {
  const start = css.indexOf(selector);
  const block = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start));
  const tokens = new Map<string, Oklch>();

  // Opaque colors only: `oklch(L C H)` where H may be var(--accent-h).
  for (const [, name, l, c, h] of block.matchAll(/--([\w-]+):\s*oklch\(([\d.]+) ([\d.]+) ([\d.]+|var\(--accent-h\))\)/g)) {
    tokens.set(name ?? '', { l: Number(l), c: Number(c), h: h?.startsWith('var') ? 'accent' : Number(h) });
  }

  return tokens;
}

function luminance({ l, c, h }: Oklch, accentHue: number): number {
  const rad = ((h === 'accent' ? accentHue : h) * Math.PI) / 180;
  const a = c * Math.cos(rad);
  const b = c * Math.sin(rad);
  const lms = [
    (l + 0.3963377774 * a + 0.2158037573 * b) ** 3,
    (l - 0.1055613458 * a - 0.0638541728 * b) ** 3,
    (l - 0.0894841775 * a - 1.291485548 * b) ** 3,
  ] as const;
  const clip = (v: number) => Math.min(1, Math.max(0, v));
  const r = clip(4.0767416621 * lms[0] - 3.3077115913 * lms[1] + 0.2309699292 * lms[2]);
  const g = clip(-1.2684380046 * lms[0] + 2.6097574011 * lms[1] - 0.3413193965 * lms[2]);
  const bl = clip(-0.0041960863 * lms[0] - 0.7034186147 * lms[1] + 1.707614701 * lms[2]);

  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

const contrast = (y1: number, y2: number) => (Math.max(y1, y2) + 0.05) / (Math.min(y1, y2) + 0.05);

const TEXT_PAIRS: [string, string][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surface-2'],
  ['text-muted', 'bg'],
  ['text-muted', 'surface'],
  ['text-muted', 'surface-2'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accent', 'surface-2'],
  ['on-accent', 'accent'],
  ['on-accent', 'accent-hover'],
  ['positive', 'surface'],
  ['positive', 'surface-2'],
  ['danger', 'surface'],
  ['danger', 'bg'],
];

// WCAG 1.4.11: outlines that identify a control need 3:1.
const UI_PAIRS: [string, string][] = [
  ['border-strong', 'bg'],
  ['border-strong', 'surface'],
  ['live', 'surface'],
];

const HUES = Array.from({ length: 36 }, (_, i) => i * 10);

describe.each([
  ['dark', ":root[data-theme='dark']"],
  ['light', ":root[data-theme='light']"],
])('%s theme tokens', (_theme, selector) => {
  const tokens = themeTokens(selector);

  const worst = (pairs: [string, string][]) =>
    pairs.flatMap(([fg, bg]) =>
      HUES.map((hue) => {
        const a = tokens.get(fg);
        const b = tokens.get(bg);
        if (!a || !b) throw new Error(`Missing token ${a ? bg : fg}`);
        return { pair: `${fg} on ${bg} @hue ${hue}`, ratio: contrast(luminance(a, hue), luminance(b, hue)) };
      }),
    );

  it('text pairs reach 4.5:1 for every accent hue', () => {
    const failing = worst(TEXT_PAIRS).filter((r) => r.ratio < 4.5);
    expect(failing).toEqual([]);
  });

  it('control outlines reach 3:1', () => {
    const failing = worst(UI_PAIRS).filter((r) => r.ratio < 3);
    expect(failing).toEqual([]);
  });
});
