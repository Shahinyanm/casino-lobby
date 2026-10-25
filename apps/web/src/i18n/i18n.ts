import type { Locale } from '../app/preferences';
import { en, type MessageKey } from './en';
import { he } from './he';
import { pseudoLocalize } from './pseudo';

type PluralBase = MessageKey extends infer K ? (K extends `${infer Base}.other` ? Base : never) : never;
type ExtraPluralKey = `${PluralBase}.${'zero' | 'two' | 'few' | 'many'}`;

/** Every locale must define every English key; languages with more plural forms may add them. */
export type Messages = Record<MessageKey, string> & Partial<Record<ExtraPluralKey, string>>;
export type Params = Record<string, string | number>;

// Unicode isolates keep LTR names and amounts from scrambling punctuation inside RTL sentences.
const FSI = '\u2068';
const PDI = '\u2069';

let pseudoMessages: Messages | undefined;

function messagesFor(locale: Locale): Messages {
  if (locale === 'he') return he;
  if (locale === 'en') return en;

  pseudoMessages ??= Object.fromEntries(Object.entries(en).map(([k, v]) => [k, pseudoLocalize(v)])) as Messages;
  return pseudoMessages;
}

const RELATIVE_STEPS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['second', 60],
  ['minute', 60],
  ['hour', 24],
  ['day', 7],
  ['week', 4.35],
  ['month', 12],
  ['year', Infinity],
];

export function createI18n(locale: Locale) {
  const messages = messagesFor(locale);
  const intlLocale = locale === 'he' ? 'he-IL' : 'en-US';
  const dir: 'ltr' | 'rtl' = locale === 'he' ? 'rtl' : 'ltr';

  const numberFormat = new Intl.NumberFormat(intlLocale);
  const percentFormat = new Intl.NumberFormat(intlLocale, { style: 'percent', minimumFractionDigits: 2 });
  const dateFormat = new Intl.DateTimeFormat(intlLocale, { dateStyle: 'medium' });
  const relativeFormat = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' });
  const pluralRules = new Intl.PluralRules(intlLocale);
  const moneyFormats = new Map<string, Intl.NumberFormat>();

  const format = (template: string, params?: Params) =>
    params
      ? template.replace(/\{(\w+)\}/g, (match, name: string) => {
          const value = params[name];
          if (value === undefined) return match;

          const text = typeof value === 'number' ? numberFormat.format(value) : value;
          return dir === 'rtl' ? FSI + text + PDI : text;
        })
      : template;

  const t = (key: MessageKey, params?: Params) => format(messages[key], params);

  const plural = (base: PluralBase, count: number, params?: Params) => {
    const forms = messages as Partial<Record<string, string>>;
    const template = forms[`${base}.${pluralRules.select(count)}`] ?? messages[`${base}.other` as MessageKey];
    return format(template, { count, ...params });
  };

  /** `signed` puts the sign where the locale wants it, which a hand-written "+" gets wrong in RTL. */
  const money = (minor: number, currency: string, signed = false) => {
    const key = `${currency}:${signed}`;
    let formatter = moneyFormats.get(key);
    if (!formatter) {
      formatter = new Intl.NumberFormat(intlLocale, { style: 'currency', currency, signDisplay: signed ? 'always' : 'auto' });
      moneyFormats.set(key, formatter);
    }
    return formatter.format(minor / 100);
  };

  const relative = (iso: string, now: number) => {
    let value = (Date.parse(iso) - now) / 1000;

    for (const [unit, size] of RELATIVE_STEPS) {
      if (Math.abs(value) < size) return relativeFormat.format(Math.round(value), unit);
      value /= size;
    }
    return relativeFormat.format(Math.round(value), 'year');
  };

  return {
    locale,
    intlLocale,
    dir,
    t,
    plural,
    money,
    relative,
    number: (value: number) => numberFormat.format(value),
    percent: (value: number) => percentFormat.format(value / 100),
    date: (iso: string) => dateFormat.format(new Date(iso)),
  };
}

export type I18n = ReturnType<typeof createI18n>;
