export type SourceKind = "description" | "comment" | "handoff" | "state" | "origin" | "goal" | "title";

export type SourceRef = {
  id: string;
  kind: SourceKind;
  issueIdentifier: string | null;
  issueId: string | null;
  commentId: string | null;
  field: string | null;
  path: string;
  excerpt: string;
};

export type SourceRegistry = { refs: SourceRef[]; byId: Map<string, SourceRef> };

export type ProvenanceAudit = {
  citedIds: string[];
  unknownCitations: string[];
  unsourcedClaims: Array<{ section: string; line: string }>;
  stateOnlyClaims: number;
  reportOnlyClaims: number;
};

export type RichTextToken =
  | { kind: "text"; text: string }
  | { kind: "url"; text: string; href: string; trailing: string }
  | { kind: "issue"; text: string; identifier: string }
  | { kind: "citation"; text: string; id: string; source: SourceRef | null };

const CITATION_BODY = "[A-Z][A-Z0-9_-]*-\\d+#[a-z]+(?:[.:][A-Za-z0-9]+)?|goal:[0-9a-f]{8,12}";
export const CITATION_PATTERN = new RegExp(`\\[(${CITATION_BODY})\\]`, "g");
const CITATION_EXACT = new RegExp(`^\\[(${CITATION_BODY})\\]$`);
const ISSUE_IDENTIFIER = /^[A-Z][A-Z0-9_-]*-\d+$/;
const HANDOFF_FIELDS = ["result", "verified", "manualTest", "remaining", "limitations", "next"] as const;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function cleanExcerpt(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 160);
}

function normalizeIdentifier(value: unknown): string | null {
  const identifier = stringValue(value).trim().toUpperCase();
  return ISSUE_IDENTIFIER.test(identifier) ? identifier : null;
}

