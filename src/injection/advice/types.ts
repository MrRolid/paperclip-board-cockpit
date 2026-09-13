export type AdviceCheck = { id: string; regex: RegExp; warning: string };
export type AdvicePatternSet = { lang: string; checks: AdviceCheck[]; negations: RegExp[] };
