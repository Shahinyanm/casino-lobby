import { Controller, Get, Query, UseInterceptors } from '@nestjs/common';
import type { Promotion } from '@lobby/contracts';
import { MockLatency } from '../common/mock-latency.interceptor';

type Copy = Pick<Promotion, 'title' | 'description' | 'cta'>;
type PromotionSeed = Omit<Promotion, 'title' | 'description' | 'cta' | 'endsAt'> & {
  daysLeft: number;
  copy: Record<'en' | 'he', Copy>;
};

// Stands in for a CMS: promo copy is content, so it arrives localized from the server, not from the UI dictionary.
const PROMOTIONS: PromotionSeed[] = [
  {
    id: 'jackpot-week',
    href: '/?tag=jackpot',
    hue: 42,
    daysLeft: 4,
    copy: {
      en: { title: 'Jackpot Week', description: 'Every jackpot slot adds a 10% boost to wins until Sunday.', cta: 'Play jackpots' },
      he: { title: "שבוע הג'קפוט", description: "כל סלוטי הג'קפוט מוסיפים 10% לזכיות עד יום ראשון.", cta: "לסלוטי הג'קפוט" },
    },
  },
  {
    id: 'live-cashback',
    href: '/?category=live',
    hue: 350,
    daysLeft: 2,
    copy: {
      en: { title: 'Live Friday Cashback', description: 'Get 15% back on live table losses, paid every Monday.', cta: 'Go live' },
      he: { title: 'קאשבק לייב בשישי', description: 'מקבלים 15% החזר על הפסדים בשולחנות לייב, בכל יום שני.', cta: 'למשחקי לייב' },
    },
  },
  {
    id: 'bonus-buy',
    href: '/?tag=bonus-buy&sort=new',
    hue: 280,
    daysLeft: 9,
    copy: {
      en: { title: 'Bonus Buy Bonanza', description: 'Fresh bonus-buy releases with free-spin features.', cta: 'See new releases' },
      he: { title: 'חגיגת Bonus Buy', description: 'משחקי Bonus Buy חדשים עם סיבובי חינם.', cta: 'למשחקים החדשים' },
    },
  },
  {
    id: 'neon-owl-tournament',
    href: '/?provider=neon-owl',
    hue: 190,
    daysLeft: 6,
    copy: {
      en: { title: 'Neon Owl Tournament', description: 'Climb the leaderboard on any Neon Owl slot. $50,000 prize pool.', cta: 'Join the tournament' },
      he: { title: 'טורניר Neon Owl', description: 'מטפסים בטבלה בכל סלוט של Neon Owl. פרסים בשווי 50,000 דולר.', cta: 'להצטרפות לטורניר' },
    },
  },
  {
    id: 'best-odds',
    href: '/?category=table&sort=rtp',
    hue: 150,
    daysLeft: 30,
    copy: {
      en: { title: 'Best Odds Club', description: 'Table games with RTP above 98%, sorted for you.', cta: 'Browse tables' },
      he: { title: 'מועדון הסיכויים', description: 'משחקי שולחן עם RTP מעל 98%, ממוינים בשבילכם.', cta: 'לשולחנות' },
    },
  },
  {
    id: 'megaways-marathon',
    href: '/?tag=megaways',
    hue: 220,
    daysLeft: 3,
    copy: {
      en: { title: 'Megaways Marathon', description: '200 free spins across Megaways titles this weekend.', cta: 'Spin Megaways' },
      he: { title: 'מרתון Megaways', description: '200 סיבובי חינם במשחקי Megaways בסוף השבוע.', cta: 'למשחקי Megaways' },
    },
  },
];

const DAY_MS = 86_400_000;

@Controller('promotions')
export class PromotionsController {
  @Get()
  @UseInterceptors(new MockLatency(400, 1000))
  list(@Query('locale') locale?: string): Promotion[] {
    const lang = locale === 'he' ? 'he' : 'en';

    return PROMOTIONS.map(({ copy, daysLeft, ...rest }) => ({
      ...rest,
      ...copy[lang],
      endsAt: new Date(Date.now() + daysLeft * DAY_MS).toISOString(),
    }));
  }
}