function fnv1a32(input: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function commentHexPrefix(commentId: string, length: 8 | 12): string {
  const prefix = commentId.slice(0, length).toLowerCase();
  if (new RegExp(`^[0-9a-f]{${length}}$`).test(prefix)) return prefix;
  const first = fnv1a32(commentId);
  if (length === 8) return first;
  return `${first}${fnv1a32(`comment:${commentId}`).slice(0, 4)}`;
}

function goalHex(goalId: string): string {
  return fnv1a32(goalId);
}

function sourceMap(target: Record<string, unknown>): Record<string, string> {
  const existing = record(target.src);
  if (existing) return existing as Record<string, string>;
  const created: Record<string, string> = {};
  target.src = created;
  return created;
}

function addRef(registry: SourceRegistry, ref: SourceRef): void {
  if (registry.byId.has(ref.id)) return;
  registry.refs.push(ref);
  registry.byId.set(ref.id, ref);
}

function issueStateExcerpt(issue: Record<string, unknown>): string {
  const state: Record<string, unknown> = {};
  for (const key of ["status", "assigneeAgentId", "assigneeName", "updatedAt", "parent", "blockers", "blockedBy", "blocks", "unresolvedBlockerCount", "relationKnown", "relationError", "classification", "runtimeSignal", "runtimeSignals"]) {
    if (issue[key] !== undefined && issue[key] !== null && issue[key] !== "") state[key] = issue[key];
  }
  return cleanExcerpt(JSON.stringify(state));
}

function collectCommentPrefixLengths(data: unknown): Map<string, 8 | 12> {
  const grouped = new Map<string, Map<string, Set<string>>>();
  const add = (issueIdentifier: string | null, commentId: string) => {
    if (!issueIdentifier || !commentId) return;
    const byPrefix = grouped.get(issueIdentifier) ?? new Map<string, Set<string>>();
    const prefix = commentHexPrefix(commentId, 8);
    const ids = byPrefix.get(prefix) ?? new Set<string>();
    ids.add(commentId);
    byPrefix.set(prefix, ids);
    grouped.set(issueIdentifier, byPrefix);
  };

  const root = record(data);
  const primaryIssue = normalizeIdentifier(record(root?.issue)?.identifier);
  const comments = Array.isArray(root?.recentComments) ? root.recentComments : [];
  for (const value of comments) {
    const comment = record(value);
    add(primaryIssue, stringValue(comment?.id));
  }

  const recent = Array.isArray(root?.recent) ? root.recent : [];
  for (const value of recent) {
    const item = record(value);
    add(normalizeIdentifier(item?.identifier), stringValue(item?.commentId));
  }

  const wave = record(root?.waveContext);
  const briefings = Array.isArray(wave?.briefings) ? wave.briefings : [];
  for (const value of briefings) {
    const briefing = record(value);
    const issue = record(briefing?.issue);
    add(normalizeIdentifier(issue?.identifier), stringValue(briefing?.commentId));
  }

  const lengths = new Map<string, 8 | 12>();
  for (const [issueIdentifier, byPrefix] of grouped) {
    for (const ids of byPrefix.values()) {
      const length: 8 | 12 = ids.size > 1 ? 12 : 8;
      for (const id of ids) lengths.set(`${issueIdentifier}\u0000${id}`, length);
    }
  }
  return lengths;
}
function tagIssue(
  issue: Record<string, unknown>,
  path: string,
  registry: SourceRegistry,
  options: { origin?: boolean } = {},
): string | null {
  const identifier = normalizeIdentifier(issue.identifier);
  if (!identifier) return null;
  const issueId = stringValue(issue.id) || null;
  const src = sourceMap(issue);

  const title = stringValue(issue.title);
  if (title) {
    const id = `${identifier}#title`;
    src.title = id;
    addRef(registry, { id, kind: "title", issueIdentifier: identifier, issueId, commentId: null, field: "title", path: `${path}.title`, excerpt: cleanExcerpt(title) });
  }

  const description = stringValue(issue.description);
  if (description) {
    const id = options.origin ? `${identifier}#origin` : `${identifier}#desc`;
    src.description = id;
    addRef(registry, { id, kind: options.origin ? "origin" : "description", issueIdentifier: identifier, issueId, commentId: null, field: "description", path: `${path}.description`, excerpt: cleanExcerpt(description) });
  }

  const stateExcerpt = issueStateExcerpt(issue);
  if (stateExcerpt && stateExcerpt !== "{}") {
    const id = `${identifier}#state`;
    src.state = id;
    addRef(registry, { id, kind: "state", issueIdentifier: identifier, issueId, commentId: null, field: "state", path, excerpt: stateExcerpt });
  }
  return identifier;
}

function tagHandoff(
  summary: Record<string, unknown>,
  path: string,
  issueIdentifier: string | null,
  issueId: string | null,
  registry: SourceRegistry,
): void {
  if (!issueIdentifier) return;
  const src = sourceMap(summary);
  for (const key of HANDOFF_FIELDS) {
    const canonical = key === "remaining" || key === "limitations" ? "limitations" : key;
    if (src[canonical]) continue;
    const value = stringValue(summary[key]);
    if (!value) continue;
    const field = canonical === "manualTest" ? "manualTest" : canonical;
    const id = `${issueIdentifier}#handoff.${field}`;
    src[canonical] = id;
    addRef(registry, { id, kind: "handoff", issueIdentifier, issueId, commentId: null, field, path: `${path}.${key}`, excerpt: cleanExcerpt(value) });
  }
}

function tagOwnerGoals(data: Record<string, unknown>, registry: SourceRegistry): void {
  for (const key of ["ownerGoals", "activeOwnerGoals"]) {
    const goals = Array.isArray(data[key]) ? data[key] as unknown[] : [];
    goals.forEach((value, index) => {
      const goal = record(value);
      if (!goal) return;
      const text = stringValue(goal.text);
      const rawId = stringValue(goal.id);
      if (!text || !rawId) return;
      const id = `goal:${goalHex(rawId)}`;
      goal.src = id;
      addRef(registry, { id, kind: "goal", issueIdentifier: null, issueId: null, commentId: null, field: "text", path: `$.${key}[${index}].text`, excerpt: cleanExcerpt(text) });
    });
  }
}

function tagCommentExcerpt(container: Record<string, unknown>, path: string, issueIdentifier: string | null, issueId: string | null, registry: SourceRegistry, commentLengths: Map<string, 8 | 12>): void {
  if (!issueIdentifier) return;
  const commentId = stringValue(container.commentId);
  const excerpt = stringValue(container.commentExcerpt);
  if (!commentId || !excerpt) return;
  const length = commentLengths.get(`${issueIdentifier}\u0000${commentId}`) ?? 8;
  const id = `${issueIdentifier}#c:${commentHexPrefix(commentId, length)}`;
  const src = sourceMap(container);
  src.commentExcerpt = id;
  addRef(registry, { id, kind: "comment", issueIdentifier, issueId, commentId, field: "commentExcerpt", path: `${path}.commentExcerpt`, excerpt: cleanExcerpt(excerpt) });
}

function tagTaskSnapshot(data: Record<string, unknown>, registry: SourceRegistry, commentLengths: Map<string, 8 | 12>): void {
  const issue = record(data.issue);
  const primaryIdentifier = issue ? tagIssue(issue, "$.issue", registry) : null;
  const primaryIssueId = stringValue(issue?.id) || null;

  const comments = Array.isArray(data.recentComments) ? data.recentComments as unknown[] : [];
  comments.forEach((value, index) => {
    const comment = record(value);
    if (!comment || !primaryIdentifier) return;
    const commentId = stringValue(comment.id);
    const body = stringValue(comment.body);
    if (!commentId || !body) return;
    const length = commentLengths.get(`${primaryIdentifier}\u0000${commentId}`) ?? 8;
    const id = `${primaryIdentifier}#c:${commentHexPrefix(commentId, length)}`;
    comment.src = id;
    addRef(registry, { id, kind: "comment", issueIdentifier: primaryIdentifier, issueId: primaryIssueId, commentId, field: "body", path: `$.recentComments[${index}].body`, excerpt: cleanExcerpt(body) });
  });

  const taskBrief = record(data.taskBrief);
  const taskSummary = record(taskBrief?.summary);
  if (taskSummary) tagHandoff(taskSummary, "$.taskBrief.summary", primaryIdentifier, primaryIssueId, registry);
  const latestComment = record(comments[0]);
  if (taskBrief && latestComment && typeof latestComment.src === "string" && stringValue(taskBrief.latestCommentExcerpt)) {
    const src = sourceMap(taskBrief);
    src.latestCommentExcerpt = latestComment.src;
  }

  const projectContext = record(data.projectContext);
  const origin = record(projectContext?.origin);
  if (origin) tagIssue(origin, "$.projectContext.origin", registry, { origin: true });
  const earlyRoots = Array.isArray(projectContext?.earlyRoots) ? projectContext?.earlyRoots as unknown[] : [];
  earlyRoots.forEach((value, index) => {
    const candidate = record(value);
    if (candidate) tagIssue(candidate, `$.projectContext.earlyRoots[${index}]`, registry);
  });

  for (const key of ["children"] as const) {
    const values = Array.isArray(data[key]) ? data[key] as unknown[] : [];
    values.forEach((value, index) => {
      const candidate = record(value);
      if (candidate) tagIssue(candidate, `$.${key}[${index}]`, registry);
    });
  }

  const relations = record(data.relations);
  for (const key of ["blockers", "blockedBy", "blocks"] as const) {
    const values = Array.isArray(relations?.[key]) ? relations?.[key] as unknown[] : [];
    values.forEach((value, index) => {
      const candidate = record(value);
      if (candidate) tagIssue(candidate, `$.relations.${key}[${index}]`, registry);
    });
  }

  const wave = record(data.waveContext);
  for (const key of ["root", "parent"] as const) {
    const candidate = record(wave?.[key]);
    if (candidate) tagIssue(candidate, `$.waveContext.${key}`, registry);
  }
  for (const key of ["ancestors", "siblings", "members"] as const) {
    const values = Array.isArray(wave?.[key]) ? wave?.[key] as unknown[] : [];
    values.forEach((value, index) => {
      const candidate = record(value);
      if (candidate) tagIssue(candidate, `$.waveContext.${key}[${index}]`, registry);
    });
  }
  const briefings = Array.isArray(wave?.briefings) ? wave?.briefings as unknown[] : [];
  briefings.forEach((value, index) => {
    const briefing = record(value);
    if (!briefing) return;
    const briefingIssue = record(briefing.issue);
    const identifier = briefingIssue ? tagIssue(briefingIssue, `$.waveContext.briefings[${index}].issue`, registry) : null;
    const issueId = stringValue(briefingIssue?.id) || null;
    const summary = record(briefing.summary);
    if (summary) tagHandoff(summary, `$.waveContext.briefings[${index}].summary`, identifier, issueId, registry);
    tagCommentExcerpt(briefing, `$.waveContext.briefings[${index}]`, identifier, issueId, registry, commentLengths);
  });
}

function tagCockpitSnapshot(data: Record<string, unknown>, registry: SourceRegistry, commentLengths: Map<string, 8 | 12>): void {
  const projectContext = record(data.projectContext);
  const origin = record(projectContext?.origin);
  if (origin) tagIssue(origin, "$.projectContext.origin", registry, { origin: true });
  const earlyRoots = Array.isArray(projectContext?.earlyRoots) ? projectContext?.earlyRoots as unknown[] : [];
  earlyRoots.forEach((value, index) => {
    const candidate = record(value);
    if (candidate) tagIssue(candidate, `$.projectContext.earlyRoots[${index}]`, registry);
  });

  for (const key of ["now", "blocked", "next"] as const) {
    const values = Array.isArray(data[key]) ? data[key] as unknown[] : [];
    values.forEach((value, index) => {
      const candidate = record(value);
      if (candidate) tagIssue(candidate, `$.${key}[${index}]`, registry);
    });
  }

  const needsYou = Array.isArray(data.needsYou) ? data.needsYou as unknown[] : [];
  needsYou.forEach((value, index) => {
    const item = record(value);
    const issue = record(item?.issue);
    if (issue) tagIssue(issue, `$.needsYou[${index}].issue`, registry);
  });

  const recent = Array.isArray(data.recent) ? data.recent as unknown[] : [];
  recent.forEach((value, index) => {
    const item = record(value);
    if (!item) return;
    const identifier = tagIssue(item, `$.recent[${index}]`, registry);
    const issueId = stringValue(item.id) || null;
    const summary = record(item.summary);
    if (summary) tagHandoff(summary, `$.recent[${index}].summary`, identifier, issueId, registry);
    tagCommentExcerpt(item, `$.recent[${index}]`, identifier, issueId, registry, commentLengths);
  });

  const projectState = record(data.projectState);
  const coordinator = record(projectState?.coordinator);
  const coordinatorIssue = record(coordinator?.issue);
  if (coordinatorIssue) tagIssue(coordinatorIssue, "$.projectState.coordinator.issue", registry);
  const lastMilestone = record(projectState?.lastMilestone);
  const milestoneIssue = record(lastMilestone?.issue);
  if (milestoneIssue) tagIssue(milestoneIssue, "$.projectState.lastMilestone.issue", registry);
}

export function attachProvenance<T>(preparedData: T): { data: T; registry: SourceRegistry } {
  const registry: SourceRegistry = { refs: [], byId: new Map<string, SourceRef>() };
  const data = record(preparedData);
  if (!data) return { data: preparedData, registry };

  const commentLengths = collectCommentPrefixLengths(data);
  tagOwnerGoals(data, registry);
  if (record(data.issue)) tagTaskSnapshot(data, registry, commentLengths);
  else tagCockpitSnapshot(data, registry, commentLengths);

  return { data: preparedData, registry };
}

export function sourceLegend(registry: SourceRegistry): string {
  return [
    "SOURCE IDS: cite as [ID]. Kinds: desc, title, c: (comment), handoff.<field>, state (host truth), origin, goal.",
    `Available: ${registry.refs.map((ref) => ref.id).join(", ")}`,
  ].join("\n");
}

export function citationRules(): string[] {
  return [
    "Citation rules:",
    "Every factual claim about the project in the sections WHAT CHANGED, VERIFY, NEXT, DRAFT REPLY, and every acceptance criterion in DRAFT TASK must end with one or more source IDs in square brackets, e.g. \"Login now works [ROL-22#handoff.verified]\".",
    "Cite only IDs from the Available list. Never invent an ID.",
    "A claim supported only by an agent's own report cites the comment or handoff ID; do not cite #state for it.",
    "#state IDs are the only sources that count as independently established.",
    "Recommendations and opinions do not need citations; facts do.",
  ];
}

function normalizeSectionLabel(line: string): string | null {
  const cleaned = line
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^\d+[.)]\s*/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/:$/, "")
    .trim()
    .toUpperCase();
  if (!cleaned || cleaned.length > 80) return null;
  if (cleaned === "WHERE TO VERIFY IT") return "VERIFY";
  if (cleaned === "RECOMMENDED NEXT STEP") return "NEXT";
  if (cleaned === "DRAFT NEXT TASK") return "DRAFT TASK";
  if (/^(WHAT CHANGED|VERIFY|NEXT|DRAFT REPLY|DRAFT TASK)$/.test(cleaned)) return cleaned;
  return null;
}

