const ACCENTED: Record<string, string> = {
  a: 'áá', e: 'éé', i: 'íí', o: 'öö', u: 'úú', y: 'ýý',
  A: 'Å', E: 'É', I: 'Î', O: 'Ö', U: 'Û', c: 'ç', n: 'ñ', s: 'š', z: 'ž',
};

/**
 * QA locale: doubles vowels (+35-40% length, like German) and adds accents and brackets,
 * so truncation, overflow and hard-coded strings are visible at a glance. Placeholders stay intact.
 */
export function pseudoLocalize(text: string): string {
  const body = text.replace(/\{\w+\}|[A-Za-z]/g, (match) => (match.length > 1 ? match : (ACCENTED[match] ?? match)));
  return `[${body}]`;
}
