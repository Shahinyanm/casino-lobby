import type { Game } from '@lobby/contracts';
import { createRng, hashString } from '../common/random';

/**
 * Generated cover art: deterministic per game, no binary assets, cacheable forever.
 * The title is rendered as text on the card, so the art carries no text of its own.
 */
export function renderThumbnail(game: Game): string {
  const rng = createRng(hashString(game.id));
  const hue = rng.int(0, 359);
  const hue2 = (hue + rng.int(40, 140)) % 360;
  const bg = `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="hsl(${hue} 70% 32%)"/>
      <stop offset="1" stop-color="hsl(${hue2} 75% 14%)"/>
    </linearGradient>
    <radialGradient id="r" cx="0.5" cy="0.45" r="0.6">
      <stop offset="0" stop-color="hsl(${hue2} 90% 70%)" stop-opacity="0.55"/>
      <stop offset="1" stop-color="hsl(${hue2} 90% 70%)" stop-opacity="0"/>
    </radialGradient>`;

  const sparkles = Array.from({ length: 14 }, () => {
    const r = rng.int(1, 4);
    return `<circle cx="${rng.int(0, 400)}" cy="${rng.int(0, 300)}" r="${r}" fill="white" opacity="${(rng.next() * 0.5 + 0.15).toFixed(2)}"/>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="400" height="300">
  <defs>${bg}</defs>
  <rect width="400" height="300" fill="url(#g)"/>
  <rect width="400" height="300" fill="url(#r)"/>
  ${sparkles}
  ${motif(game.category, hue, hue2)}
</svg>`;
}

function motif(category: Game['category'], hue: number, hue2: number): string {
  const stroke = `hsl(${hue} 95% 82%)`;

  if (category === 'slots') {
    const reels = [95, 165, 235]
      .map(
        (x, i) => `<rect x="${x}" y="95" width="70" height="110" rx="14" fill="hsl(${hue2} 40% 96% / 0.14)" stroke="${stroke}" stroke-width="3"/>
        <circle cx="${x + 35}" cy="150" r="${16 + i * 3}" fill="hsl(${(hue + i * 50) % 360} 90% 65%)"/>`,
      )
      .join('');
    return reels;
  }

  if (category === 'table') {
    const spokes = Array.from({ length: 12 }, (_, i) => {
      const a = (i * Math.PI) / 6;
      return `<line x1="${200 + Math.cos(a) * 34}" y1="${150 + Math.sin(a) * 34}" x2="${200 + Math.cos(a) * 82}" y2="${150 + Math.sin(a) * 82}" stroke="${stroke}" stroke-width="3"/>`;
    }).join('');
    return `<circle cx="200" cy="150" r="88" fill="none" stroke="${stroke}" stroke-width="6"/>
      <circle cx="200" cy="150" r="34" fill="hsl(${hue2} 80% 60%)"/>${spokes}`;
  }

  return `<circle cx="200" cy="150" r="92" fill="none" stroke="${stroke}" stroke-width="2" opacity="0.5"/>
    <circle cx="200" cy="150" r="66" fill="none" stroke="${stroke}" stroke-width="4" opacity="0.8"/>
    <circle cx="200" cy="150" r="38" fill="hsl(0 85% 58%)"/>
    <circle cx="200" cy="150" r="14" fill="white" opacity="0.9"/>`;
}
