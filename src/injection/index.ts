import { normalizeInjectionText } from "./normalize.js";
import { EN_PATTERNS } from "./en.js";
import { CS_PATTERNS } from "./cs.js";
import { SK_PATTERNS } from "./sk.js";
import { DE_PATTERNS } from "./de.js";
import { PL_PATTERNS } from "./pl.js";
import { FR_PATTERNS } from "./fr.js";
import { ES_PATTERNS } from "./es.js";
export { wordStart, wordEnd, type PatternSet } from "./pattern.js";
export { normalizeInjectionText } from "./normalize.js";

export type InjectionMatch = { id: string; lang: string; note: string };

export const INJECTION_PATTERN_SETS = [EN_PATTERNS, CS_PATTERNS, SK_PATTERNS, DE_PATTERNS, PL_PATTERNS, FR_PATTERNS, ES_PATTERNS] as const;

const NEGATION_BEFORE = /(?:do\s+not|don't|never|avoid|must\s+not|should\s+not|nikdy|nedela?j|nedelejte|nesmi|nerob|nerobte|nesmie|nicht|niemals|vermeide|nie|nigdy|unikaj|ne|jamais|evite|no|nunca|evita)\s+(?:[\p{L}\p{N}_-]+\s+){0,3}$/u;

function isNegatedAt(text: string, index: number): boolean {
  return NEGATION_BEFORE.test(text.slice(Math.max(0, index - 64), index));
}

export function matchInjectionPatterns(input: string): InjectionMatch[] {
  const normalized = normalizeInjectionText(input);
  if (!normalized) return [];
  const matches: InjectionMatch[] = [];
  for (const set of INJECTION_PATTERN_SETS) {
    for (const pattern of set.patterns) {
      const match = pattern.regex.exec(normalized);
      if (match && !isNegatedAt(normalized, match.index)) matches.push({ id: pattern.id, lang: set.lang, note: pattern.note });
    }
  }
  return matches;
}

export function firstInjectionMatch(input: string): InjectionMatch | null {
  return matchInjectionPatterns(input)[0] ?? null;
}
