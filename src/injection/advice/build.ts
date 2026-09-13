import { wordStart, wordEnd } from "../pattern.js";
import type { AdvicePatternSet } from "./types.js";

type AdviceSpec = { id: string; verb: string; object: string; warning: string; gap?: number };

export function defineAdviceSet(lang: string, specs: AdviceSpec[], negationSources: string[]): AdvicePatternSet {
  return {
    lang,
    checks: specs.map((spec) => ({
      id: `${lang}.${spec.id}`,
      regex: new RegExp(`${wordStart}(?:${spec.verb})${wordEnd}.{0,${spec.gap ?? 40}}${wordStart}(?:${spec.object})${wordEnd}`, "u"),
      warning: spec.warning,
    })),
    negations: negationSources.map((source) => new RegExp(source, "u")),
  };
}
