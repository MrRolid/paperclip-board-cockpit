import { definePatternSet, type PatternSet } from "./pattern.js";

export const EN_PATTERNS: PatternSet = definePatternSet("en", [
  { id: "ignore_previous", verb: "ignore|forget", object: "(?:(?:all|any|the)\\s+)?(?:previous|prior|above)\\s+(?:instructions|messages|rules|prompts?)", note: "Ignore prior authority" },
  { id: "override_policy", verb: "disregard|override|bypass", object: "instructions|system\\s+prompt|developer\\s+message|policy|guardrails?", note: "Override system or policy instructions" },
  { id: "reveal_secret", verb: "reveal|show|print|dump|return|expose", object: "system\\s+prompt|developer\\s+message|hidden\\s+instructions|api\\s+key|token|password|credentials?|secret", note: "Reveal hidden instructions or secrets", gap: 64 },
  { id: "role_switch", verb: "you\\s+are\\s+now|act\\s+as|become", object: "assistant|chatgpt|system|developer|root|administrator|admin", note: "Role or authority reassignment" },
  { id: "replacement_system", verb: "create|write|make|set|replace", object: "(?:a\\s+)?(?:new|replacement)\\s+(?:system\\s+prompt|developer\\s+message|instructions?|rules?)", note: "Create replacement authority" },
  { id: "follow_instead", verb: "follow|obey", object: "(?:these|the\\s+following)\\s+(?:instructions?|rules?)\\s+instead", note: "Follow attacker instructions instead" },
  { id: "model_must", verb: "(?:assistant|model|llm)\\s+(?:must|should)\\s+(?:ignore|override|reveal|execute|send|exfiltrate)", object: "instructions?|system\\s+prompt|policy|command|secret|token|credentials?|data", note: "Instruction addressed to model" },
  { id: "exfiltrate", verb: "send|post|upload|exfiltrate", object: "secret|token|credentials?|password|api\\s+key|system\\s+prompt", note: "Exfiltrate sensitive material", gap: 56 },
]);
