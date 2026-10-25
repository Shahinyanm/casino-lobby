import type { Category, Game, GameTag, Provider } from '@lobby/contracts';
import { createRng, type Rng } from '../common/random';

// Fictional studios: a mock should not borrow real trademarks.
export const PROVIDERS: Provider[] = [
  { id: 'aurora-forge', name: 'Aurora Forge' },
  { id: 'blackbird', name: 'Blackbird Gaming' },
  { id: 'copperline', name: 'Copperline' },
  { id: 'kite-and-key', name: 'Kite & Key' },
  { id: 'mosaic-labs', name: 'Mosaic Labs' },
  { id: 'neon-owl', name: 'Neon Owl' },
  { id: 'tidewater', name: 'Tidewater Studios' },
  { id: 'velvet-rope', name: 'Velvet Rope Live' },
];

const SLOT_ADJECTIVES = [
  'Golden', 'Neon', 'Wild', 'Lucky', 'Mystic', 'Frozen', 'Royal', 'Midnight', 'Crimson', 'Electric',
  'Ancient', 'Cosmic', 'Jade', 'Thunder', 'Sugar', "Pirate's", "Dragon's", 'Viking', 'Velvet', 'Solar',
];
const SLOT_NOUNS = [
  'Pharaoh', 'Reels', 'Fortune', 'Bandit', 'Orchard', 'Tiger', 'Vault', 'Lantern', 'Rush', 'Empire',
  'Gems', 'Wolf', 'Phoenix', 'Harbor', 'Bonanza', 'Spins', 'Oasis', 'Comet', 'Koi', 'Crown',
];
const TABLE_TITLES = [
  'European Roulette', 'American Roulette', 'French Roulette', 'Double Ball Roulette', 'Blackjack Classic',
  'Blackjack Switch', 'Multi-hand Blackjack', 'Baccarat Squeeze', 'Mini Baccarat', 'Punto Banco',
  "Casino Hold'em", 'Three Card Poker', 'Caribbean Stud', 'Pai Gow Poker', 'Texas Bonus Poker',
  'Sic Bo', 'Craps', 'Red Dog', 'Dragon Tiger', 'Teen Patti', 'Andar Bahar', 'Oasis Poker',
];
const LIVE_TITLES = [
  'Live Roulette', 'Live Speed Roulette', 'Live Auto Roulette', 'Live Immersive Roulette', 'Live Blackjack VIP',
  'Live Blackjack Party', 'Live Infinite Blackjack', 'Live Baccarat', 'Live Speed Baccarat', 'Live Dragon Tiger',
  'Live Sic Bo', "Live Casino Hold'em", 'Live Money Wheel', 'Live Football Studio', 'Live Craps',
  'Live Andar Bahar', 'Live Teen Patti', 'Live Lucky Seven',
];

const SLOT_COUNT = 60;
const SLOT_TAGS: GameTag[] = ['jackpot', 'megaways', 'bonus-buy', 'hot', 'classic', 'high-volatility'];
const TABLE_TAGS: GameTag[] = ['classic', 'low-stakes', 'vip', 'hot'];
const LIVE_TAGS: GameTag[] = ['vip', 'low-stakes', 'hot'];

const PROVIDERS_BY_CATEGORY: Record<Category, string[]> = {
  slots: ['aurora-forge', 'blackbird', 'copperline', 'kite-and-key', 'mosaic-labs', 'neon-owl', 'tidewater'],
  table: ['blackbird', 'copperline', 'kite-and-key', 'mosaic-labs'],
  live: ['velvet-rope', 'mosaic-labs', 'aurora-forge'],
};

const DAY_MS = 86_400_000;
// Release dates count back from today (UTC midnight), so the "New" badge never runs out on a
// demo opened next month. Ids and order come from the seed and stay stable between restarts.
const CATALOG_EPOCH = new Date().setUTCHours(0, 0, 0, 0);

const slug = (title: string) =>
  title
    .toLowerCase()
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

const round2 = (value: number) => Math.round(value * 100) / 100;

function slotTitles(rng: Rng): string[] {
  const titles = new Set<string>();
  while (titles.size < SLOT_COUNT) titles.add(`${rng.pick(SLOT_ADJECTIVES)} ${rng.pick(SLOT_NOUNS)}`);
  return [...titles];
}

function makeGame(rng: Rng, title: string, category: Category): Game {
  const id = slug(title);
  const tagPool = category === 'slots' ? SLOT_TAGS : category === 'table' ? TABLE_TAGS : LIVE_TAGS;
  const rtpRange = category === 'slots' ? [94, 97.5] : category === 'table' ? [97, 99.5] : [95.5, 99.2];
  const minBetMinor = category === 'slots' ? rng.pick([10, 20, 25, 50]) : rng.pick([100, 200, 500, 1000, 2500]);
  const maxBetMinor = category === 'slots' ? rng.pick([5_000, 10_000, 25_000, 50_000]) : rng.pick([200_000, 500_000, 2_500_000]);
  // A handful of fresh releases so "New releases" has an obvious top.
  const ageDays = rng.next() < 0.1 ? rng.int(1, 30) : rng.int(31, 3 * 365);
  const [rtpMin = 0, rtpMax = 0] = rtpRange;

  return {
    id,
    title,
    providerId: rng.pick(PROVIDERS_BY_CATEGORY[category]),
    category,
    tags: rng.sample(tagPool, rng.int(1, category === 'slots' ? 3 : 2)),
    rtp: round2(rtpMin + rng.next() * (rtpMax - rtpMin)),
    minBetMinor,
    maxBetMinor,
    popularity: rng.int(1, 100),
    releasedAt: new Date(CATALOG_EPOCH - ageDays * DAY_MS).toISOString().slice(0, 10),
    thumbnailUrl: `/api/thumbs/${id}.svg`,
  };
}

export function generateCatalog(seed = 7): Game[] {
  const rng = createRng(seed);

  return [
    ...slotTitles(rng).map((title) => makeGame(rng, title, 'slots')),
    ...TABLE_TITLES.map((title) => makeGame(rng, title, 'table')),
    ...LIVE_TITLES.map((title) => makeGame(rng, title, 'live')),
  ];
}
