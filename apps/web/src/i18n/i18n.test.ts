import { describe, expect, it } from 'vitest';
import { en } from './en';
import { he } from './he';
import { createI18n } from './i18n';
import { pseudoLocalize } from './pseudo';

const FSI = '\u2068';
const PDI = '\u2069';

describe('createI18n', () => {
  it('interpolates params and formats numbers', () => {
    const { t, plural } = createI18n('en');

    expect(t('game.favorite', { title: 'Golden Reels' })).toBe('Favorite Golden Reels');
    expect(plural('catalog.results', 1)).toBe('1 game');
    expect(plural('catalog.results', 1234)).toBe('1,234 games');
  });

  it('uses Hebrew dual forms and isolates LTR params inside RTL text', () => {
    const { t, plural, dir } = createI18n('he');

    expect(dir).toBe('rtl');
    expect(plural('catalog.results', 2)).toBe('שני משחקים');
    expect(plural('catalog.results', 7)).toBe(`${FSI}7${PDI} משחקים`);
    expect(t('game.favorite', { title: 'Golden Reels' })).toBe(`מועדף: ${FSI}Golden Reels${PDI}`);
  });

  it('formats money from minor units', () => {
    expect(createI18n('en').money(123456, 'USD')).toBe('$1,234.56');
  });

  it('formats relative time in both directions', () => {
    const now = Date.parse('2026-10-22T12:00:00Z');
    const { relative } = createI18n('en');

    expect(relative('2026-10-22T11:59:30Z', now)).toBe('30 seconds ago');
    expect(relative('2026-10-26T12:00:00Z', now)).toBe('in 4 days');
  });

  it('has no Hebrew string left untranslated by accident', () => {
    const sameAsEnglish = Object.keys(en).filter(
      (key) => he[key as keyof typeof en] === en[key as keyof typeof en] && !/^(app\.name|lang\.|header\.shortcut|tag\.(megaways|vip)|game\.rtp|deposit\.rate|slot\.(title|combo))/.test(key),
    );

    expect(sameAsEnglish).toEqual([]);
  });
});

describe('pseudoLocalize', () => {
  it('keeps placeholders and makes text visibly longer', () => {
    const result = pseudoLocalize('Add {title} to favorites');

    expect(result).toContain('{title}');
    expect(result.length).toBeGreaterThan('Add {title} to favorites'.length * 1.2);
  });
});
