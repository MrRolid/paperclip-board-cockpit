import { normalizeInjectionText } from "../normalize.js";
import { EN_ADVICE } from "./en.js";
import { CS_ADVICE } from "./cs.js";
import { SK_ADVICE } from "./sk.js";
import { DE_ADVICE } from "./de.js";
import { PL_ADVICE } from "./pl.js";
import { FR_ADVICE } from "./fr.js";
import { ES_ADVICE } from "./es.js";

const SETS = [EN_ADVICE, CS_ADVICE, SK_ADVICE, DE_ADVICE, PL_ADVICE, FR_ADVICE, ES_ADVICE] as const;
const SHELL_PATTERN = /(?<![\p{L}\p{N}])chmod\s+777(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])curl(?![\p{L}\p{N}])[^\n]{0,120}\|\s*(?:sh|bash)(?![\p{L}\p{N}])|(?<![\p{L}\p{N}])wget(?![\p{L}\p{N}])[^\n]{0,120}\|\s*(?:sh|bash)(?![\p{L}\p{N}])/u;
const GENERIC_NEGATION_BEFORE = /(?:do\s+not|don't|never|avoid|must\s+not|should\s+not|nikdy|nedela?j|nedelejte|nerob|nerobte|nicht|niemals|vermeide|nie|nigdy|unikaj|ne|jamais|evite|no|nunca|evita)\s+(?:[\p{L}\p{N}_-]+\s+){0,3}$/u;
const SHELL_NEGATION = /(?<![\p{L}\p{N}])(?:do\s+not|don't|never|avoid|nedela?j|nedelejte|nikdy|nerob|nerobte|nicht|niemals|vermeide|nie|nigdy|unikaj|ne|jamais|evite|no|nunca|evita)(?![\p{L}\p{N}]).{0,50}(?:chmod|curl|wget)/u;

export function scanAdviceSafety(input: string): string[] {
  const warnings = new Set<string>();
  for (const rawLine of input.split(/\r?\n/)) {
    const line = normalizeInjectionText(rawLine);
    if (!line) continue;
    if (SHELL_PATTERN.test(line) && !SHELL_NEGATION.test(line)) warnings.add("Advice contains a high-risk shell/deployment pattern.");
    for (const set of SETS) {
      const negated = set.negations.some((pattern) => pattern.test(line));
      if (negated) continue;
      for (const check of set.checks) {
        const match = check.regex.exec(line);
        const negatedImmediately = match ? GENERIC_NEGATION_BEFORE.test(line.slice(Math.max(0, match.index - 64), match.index)) : false;
        if (match && !negatedImmediately) warnings.add(check.warning);
      }
    }
  }
  return [...warnings];
}