function isAuditedSection(section: string | null): boolean {
  return section === "WHAT CHANGED" || section === "VERIFY" || section === "NEXT" || section === "DRAFT REPLY" || section === "DRAFT TASK";
}

function normalizedSubheading(line: string): string {
  return line
    .trim()
    .replace(/^#{1,6}\s*/, "")
    .replace(/^[-*+]\s+/, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
    .replace(/:$/, "")
    .trim()
    .toUpperCase();
}

function citationIds(line: string): string[] {
  const ids: string[] = [];
  for (const match of line.matchAll(new RegExp(CITATION_PATTERN.source, "g"))) {
    const id = match[1];
    if (id && !ids.includes(id)) ids.push(id);
  }
  return ids;
}

function looksLikeRecommendation(line: string): boolean {
  const stripped = line.replace(/^\s*[-*+]\s+/, "").trim();
  return /^(Consider|Recommend|Suggest|Should|Could|Next step)\b/i.test(stripped);
}

function wordCount(line: string): number {
  return line.replace(/^\s*[-*+]\s+/, "").trim().split(/\s+/).filter(Boolean).length;
}

function lineEndsSentence(line: string): boolean {
  const withoutCitations = line.replace(new RegExp(`\\s*${CITATION_PATTERN.source}`, "g"), "").trim();
  return /[.!?][\"')\]]?$/.test(withoutCitations);
}

export function auditAdviceProvenance(text: string, registry: SourceRegistry): ProvenanceAudit {
  const valid = new Set(registry.refs.map((ref) => ref.id));
  const cited = new Set<string>();
  const unknown = new Set<string>();

  for (const id of citationIds(text)) {
    if (valid.has(id)) cited.add(id);
    else unknown.add(id);
  }

  const unsourcedClaims: Array<{ section: string; line: string }> = [];
  let stateOnlyClaims = 0;
  let reportOnlyClaims = 0;
  let section: string | null = null;
  let draftAcceptanceCriteria = false;

  for (const rawLine of text.split(/\r?\n/)) {
    const detected = normalizeSectionLabel(rawLine);
    if (detected) {
      section = detected;
      draftAcceptanceCriteria = false;
      continue;
    }
    if (!isAuditedSection(section)) continue;
    const line = rawLine.trim();
    if (!line) continue;
    if (/^===/.test(line)) continue;

    // DRAFT TASK is intentionally narrower than the other audited sections: only
    // acceptance criteria are factual requirements that the prompt mandates citing.
    if (section === "DRAFT TASK") {
      const subheading = normalizedSubheading(line);
      if (subheading === "ACCEPTANCE CRITERIA") {
        draftAcceptanceCriteria = true;
        continue;
      }
      if (draftAcceptanceCriteria && /^(OUT OF SCOPE|AUTONOMY(?: & STOP CONDITIONS)?|STOP CONDITIONS|SECURITY(?: \/ REVIEW \/ DEPLOYMENT|-REVIEW-DEPLOYMENT)?|OWNER HANDOFF|OBJECTIVE|SCOPE|TITLE)$/.test(subheading)) {
        draftAcceptanceCriteria = false;
        continue;
      }
      if (!draftAcceptanceCriteria) continue;
    }
    if (/^[A-Z][A-Z0-9 /&_-]{2,}:$/.test(line)) continue;

    const ids = citationIds(line);
    const validIds = ids.filter((id) => valid.has(id));
    if (validIds.length > 0) {
      if (validIds.some((id) => id.endsWith("#state"))) stateOnlyClaims += 1;
      else if (validIds.every((id) => /#(?:desc|c:|handoff\.)/.test(id))) reportOnlyClaims += 1;
      continue;
    }

    // The remaining heuristics only suppress false-positive *unsourced* flags.
    // They must not hide already-cited claims from the provenance counters above.
    if (wordCount(line) < 6 && /^\s*[-*+]/.test(rawLine)) continue;
    if (looksLikeRecommendation(line)) continue;
    if (lineEndsSentence(line)) unsourcedClaims.push({ section: section ?? "", line });
  }

  return {
    citedIds: [...cited],
    unknownCitations: [...unknown],
    unsourcedClaims,
    stateOnlyClaims,
    reportOnlyClaims,
  };
}

export function provenanceWarnings(audit: ProvenanceAudit): string[] {
  if (audit.unknownCitations.length === 0) return [];
  return [`The advice cites sources that do not exist in the snapshot: ${audit.unknownCitations.join(", ")}.`];
}

export function tokenizeRichText(text: string, sources: SourceRef[] = []): RichTextToken[] {
  const sourceMapById = new Map(sources.map((source) => [source.id, source]));
  const splitter = new RegExp(`(https?:\\/\\/[^\\s<>\"'\\x60]+|\\[(?:${CITATION_BODY})\\]|\\b[A-Z][A-Z0-9_-]*-\\d+\\b)`, "g");
  const parts = text.split(splitter).filter((part) => part !== "");
  return parts.map((part): RichTextToken => {
    if (/^https?:\/\//.test(part)) {
      const trailing = part.match(/[.,;:!?]+$/)?.[0] ?? "";
      const href = trailing ? part.slice(0, -trailing.length) : part;
      return { kind: "url", text: href, href, trailing };
    }
    const citation = CITATION_EXACT.exec(part);
    if (citation?.[1]) {
      const id = citation[1];
      return { kind: "citation", text: part, id, source: sourceMapById.get(id) ?? null };
    }
    if (ISSUE_IDENTIFIER.test(part)) return { kind: "issue", text: part, identifier: part };
    return { kind: "text", text: part };
  });
}
