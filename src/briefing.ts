export type CompletionSummary = {
  result: string | null;
  verified: string | null;
  manualTest: string | null;
  remaining: string | null;
  next: string | null;
};

const SECTION_ALIASES: Record<string, keyof CompletionSummary> = {
  result: "result",
  verified: "verified",
  verification: "verified",
  "manual test": "manualTest",
  "manual testing": "manualTest",
  "remaining limitations": "remaining",
  limitations: "remaining",
  remaining: "remaining",
  next: "next",
};

function compactMarkdown(value: string, maxChars = 360): string | null {
  const cleaned = value
    .replace(/\r/g, "")
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/`{1,3}([^`]+)`{1,3}/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/^\s*[-*+]\s+/gm, "• ")
    .replace(/^\s*\d+[.)]\s+/gm, "• ")
    .replace(/\n+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return null;
  return cleaned.length > maxChars ? `${cleaned.slice(0, maxChars - 3).trimEnd()}...` : cleaned;
}

export function parseCompletionSummary(raw: string | null | undefined): CompletionSummary {
  const empty: CompletionSummary = {
    result: null,
    verified: null,
    manualTest: null,
    remaining: null,
    next: null,
  };
  if (!raw) return empty;

  const lines = raw.replace(/\r/g, "").split("\n");
  const sections = new Map<keyof CompletionSummary, string[]>();
  let current: keyof CompletionSummary | null = null;

  for (const line of lines) {
    const heading = line.match(/^\s*#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading) {
      const normalized = heading[1]
        .replace(/[*_`]/g, "")
        .trim()
        .toLowerCase();
      current = SECTION_ALIASES[normalized] ?? null;
      if (current && !sections.has(current)) sections.set(current, []);
      continue;
    }

    if (current) sections.get(current)?.push(line);
  }

  return {
    result: compactMarkdown((sections.get("result") ?? []).join("\n")),
    verified: compactMarkdown((sections.get("verified") ?? []).join("\n")),
    manualTest: compactMarkdown((sections.get("manualTest") ?? []).join("\n"), 260),
    remaining: compactMarkdown((sections.get("remaining") ?? []).join("\n"), 320),
    next: compactMarkdown((sections.get("next") ?? []).join("\n"), 260),
  };
}

export function hasStructuredSummary(summary: CompletionSummary): boolean {
  return Boolean(summary.result || summary.verified || summary.remaining || summary.next || summary.manualTest);
}
