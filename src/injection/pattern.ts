export const wordStart = "(?<![\\p{L}\\p{N}])";
export const wordEnd = "(?![\\p{L}\\p{N}])";

export type PatternSet = {
  lang: string;
  patterns: Array<{ id: string; regex: RegExp; note: string }>;
};

export type PatternSpec = {
  id: string;
  verb: string;
  object: string;
  note: string;
  gap?: number;
};

export function definePatternSet(lang: string, specs: PatternSpec[]): PatternSet {
  return {
    lang,
    patterns: specs.map((spec) => ({
      id: `${lang}.${spec.id}`,
      regex: new RegExp(`${wordStart}(?:${spec.verb})${wordEnd}.{0,${spec.gap ?? 48}}${wordStart}(?:${spec.object})${wordEnd}`, "u"),
      note: spec.note,
    })),
  };
}
