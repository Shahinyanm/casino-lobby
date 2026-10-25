export interface FuzzyMatch {
  score: number;
  /** Matched positions in `Array.from(text)`, for highlighting */
  indices: number[];
}

// One folded char per original char, so indices stay valid for highlighting: "É" -> "e".
const fold = (text: string) => Array.from(text, (ch) => (ch.normalize('NFD')[0] ?? ch).toLowerCase());

const isWordStart = (chars: string[], i: number) => i === 0 || /[\s\-_'&]/.test(chars[i - 1] ?? '');

const SCORE = {
  char: 10,
  consecutive: 10,
  wordStart: 12,
  prefix: 15,
  substring: 35,
  exact: 100,
  gapPerChar: -2,
  lengthPerChar: -0.2,
} as const;

/** Contiguous occurrence of the query, preferring one that starts a word. */
function findSubstring(hay: string[], needle: string[]): number[] | null {
  const text = hay.join('');
  const query = needle.join('');
  let best = -1;

  for (let at = text.indexOf(query); at !== -1; at = text.indexOf(query, at + 1)) {
    if (best === -1) best = at;
    if (isWordStart(hay, at)) {
      best = at;
      break;
    }
  }

  return best === -1 ? null : needle.map((_, i) => best + i);
}

/**
 * Subsequence pick: continue the current run, else jump to the next word start, else the next occurrence.
 * Jumping can skip letters a later char needs ("sgr" in "Sugar Gems"), so the caller retries without it.
 */
function findSubsequence(hay: string[], needle: string[], jumpToWordStarts = true): number[] | null {
  const indices: number[] = [];
  let position = 0;

  for (const ch of needle) {
    const previous = indices.at(-1);
    let found = previous !== undefined && hay[previous + 1] === ch ? previous + 1 : -1;

    for (let i = position; found === -1 && i < hay.length; i++) {
      if (hay[i] !== ch) continue;
      const nextWordStart = jumpToWordStarts ? hay.findIndex((c, j) => j >= i && c === ch && isWordStart(hay, j)) : -1;
      found = nextWordStart === -1 ? i : nextWordStart;
    }

    if (found === -1) return null;
    indices.push(found);
    position = found + 1;
  }

  return indices;
}

/**
 * Ranking for the command palette. A contiguous hit beats any scattered one; inside each kind,
 * runs, word starts and prefixes score up, gaps and long text score down. Query spaces are ignored,
 * so "gold koi" finds "Golden Koi".
 */
export function fuzzyMatch(query: string, text: string): FuzzyMatch | null {
  const needle = fold(query).filter((ch) => !/\s/.test(ch));
  if (!needle.length) return { score: 0, indices: [] };

  const hay = fold(text);
  const substring = findSubstring(hay, needle);
  const indices = substring ?? findSubsequence(hay, needle) ?? findSubsequence(hay, needle, false);
  if (!indices) return null;

  let score = substring ? SCORE.substring : 0;
  indices.forEach((index, n) => {
    const previous = indices[n - 1];
    score += SCORE.char;
    if (previous !== undefined && index === previous + 1) score += SCORE.consecutive;
    if (previous !== undefined && index > previous + 1) score += SCORE.gapPerChar * (index - previous - 1);
    if (isWordStart(hay, index)) score += SCORE.wordStart;
  });

  if (indices[0] === 0) score += SCORE.prefix;
  if (hay.join('') === needle.join('')) score += SCORE.exact;
  score += SCORE.lengthPerChar * (hay.length - needle.length);

  return { score, indices };
}
