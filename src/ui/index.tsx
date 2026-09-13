import { useEffect, useMemo, useState } from "react";
import {
  useHostNavigation,
  usePluginAction,
  usePluginData,
  copyTextToClipboard,
  type PluginDetailTabProps,
  type PluginPageProps,
  type PluginSidebarProps,
  type PluginWidgetProps,
} from "@paperclipai/plugin-sdk/ui";
import {
  LANGUAGE_NAMES,
  SUPPORTED_LOCALES,
  normalizeLocale,
  type LanguagePreference,
  type Locale,
} from "../locale.js";
import { tr } from "./i18n.js";
import { tokenizeRichText, type ProvenanceAudit, type SourceRef } from "../provenance.js";

const BOARD_COCKPIT_VERSION = "0.9.5";

type IssueView = {
  id: string;
  identifier: string;
  title: string;
  status: string;
  updatedAt: string | null;
  assigneeAgentId: string | null;
  assigneeName: string | null;
};

type CompletionSummary = {
  result: string | null;
  verified: string | null;
  manualTest: string | null;
  remaining: string | null;
  next: string | null;
};

type RuntimeAgent = {
  id: string;
  name: string;
  role: string;
  title: string | null;
  status: string;
  lastHeartbeatAt: string | null;
  runStartedAt: string | null;
  heartbeatAgeMinutes: number | null;
  runAgeMinutes: number | null;
  issue: IssueView | null;
  withoutIssue: boolean;
  staleWithoutIssue: boolean;
};

type LlmSource = {
  id: string;
  kind: "local" | "agent";
  agentId: string | null;
  label: string;
  adapterType: string;
  model: string | null;
  available: boolean;
};


type OwnerGoal = {
  id: string;
  text: string;
  priority: "high" | "normal" | "low";
  status: "active" | "paused" | "done";
  createdAt: string;
  updatedAt: string;
};

type AnalysisState = {
  status?: "running" | "done" | "error";
  startedAt?: string;
  generatedAt?: string;
  source?: string;
  sourceLabel?: string;
  model?: string;
  mode?: string;
  analysis?: string;
  error?: string;
  inputSecurity?: {
    summary?: {
      totalFindings?: number;
      promptInjectionRedactions?: number;
      foreignScriptFindings?: number;
      secretRedactions?: number;
      unicodeControlsRemoved?: number;
      truncations?: number;
    };
    findings?: Array<{ kind?: string; path?: string; excerpt?: string; patternId?: string }>;
  };
  adviceWarnings?: string[];
  provenance?: ProvenanceAudit;
  sources?: SourceRef[];
};

type CockpitData = {
  schemaVersion: number;
  generatedAt: string;
  lastSeenAt: string | null;
  stats: {
    open: number;
    blocked: number;
    doneSince: number;
    runningAgents: number;
    reportedRunningAgents: number;
    totalAgents: number;
    needsYou: number;
    runnable: number;
  };
  projectState: {
    waveState: "RUNNING" | "WAITING_FOR_OWNER" | "BLOCKED" | "READY_BUT_IDLE" | "IDLE";
    activeWorkers: number;
    runnableWork: number;
    ownerActions: number;
    continuationDecisionNeeded?: boolean;
    movementExplanation: string;
    coordinator: null | {
      id: string;
      name: string;
      status: string;
      issue: IssueView | null;
    };
    lastMilestone: null | {
      issue: IssueView;
      result: string | null;
    };
  };
  now: RuntimeAgent[];
  runtimeAnomalies: RuntimeAgent[];
  needsYou: Array<{
    kind: "approval" | "interaction" | "planning";
    label: string;
    issue?: IssueView | null;
    approvalId?: string;
  }>;
  blocked: Array<IssueView & {
    blockers: Array<{ id: string; identifier: string; title: string; status: string }>;
    unresolvedBlockerCount: number;
  }>;
  recent: Array<IssueView & { commentExcerpt: string | null; summary: CompletionSummary }>;
  next: IssueView[];
  nextState: {
    summary: string;
    reason: string;
    ownerAction: string;
  };
  preferences: {
    languagePreference: LanguagePreference;
    language: Locale;
  };
  ownerGoals: OwnerGoal[];
  activeOwnerGoals: OwnerGoal[];
  projectContext: {
    origin: null | (IssueView & { description: string; createdAt: string | null });
    earlyRoots: Array<IssueView & { description: string; createdAt: string | null }>;
  };
  llm: {
    enabled: boolean;
    configured: boolean;
    baseUrl: string | null;
    model: string;
    allowPrivateNetwork?: boolean;
    defaultSource?: string;
    selectedSource: string;
    sources: LlmSource[];
    latestAnalysis: AnalysisState | null;
  };
  health: {
    tone: "ok" | "warn" | "bad";
    items: Array<{ tone: "ok" | "warn" | "bad"; text: string }>;
  };
};

type IssueAssistantData = {
  schemaVersion: number;
  issue: IssueView & {
    description: string;
    priority: string;
    parent: null | { id: string; identifier: string; title: string; status: string };
  };
  children: IssueView[];
  relations: {
    blockers: Array<{ id: string; identifier: string; title: string; status: string }>;
    blocks: Array<{ id: string; identifier: string; title: string; status: string }>;
  };
  recentComments: Array<{ id: string; createdAt: string | null; body: string; authorAgentId: string | null; actorUserId: string | null }>;
  pendingInteractions: Array<{ id: string; kind: string; label: string }>;
  pendingApprovals: Array<{ id: string; type: string; status: string }>;
  ownerActionDetected: boolean;
  taskBrief: {
    summary: CompletionSummary;
    latestCommentExcerpt: string | null;
  };
  waveContext: {
    root: IssueView;
    parent: IssueView | null;
    ancestors: IssueView[];
    siblings: IssueView[];
    members: IssueView[];
    stats: { total: number; done: number; open: number; blocked: number; inProgress: number };
    briefings: Array<{ issue: IssueView; summary: CompletionSummary; commentId: string | null; commentExcerpt: string | null }>;
    ownerGuidance: {
      directAction: boolean;
      checkIssue: IssueView;
      reason: string;
      manualTest: string | null;
      next: string | null;
    };
  };
  ownerGoals: OwnerGoal[];
  activeOwnerGoals: OwnerGoal[];
  projectContext: CockpitData["projectContext"];
  preferences: CockpitData["preferences"];
  llm: CockpitData["llm"];
  latestAnalysis: AnalysisState | null;
};


const colors = {
  border: "var(--border, #d7dce2)",
  muted: "var(--muted-foreground, #68707d)",
  bg: "var(--card, transparent)",
  soft: "var(--muted, rgba(127,127,127,.07))",
  ok: "#178447",
  warn: "#b56a00",
  bad: "#c43b3b",
  info: "#3569a8",
};

function formatActionError(value: unknown): string {
  if (value instanceof Error) {
    const record = value as unknown as Record<string, unknown>;
    const message = value.message?.trim();
    if (message && message !== "[object Object]") {
      const details = record.details ?? record.cause;
      if (details) {
        const detailText = formatActionError(details);
        if (detailText && detailText !== "Unknown error" && !message.includes(detailText)) return `${message} — ${detailText}`;
      }
      return message;
    }
    for (const candidate of [record.details, record.cause, record.error, record.body]) {
      if (candidate) {
        const nested = formatActionError(candidate);
        if (nested && nested !== "Unknown error") return nested;
      }
    }
  }
  if (typeof value === "string") return value === "[object Object]" ? "Unknown structured plugin error" : value;
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    for (const key of ["message", "error", "detail", "details", "reason", "body", "cause"]) {
      const candidate = record[key];
      if (typeof candidate === "string" && candidate.trim() && candidate !== "[object Object]") return candidate;
      if (candidate && typeof candidate === "object" && candidate !== value) {
        const nested = formatActionError(candidate);
        if (nested && nested !== "Unknown error") return nested;
      }
    }
    try {
      const serialized = JSON.stringify(value, null, 2);
      if (serialized && serialized !== "{}") return serialized;
    } catch {}
  }
  return "Unknown error";
}

type ActionEnvelope<T> =
  | { ok: true; result: T }
  | { ok: false; error: { message?: string; code?: string; details?: unknown } };

function actionEnvelopeError(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  if (record.ok !== false) return null;
  const error = record.error;
  if (error && typeof error === "object") {
    const er = error as Record<string, unknown>;
    const message = typeof er.message === "string" ? er.message : "Action failed";
    const details = er.details ? formatActionError(er.details) : "";
    const code = typeof er.code === "string" ? ` [${er.code}]` : "";
    return `${message}${code}${details && !message.includes(details) ? ` — ${details}` : ""}`;
  }
  return formatActionError(error ?? value);
}


function extractLabeledSection(markdown: string | undefined, label: string): string {
  if (!markdown) return "";
  const wanted = label.replace(/:$/, "").trim().toUpperCase();
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().replace(/:$/, "").toUpperCase() === wanted);
  if (start < 0) return "";
  const collected: string[] = [];
  for (let i = start + 1; i < lines.length; i += 1) {
    const trimmed = lines[i].trim();
    if (/^[A-Z][A-Z /_-]{2,}:$/.test(trimmed)) break;
    collected.push(lines[i]);
  }
  return collected.join("\n").trim();
}

function extractDelimitedBlock(markdown: string | undefined, beginMarker: string, endMarker: string): string {
  if (!markdown) return "";
  const start = markdown.indexOf(beginMarker);
  if (start < 0) return "";
  const contentStart = start + beginMarker.length;
  const end = markdown.indexOf(endMarker, contentStart);
  if (end < 0) return "";
  return markdown.slice(contentStart, end).trim();
}


function hostLocaleHint(): string {
  if (typeof document !== "undefined") {
    const htmlLang = document.documentElement?.lang?.trim();
    if (htmlLang) return htmlLang;
  }
  if (typeof navigator !== "undefined" && navigator.language) return navigator.language;
  return "en";
}

function fmt(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString();
}

function relativeMinutes(minutes: number | null, locale: Locale): string {
  if (minutes === null) return tr(locale, "unknown");
  if (minutes < 1) return "< 1 min";
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function issueHref(issue: IssueView): string {
  return `/issues/${encodeURIComponent(issue.id)}`;
}

function Badge({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "ok" | "warn" | "bad" | "info" }) {
  const color = tone === "ok" ? colors.ok : tone === "warn" ? colors.warn : tone === "bad" ? colors.bad : tone === "info" ? colors.info : colors.muted;
  return (
    <span style={{ border: `1px solid ${color}`, color, borderRadius: 999, padding: "2px 7px", fontSize: 11, lineHeight: 1.4 }}>
      {children}
    </span>
  );
}

function Section({ title, children, full = false }: { title: string; children: React.ReactNode; full?: boolean }) {
  return (
    <section style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 14, background: colors.bg, gridColumn: full ? "1 / -1" : undefined }}>
      <div style={{ fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </section>
  );
}

function ActionButton({
  children,
  onClick,
  disabled = false,
  variant = "secondary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const primary = variant === "primary";
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        border: `1px solid ${primary ? colors.info : colors.border}`,
        borderRadius: 8,
        padding: "8px 12px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        background: primary ? colors.info : colors.bg,
        color: primary ? "#fff" : "inherit",
        lineHeight: 1.2,
      }}
    >
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div style={{ color: colors.muted, fontSize: 13 }}>{children}</div>;
}

function IssueLine({ issue, suffix }: { issue: IssueView; suffix?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
      <a href={issueHref(issue)} style={{ fontWeight: 650, color: "inherit", textDecoration: "none" }}>
        {issue.identifier}
      </a>
      <span>{issue.title}</span>
      <Badge>{issue.status}</Badge>
      {issue.assigneeName ? <span style={{ color: colors.muted, fontSize: 12 }}>→ {issue.assigneeName}</span> : null}
      {suffix}
    </div>
  );
}

function Stat({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "ok" | "warn" | "bad" }) {
  const color = tone === "ok" ? colors.ok : tone === "warn" ? colors.warn : tone === "bad" ? colors.bad : "inherit";
  return (
    <div style={{ minWidth: 100 }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: ".04em" }}>{label}</div>
    </div>
  );
}

function WaveBadge({ state }: { state: CockpitData["projectState"]["waveState"] }) {
  const tone = state === "RUNNING" ? "ok" : state === "WAITING_FOR_OWNER" || state === "READY_BUT_IDLE" ? "warn" : state === "BLOCKED" ? "bad" : "neutral";
  return <Badge tone={tone}>{state}</Badge>;
}

function RichText({ text, hostNavigation, sources = [], locale = "en" }: { text: string; hostNavigation: ReturnType<typeof useHostNavigation>; sources?: SourceRef[]; locale?: Locale }) {
  const parts = tokenizeRichText(text, sources);
  return (
    <span style={{ whiteSpace: "pre-wrap" }}>
      {parts.map((part, index) => {
        if (part.kind === "url") {
          return (
            <span key={`${part.text}-${index}`}>
              <a href={part.href} target="_blank" rel="noreferrer" style={{ color: colors.info, textDecoration: "underline" }}>{part.text}</a>{part.trailing}
            </span>
          );
        }
        if (part.kind === "issue") {
          return <a key={`${part.text}-${index}`} {...hostNavigation.linkProps(`/issues/${part.identifier}`)} style={{ color: colors.info, textDecoration: "underline", fontWeight: 650 }}>{part.text}</a>;
        }
        if (part.kind === "citation") {
          const source = part.source;
          const tooltip = source
            ? `${tr(locale, "sourceKind")}: ${source.kind}\n${source.excerpt}`
            : tr(locale, "sourceNotInSnapshot");
          const citationStyle = {
            color: source ? colors.info : colors.bad,
            textDecoration: "underline",
            fontSize: "0.92em",
            fontWeight: 650,
          } as const;
          if (part.id.startsWith("goal:")) {
            return (
              <a
                key={`${part.id}-${index}`}
                href="#board-cockpit-owner-goals"
                title={tooltip}
                style={citationStyle}
                onClick={(event) => {
                  const target = typeof document !== "undefined" ? document.getElementById("board-cockpit-owner-goals") : null;
                  if (target) {
                    event.preventDefault();
                    target.scrollIntoView({ behavior: "smooth", block: "start" });
                  }
                }}
              >{part.text}</a>
            );
          }
          const identifier = source?.issueIdentifier ?? part.id.split("#", 1)[0];
          // Paperclip 2026.831.1 exposes issue navigation but no documented stable
          // comment-anchor helper, so comment citations intentionally link to the issue.
          return <a key={`${part.id}-${index}`} {...hostNavigation.linkProps(`/issues/${identifier}`)} title={tooltip} style={citationStyle}>{part.text}</a>;
        }
        return <span key={index}>{part.text}</span>;
      })}
    </span>
  );
}

function AnalysisSecurityNotices({ analysis, locale }: { analysis: AnalysisState | null | undefined; locale: Locale }) {
  const summary = analysis?.inputSecurity?.summary;
  const findings = summary?.totalFindings ?? 0;
  const findingItems = analysis?.inputSecurity?.findings ?? [];
  const warnings = analysis?.adviceWarnings ?? [];
  const provenance = analysis?.provenance;
  const hasProvenance = Boolean(provenance && (analysis?.sources?.length || provenance.citedIds.length || provenance.unsourcedClaims.length || provenance.unknownCitations.length));
  if (!findings && warnings.length === 0 && !hasProvenance) return null;
  return (
    <div style={{ display: "grid", gap: 6 }}>
      {findings > 0 ? (
        <details style={{ border: `1px solid ${colors.warn}`, borderRadius: 8, padding: "7px 9px", background: "rgba(181,106,0,.06)", fontSize: 11, lineHeight: 1.45 }}>
          <summary style={{ cursor: "pointer" }}>
            <strong>{tr(locale, "inputSecurityDetails")}:</strong> {tr(locale, "sanitizedItems", { count: findings })}
            {summary?.promptInjectionRedactions ? ` · injection-like: ${summary.promptInjectionRedactions}` : ""}
            {summary?.foreignScriptFindings ? ` · foreign-script: ${summary.foreignScriptFindings}` : ""}
            {summary?.secretRedactions ? ` · secrets: ${summary.secretRedactions}` : ""}
            {summary?.unicodeControlsRemoved ? ` · hidden Unicode: ${summary.unicodeControlsRemoved}` : ""}.
          </summary>
          {findingItems.length > 0 ? (
            <div style={{ display: "grid", gap: 4, marginTop: 7 }}>
              {findingItems.map((finding, index) => (
                <div key={`${finding.path ?? "finding"}-${index}`} style={{ overflowWrap: "anywhere" }}>
                  <code>{finding.path ?? "$"}</code> · {finding.kind ?? "finding"}{finding.patternId ? ` · ${tr(locale, "patternId")}: ${finding.patternId}` : ""} · {finding.excerpt ?? ""}
                </div>
              ))}
            </div>
          ) : null}
        </details>
      ) : null}
      {warnings.length > 0 ? (
        <div style={{ border: `1px solid ${colors.warn}`, borderRadius: 8, padding: "7px 9px", background: "rgba(181,106,0,.06)", fontSize: 11, lineHeight: 1.45 }}>
          <strong>{tr(locale, "adviceSafetyReview")}:</strong> {warnings.join(" ")}
        </div>
      ) : null}
      {hasProvenance && provenance ? (
        <details style={{ border: `1px solid ${provenance.unknownCitations.length ? colors.bad : colors.border}`, borderRadius: 8, padding: "7px 9px", fontSize: 11, lineHeight: 1.45 }}>
          <summary style={{ cursor: "pointer" }}>
            <strong>{tr(locale, "sourcesTitle")}:</strong> {tr(locale, "sourcesSummary", {
              cited: provenance.citedIds.length,
              state: provenance.stateOnlyClaims,
              report: provenance.reportOnlyClaims,
              unsourced: provenance.unsourcedClaims.length,
              unknown: provenance.unknownCitations.length,
            })}
          </summary>
          <div style={{ display: "grid", gap: 7, marginTop: 7 }}>
            {provenance.unsourcedClaims.length > 0 ? (
              <div>
                <strong>{tr(locale, "unsourcedClaims")}</strong>
                <div style={{ display: "grid", gap: 3, marginTop: 3 }}>
                  {provenance.unsourcedClaims.map((claim, index) => <div key={`${claim.section}-${index}`}>{claim.section}: {claim.line.slice(0, 80)}</div>)}
                </div>
              </div>
            ) : null}
            {provenance.unknownCitations.length > 0 ? <div><strong>{tr(locale, "unknownCitations")}:</strong> {provenance.unknownCitations.join(", ")}</div> : null}
            <div><strong>{tr(locale, "citedSources")}:</strong> {provenance.citedIds.length}</div>
            <div>{tr(locale, "stateBackedClaims")}: {provenance.stateOnlyClaims} · {tr(locale, "reportOnlyClaims")}: {provenance.reportOnlyClaims}</div>
          </div>
        </details>
      ) : null}
    </div>
  );
}

function BriefField({ label, value, tone = "neutral" }: { label: string; value: string | null; tone?: "neutral" | "warn" }) {
  if (!value) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "88px 1fr", gap: 8, fontSize: 12, lineHeight: 1.45 }}>
      <strong style={{ color: tone === "warn" ? colors.warn : colors.muted }}>{label}</strong>
      <span>{value}</span>
    </div>
  );
}

function ProjectState({ data, locale }: { data: CockpitData; locale: Locale }) {
  const ps = data.projectState;
  const hostNavigation = useHostNavigation();
  return (
    <Section title={tr(locale, "projectState")} full>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        <WaveBadge state={ps.waveState} />
        <span style={{ color: colors.muted, fontSize: 12 }}>{tr(locale, "implementationWave")}</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10, marginBottom: 12 }}>
        <div><strong>{ps.activeWorkers}</strong><div style={{ color: colors.muted, fontSize: 11 }}>{tr(locale, "activeWorkers")}</div></div>
        <div><strong>{ps.runnableWork}</strong><div style={{ color: colors.muted, fontSize: 11 }}>{tr(locale, "runnableWork")}</div></div>
        <div><strong>{ps.ownerActions}</strong><div style={{ color: colors.muted, fontSize: 11 }}>{tr(locale, "ownerActions")}</div></div>
        <div>
          <strong>{ps.coordinator ? `${ps.coordinator.name}: ${ps.coordinator.status}` : tr(locale, "notDetected")}</strong>
          <div style={{ color: colors.muted, fontSize: 11 }}>{tr(locale, "coordinator")}</div>
        </div>
      </div>

      {data.projectContext.origin ? (
        <div style={{ marginBottom: 12, padding: "8px 10px", background: colors.soft, borderRadius: 8 }}>
          <div style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>{tr(locale, "projectOrigin")}</div>
          <a {...hostNavigation.linkProps(`/issues/${data.projectContext.origin.identifier}`)} style={{ color: colors.info, textDecoration: "underline", fontWeight: 800 }}>
            {data.projectContext.origin.identifier} {data.projectContext.origin.title}
          </a>
          {data.projectContext.origin.description ? <div style={{ marginTop: 5, color: colors.muted, fontSize: 11, lineHeight: 1.4 }}>{data.projectContext.origin.description.slice(0, 420)}{data.projectContext.origin.description.length > 420 ? "…" : ""}</div> : null}
        </div>
      ) : null}

      {ps.lastMilestone ? (
        <div style={{ marginBottom: 12 }}>
          <div style={{ color: colors.muted, fontSize: 11, marginBottom: 4 }}>{tr(locale, "lastMilestone")}</div>
          <IssueLine issue={ps.lastMilestone.issue} />
          {ps.lastMilestone.result ? <div style={{ marginTop: 5, fontSize: 12 }}>{ps.lastMilestone.result}</div> : null}
        </div>
      ) : null}

      <div style={{ borderLeft: `4px solid ${ps.waveState === "BLOCKED" ? colors.bad : ps.waveState === "READY_BUT_IDLE" || ps.waveState === "WAITING_FOR_OWNER" ? colors.warn : colors.info}`, padding: "8px 10px", background: colors.soft }}>
        <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{tr(locale, "whyMoving")}</div>
        <div style={{ fontSize: 13 }}>{ps.movementExplanation}</div>
      </div>
    </Section>
  );
}

function CompletionCard({ issue, locale }: { issue: CockpitData["recent"][number]; locale: Locale }) {
  const structured = Boolean(issue.summary.result || issue.summary.verified || issue.summary.remaining || issue.summary.next || issue.summary.manualTest);
  return (
    <div style={{ paddingBottom: 10, borderBottom: `1px solid ${colors.border}` }}>
      <IssueLine issue={issue} />
      <div style={{ display: "grid", gap: 5, marginTop: 6 }}>
        {structured ? (
          <>
            <BriefField label={tr(locale, "result")} value={issue.summary.result} />
            <BriefField label={tr(locale, "verified")} value={issue.summary.verified} />
            <BriefField label={tr(locale, "limitations")} value={issue.summary.remaining} tone="warn" />
            <BriefField label={tr(locale, "nextField")} value={issue.summary.next} />
          </>
        ) : issue.commentExcerpt ? (
          <div style={{ color: colors.muted, fontSize: 12 }}>{issue.commentExcerpt}</div>
        ) : (
          <Empty>{tr(locale, "noReport")}</Empty>
        )}
      </div>
    </div>
  );
}


function ownerGoalLabels(locale: Locale) {
  const all: Partial<Record<Locale, Record<string, string>>> = {
    cs: { title: "Cíle ownera", active: "aktivní", paused: "pozastaveno", done: "splněno", add: "Přidat cíl", placeholder: "Např. přidat reálný monitoring bez zbytečného komplikování UI", high: "vysoká", normal: "normální", low: "nízká", pause: "Pozastavit", resume: "Aktivovat", complete: "Splněno", reopen: "Znovu otevřít", delete: "Smazat", hint: "Aktivní cíle Cockpit používá jako explicitní prioritu při návrhu další implementační vlny. Nemění Paperclip tasky automaticky." },
    en: { title: "Owner goals", active: "active", paused: "paused", done: "done", add: "Add goal", placeholder: "E.g. add real monitoring without making the UI complex", high: "high", normal: "normal", low: "low", pause: "Pause", resume: "Activate", complete: "Done", reopen: "Reopen", delete: "Delete", hint: "Active goals are explicit planning priorities for the next-wave advisor. They never modify Paperclip tasks automatically." },
    de: { title: "Owner-Ziele", active: "aktiv", paused: "pausiert", done: "erledigt", add: "Ziel hinzufügen", placeholder: "Z. B. echtes Monitoring ohne unnötig komplexe UI", high: "hoch", normal: "normal", low: "niedrig", pause: "Pausieren", resume: "Aktivieren", complete: "Erledigt", reopen: "Wieder öffnen", delete: "Löschen", hint: "Aktive Ziele priorisieren die nächste Welle. Paperclip-Tasks werden nie automatisch geändert." },
    pl: { title: "Cele ownera", active: "aktywne", paused: "wstrzymane", done: "zrobione", add: "Dodaj cel", placeholder: "Np. realny monitoring bez komplikowania UI", high: "wysoki", normal: "normalny", low: "niski", pause: "Wstrzymaj", resume: "Aktywuj", complete: "Gotowe", reopen: "Otwórz ponownie", delete: "Usuń", hint: "Aktywne cele są priorytetami dla doradcy następnej fali. Nie zmieniają automatycznie tasków." },
    sk: { title: "Ciele ownera", active: "aktívne", paused: "pozastavené", done: "splnené", add: "Pridať cieľ", placeholder: "Napr. reálny monitoring bez zbytočne zložitého UI", high: "vysoká", normal: "normálna", low: "nízka", pause: "Pozastaviť", resume: "Aktivovať", complete: "Splnené", reopen: "Znovu otvoriť", delete: "Zmazať", hint: "Aktívne ciele určujú priority ďalšej vlny. Paperclip tasky sa automaticky nemenia." },
    fr: { title: "Objectifs owner", active: "actifs", paused: "en pause", done: "terminés", add: "Ajouter", placeholder: "Ex. monitoring réel sans complexifier l’UI", high: "haute", normal: "normale", low: "basse", pause: "Pause", resume: "Activer", complete: "Terminé", reopen: "Rouvrir", delete: "Supprimer", hint: "Les objectifs actifs guident la prochaine vague. Ils ne modifient jamais automatiquement les tâches." },
    es: { title: "Objetivos del owner", active: "activos", paused: "pausados", done: "hechos", add: "Añadir objetivo", placeholder: "Ej. monitorización real sin complicar la UI", high: "alta", normal: "normal", low: "baja", pause: "Pausar", resume: "Activar", complete: "Hecho", reopen: "Reabrir", delete: "Eliminar", hint: "Los objetivos activos priorizan la siguiente ola. Nunca modifican automáticamente las tareas." },
  };
  return { ...(all.en ?? {}), ...(all[locale] ?? {}) };
}

function Cockpit({ companyId, compact }: { companyId: string; compact: boolean }) {
  const hostNavigation = useHostNavigation();
  const localeHint = useMemo(() => hostLocaleHint(), []);
  const { data, loading, error, refresh } = usePluginData<CockpitData>("cockpit", { companyId, localeHint });
  const markSeen = usePluginAction("mark-seen");
  const setLanguage = usePluginAction("set-language");
  const setLlmSource = usePluginAction("set-llm-source");
  const analyzeNext = usePluginAction("analyze-next");
  const discoverLocalLlm = usePluginAction("discover-local-llm");
  const testLocalLlm = usePluginAction("test-local-llm");
  const addOwnerGoal = usePluginAction("add-owner-goal");
  const updateOwnerGoal = usePluginAction("update-owner-goal");
  const deleteOwnerGoal = usePluginAction("delete-owner-goal");
  const [marking, setMarking] = useState(false);
  const [changingLanguage, setChangingLanguage] = useState(false);
  const [changingSource, setChangingSource] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [testingLlm, setTestingLlm] = useState(false);
  const [discoveringLlm, setDiscoveringLlm] = useState(false);
  const [llmTestResult, setLlmTestResult] = useState<string | null>(null);
  const [newGoalText, setNewGoalText] = useState("");
  const [newGoalPriority, setNewGoalPriority] = useState<OwnerGoal["priority"]>("normal");
  const [goalBusy, setGoalBusy] = useState<string | null>(null);
  const [goalError, setGoalError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), 60000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    if (data?.llm.latestAnalysis?.status !== "running") return;
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [data?.llm.latestAnalysis?.status, refresh]);

  const fallbackLocale = normalizeLocale(localeHint, "en");
  if (loading && !data) return <div style={{ padding: 8 }}>{tr(fallbackLocale, "loading")}</div>;
  if (error) return <div style={{ padding: 8, color: colors.bad }}>Board Cockpit error: {error.message}</div>;
  if (!data) return <div style={{ padding: 8 }}>{tr(fallbackLocale, "noData")}</div>;

  const compatible =
    data.schemaVersion === 7 &&
    Boolean(data.projectState) &&
    Boolean(data.nextState) &&
    Boolean(data.health) &&
    Array.isArray(data.now) &&
    Array.isArray(data.runtimeAnomalies) &&
    Boolean(data.preferences) &&
    Boolean(data.projectContext) &&
    Array.isArray(data.ownerGoals) &&
    Array.isArray(data.activeOwnerGoals) &&
    Boolean(data.llm) &&
    Array.isArray(data.llm.sources) &&
    Array.isArray(data.needsYou) &&
    Array.isArray(data.blocked) &&
    Array.isArray(data.recent) &&
    Array.isArray(data.next);

  const locale = compatible ? normalizeLocale(data.preferences.language, fallbackLocale) : fallbackLocale;
  if (!compatible) {
    return (
      <div style={{ padding: 12, border: `1px solid ${colors.warn}`, borderRadius: 8 }}>
        <div style={{ fontWeight: 800, marginBottom: 5 }}>{tr(locale, "workerReload")}</div>
        <div style={{ color: colors.muted, fontSize: 12, lineHeight: 1.5 }}>
          The current Board Cockpit UI is loaded, but Paperclip is serving an older worker schema. Reinstall or upgrade <code>rolid.board-cockpit</code> and refresh.
        </div>
      </div>
    );
  }

  const healthTone = data.health.tone;
  const gridColumns = compact ? "1fr" : "repeat(2, minmax(0, 1fr))";

  const doMarkSeen = async () => {
    setMarking(true);
    try {
      await markSeen({});
      await refresh();
    } finally {
      setMarking(false);
    }
  };

  const doSetLanguage = async (language: LanguagePreference) => {
    if (language === data.preferences.languagePreference) return;
    setChangingLanguage(true);
    try {
      await setLanguage({ language });
      await refresh();
    } finally {
      setChangingLanguage(false);
    }
  };

  const doSetLlmSource = async (source: string) => {
    if (source === data.llm.selectedSource) return;
    setChangingSource(true);
    setAnalysisError(null);
    try {
      await setLlmSource({ source });
      await refresh();
    } catch (err) {
      setAnalysisError(formatActionError(err));
    } finally {
      setChangingSource(false);
    }
  };

  const doDiscoverLocalLlm = async () => {
    setDiscoveringLlm(true);
    setAnalysisError(null);
    setLlmTestResult(null);
    try {
      const response = await discoverLocalLlm({});
      const envelopeError = actionEnvelopeError(response);
      if (envelopeError) {
        setAnalysisError(envelopeError);
        return;
      }
      const envelope = response as ActionEnvelope<{ selectedModel?: string; advertisedModels?: string[] }>;
      if (envelope.ok) {
        const models = envelope.result.advertisedModels ?? [];
        setLlmTestResult(`Model: ${envelope.result.selectedModel ?? models[0] ?? "unknown"}${models.length > 1 ? ` · ${models.length} available` : ""}`);
      }
      await refresh();
    } catch (err) {
      setAnalysisError(formatActionError(err));
    } finally {
      setDiscoveringLlm(false);
    }
  };

  const doAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisError(null);
    try {
      const response = await analyzeNext({ source: data.llm.selectedSource, localeHint });
      const envelopeError = actionEnvelopeError(response);
      if (envelopeError) {
        setAnalysisError(envelopeError);
        return;
      }
      await refresh();
    } catch (err) {
      setAnalysisError(formatActionError(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const doTestLocalLlm = async () => {
    setTestingLlm(true);
    setAnalysisError(null);
    setLlmTestResult(null);
    try {
      const response = await testLocalLlm({});
      const envelopeError = actionEnvelopeError(response);
      if (envelopeError) {
        setAnalysisError(envelopeError);
        return;
      }
      const envelope = response as ActionEnvelope<{ pong?: string; model?: string; latencyMs?: number }>;
      if (envelope.ok) setLlmTestResult(envelope.result.pong ?? `PONG · ${envelope.result.model ?? data.llm.model}`);
    } catch (err) {
      setAnalysisError(formatActionError(err));
    } finally {
      setTestingLlm(false);
    }
  };


  const doAddGoal = async () => {
    const value = newGoalText.trim();
    if (!value) return;
    setGoalBusy("add");
    setGoalError(null);
    try {
      const response = await addOwnerGoal({ text: value, priority: newGoalPriority });
      const envelopeError = actionEnvelopeError(response);
      if (envelopeError) {
        setGoalError(envelopeError);
        return;
      }
      setNewGoalText("");
      await refresh();
    } catch (err) {
      setGoalError(formatActionError(err));
    } finally {
      setGoalBusy(null);
    }
  };

  const doUpdateGoal = async (goal: OwnerGoal, patch: Partial<Pick<OwnerGoal, "status" | "priority">>) => {
    setGoalBusy(goal.id);
    setGoalError(null);
    try {
      const response = await updateOwnerGoal({ id: goal.id, ...patch });
      const envelopeError = actionEnvelopeError(response);
      if (envelopeError) setGoalError(envelopeError);
      await refresh();
    } catch (err) {
      setGoalError(formatActionError(err));
    } finally {
      setGoalBusy(null);
    }
  };

  const doDeleteGoal = async (goal: OwnerGoal) => {
    setGoalBusy(goal.id);
    setGoalError(null);
    try {
      const response = await deleteOwnerGoal({ id: goal.id });
      const envelopeError = actionEnvelopeError(response);
      if (envelopeError) setGoalError(envelopeError);
      await refresh();
    } catch (err) {
      setGoalError(formatActionError(err));
    } finally {
      setGoalBusy(null);
    }
  };

  const selectedSource = data.llm.sources.find((source) => source.id === data.llm.selectedSource);
  const analysisRunning = data.llm.latestAnalysis?.status === "running";
  const persistedAnalysisError = data.llm.latestAnalysis?.status === "error" ? data.llm.latestAnalysis.error ?? "Unknown LLM error" : null;

  const llmSection = (
    <Section title={tr(locale, "llm")}>
      <div style={{ display: "grid", gap: 13, height: "100%", alignContent: "start" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 750, fontSize: 13 }}>
              {data.llm.configured ? tr(locale, "llmReady") : tr(locale, "llmUnavailable")}
            </div>
            <div style={{ color: colors.muted, fontSize: 11, marginTop: 3 }}>
              {selectedSource?.kind === "agent"
                ? tr(locale, "agentSourceHint")
                : tr(locale, "localSourceHint", { model: data.llm.model })}
            </div>
          </div>
          <Badge tone={analysisRunning ? "info" : data.llm.configured ? "ok" : "warn"}>
            {analysisRunning
              ? "analysis running"
              : selectedSource?.kind === "agent"
                ? `${selectedSource.adapterType}${selectedSource.model ? ` · ${selectedSource.model}` : ""}`
                : `${data.llm.model}${data.llm.allowPrivateNetwork ? " · LAN direct" : ""}`}
          </Badge>
        </div>

        <div style={{ background: colors.soft, borderRadius: 9, padding: 11, border: `1px solid ${colors.border}` }}>
          <label
            htmlFor={`llm-source-${compact ? "compact" : "page"}`}
            style={{ display: "block", color: colors.muted, fontSize: 11, fontWeight: 700, marginBottom: 6 }}
          >
            {tr(locale, "llmSource")}
          </label>
          <select
            id={`llm-source-${compact ? "compact" : "page"}`}
            disabled={changingSource || analysisRunning}
            value={data.llm.selectedSource}
            onChange={(event) => void doSetLlmSource(event.target.value)}
            style={{
              width: "100%",
              minHeight: 40,
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "7px 10px",
              background: colors.bg,
              color: "inherit",
              fontWeight: 600,
            }}
          >
            <optgroup label={tr(locale, "localLlm")}>
              {data.llm.sources.filter((source) => source.kind === "local").map((source) => (
                <option key={source.id} value={source.id} disabled={!source.available}>
                  {source.label}{source.model ? ` · ${source.model}` : ""}{!source.available ? " · unavailable" : ""}
                </option>
              ))}
            </optgroup>
            <optgroup label={tr(locale, "paperclipAgent")}>
              {data.llm.sources.filter((source) => source.kind === "agent").map((source) => (
                <option key={source.id} value={source.id} disabled={!source.available}>
                  {source.label} · {source.adapterType}{source.model ? ` · ${source.model}` : ""}{!source.available ? " · unavailable" : ""}
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ActionButton
            variant="primary"
            disabled={!data.llm.configured || analyzing || analysisRunning}
            onClick={() => void doAnalyze()}
          >
            {analysisRunning ? "Analýza běží…" : analyzing ? tr(locale, "analyzing") : tr(locale, "analyze")}
          </ActionButton>

          {selectedSource?.kind === "local" ? (
            <>
              <ActionButton disabled={discoveringLlm || analysisRunning} onClick={() => void doDiscoverLocalLlm()}>
                {discoveringLlm ? "Zjišťuji model…" : "Zjistit model"}
              </ActionButton>
              <ActionButton disabled={testingLlm || analysisRunning} onClick={() => void doTestLocalLlm()}>
                {testingLlm ? tr(locale, "testingConnection") : tr(locale, "testLocalLlm")}
              </ActionButton>
            </>
          ) : null}

          <a
            {...hostNavigation.linkProps("/company/settings/instance/plugins")}
            style={{
              border: `1px solid ${colors.border}`,
              borderRadius: 8,
              padding: "8px 12px",
              fontWeight: 650,
              color: "inherit",
              textDecoration: "none",
              lineHeight: 1.2,
            }}
          >
            {tr(locale, "settings")}
          </a>
        </div>

        {selectedSource?.kind === "local" ? (
          <div style={{ color: colors.muted, fontSize: 11, lineHeight: 1.45 }}>
            Stačí zadat URL endpointu. „Zjistit model“ načte <code>/v1/models</code> a model vybere automaticky. V nastavení už název modelu ručně zadávat nemusíš.
          </div>
        ) : null}

        {llmTestResult ? (
          <div style={{ border: `1px solid ${colors.ok}`, borderRadius: 8, padding: "8px 10px", color: colors.ok, fontWeight: 750, fontSize: 12 }}>
            ✓ {llmTestResult}
          </div>
        ) : null}

        {analysisError || persistedAnalysisError ? (
          <div style={{ border: `1px solid ${colors.bad}`, borderRadius: 8, padding: "9px 10px", background: "rgba(196,59,59,.06)" }}>
            <div style={{ color: colors.bad, fontWeight: 750, fontSize: 12, marginBottom: 3 }}>LLM analysis failed</div>
            <div style={{ color: colors.bad, fontSize: 12, whiteSpace: "pre-wrap", lineHeight: 1.45 }}>{analysisError ?? persistedAnalysisError}</div>
          </div>
        ) : null}

        {analysisRunning ? (
          <div style={{ border: `1px solid ${colors.info}`, borderRadius: 9, background: "rgba(53,105,168,.06)", padding: 11 }}>
            <div style={{ color: colors.info, fontWeight: 750, fontSize: 12 }}>LLM analýza běží na pozadí…</div>
            <div style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>Cockpit výsledek automaticky načte po dokončení. Můžeš mezitím dál používat Paperclip.</div>
          </div>
        ) : null}

        <AnalysisSecurityNotices analysis={data.llm.latestAnalysis} locale={locale} />

        {data.llm.latestAnalysis?.status !== "running" && data.llm.latestAnalysis?.analysis ? (
          <div style={{ border: `1px solid ${colors.border}`, borderRadius: 9, background: colors.soft, padding: 12, minHeight: compact ? undefined : 260 }}>
            <div style={{ color: colors.muted, fontSize: 11, marginBottom: 8 }}>
              {tr(locale, "latestAnalysis")}
              {data.llm.latestAnalysis.sourceLabel ? ` · ${data.llm.latestAnalysis.sourceLabel}` : ""}
              {data.llm.latestAnalysis.model ? ` · ${data.llm.latestAnalysis.model}` : ""}
              {data.llm.latestAnalysis.generatedAt ? ` · ${fmt(data.llm.latestAnalysis.generatedAt)}` : ""}
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.6 }}><RichText text={data.llm.latestAnalysis.analysis} hostNavigation={hostNavigation} sources={data.llm.latestAnalysis.sources} locale={locale} /></div>
          </div>
        ) : null}
      </div>
    </Section>
  );

  const nowSection = (
    <Section title={tr(locale, "now")}>
      {data.now.length === 0 ? <Empty>{tr(locale, "nobody")}</Empty> : (
        <div style={{ display: "grid", gap: 12 }}>
          {data.now.map((agent) => (
            <div key={agent.id}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{agent.name}</strong>
                <Badge tone="ok">{tr(locale, "running")}</Badge>
              </div>
              {agent.issue ? <div style={{ marginTop: 5 }}><IssueLine issue={agent.issue} /></div> : null}
              <div style={{ marginTop: 4, color: colors.muted, fontSize: 11 }}>
                {tr(locale, "lastHeartbeat")}: {relativeMinutes(agent.heartbeatAgeMinutes, locale)} {tr(locale, "ago")}
                {agent.runAgeMinutes !== null ? ` · ${tr(locale, "runAge")}: ${relativeMinutes(agent.runAgeMinutes, locale)}` : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );

  const needsSection = (
    <Section title={tr(locale, "needsMe")}>
      {data.needsYou.length === 0 ? <Empty>{tr(locale, "nothingNeeds")}</Empty> : (
        <div style={{ display: "grid", gap: 10 }}>
          {data.needsYou.map((item, index) => (
            <div key={`${item.kind}-${item.approvalId ?? item.issue?.id ?? index}`}>
              <Badge tone="warn">{item.kind}</Badge> <span style={{ marginLeft: 6 }}>{item.label}</span>
              {item.issue ? <div style={{ marginTop: 4 }}><IssueLine issue={item.issue} /></div> : null}
            </div>
          ))}
        </div>
      )}
    </Section>
  );

  const nextSection = (
    <Section title={tr(locale, "next")}>
      <div style={{ display: "grid", gap: 6, marginBottom: data.next.length ? 10 : 0 }}>
        <strong>{data.nextState.summary}</strong>
        <div style={{ color: colors.muted, fontSize: 12 }}>{data.nextState.reason}</div>
        <div style={{ fontSize: 12 }}><strong>{tr(locale, "owner")}:</strong> {data.nextState.ownerAction}</div>
      </div>
      {data.next.length > 0 ? (
        <div style={{ display: "grid", gap: 9, paddingTop: 8, borderTop: `1px solid ${colors.border}` }}>
          {data.next.map((issue) => <IssueLine key={issue.id} issue={issue} />)}
        </div>
      ) : null}
    </Section>
  );


  const goalLabel = ownerGoalLabels(locale);
  const ownerGoalsSection = (
    <div id="board-cockpit-owner-goals">
    <Section title={goalLabel.title ?? "Owner goals"} full>
      <div style={{ display: "grid", gap: 10 }}>
        <div style={{ color: colors.muted, fontSize: 11, lineHeight: 1.45 }}>{goalLabel.hint}</div>
        {!compact ? (
          <div style={{ display: "grid", gridTemplateColumns: "minmax(240px,1fr) 120px auto", gap: 7 }}>
            <input
              value={newGoalText}
              maxLength={600}
              placeholder={goalLabel.placeholder}
              onChange={(event) => setNewGoalText(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void doAddGoal(); } }}
              style={{ minHeight: 36, border: `1px solid ${colors.border}`, borderRadius: 7, padding: "6px 9px", background: colors.bg, color: "inherit" }}
            />
            <select
              value={newGoalPriority}
              onChange={(event) => setNewGoalPriority(event.target.value as OwnerGoal["priority"])}
              style={{ minHeight: 36, border: `1px solid ${colors.border}`, borderRadius: 7, padding: "6px 8px", background: colors.bg, color: "inherit" }}
            >
              <option value="high">{goalLabel.high}</option>
              <option value="normal">{goalLabel.normal}</option>
              <option value="low">{goalLabel.low}</option>
            </select>
            <ActionButton variant="primary" disabled={!newGoalText.trim() || goalBusy === "add"} onClick={() => void doAddGoal()}>
              {goalBusy === "add" ? "…" : goalLabel.add}
            </ActionButton>
          </div>
        ) : null}
        {goalError ? <div style={{ color: colors.bad, fontSize: 12 }}>{goalError}</div> : null}
        {data.ownerGoals.length === 0 ? (
          <Empty>—</Empty>
        ) : (
          <div style={{ display: "grid", gap: 7 }}>
            {data.ownerGoals.map((goal) => (
              <div key={goal.id} style={{ display: "grid", gridTemplateColumns: "auto minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: "8px 9px", border: `1px solid ${colors.border}`, borderRadius: 8, opacity: goal.status === "done" ? 0.65 : 1 }}>
                <Badge tone={goal.status === "active" ? (goal.priority === "high" ? "warn" : "ok") : "neutral"}>
                  {goal.status === "active" ? `${goalLabel.active} · ${goalLabel[goal.priority]}` : goal.status === "paused" ? goalLabel.paused : goalLabel.done}
                </Badge>
                <div style={{ fontSize: 12, lineHeight: 1.4, textDecoration: goal.status === "done" ? "line-through" : "none" }}>{goal.text}</div>
                {!compact ? (
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {goal.status === "active" ? <ActionButton disabled={goalBusy === goal.id} onClick={() => void doUpdateGoal(goal, { status: "paused" })}>{goalLabel.pause}</ActionButton> : null}
                    {goal.status === "paused" ? <ActionButton disabled={goalBusy === goal.id} onClick={() => void doUpdateGoal(goal, { status: "active" })}>{goalLabel.resume}</ActionButton> : null}
                    {goal.status !== "done" ? <ActionButton disabled={goalBusy === goal.id} onClick={() => void doUpdateGoal(goal, { status: "done" })}>{goalLabel.complete}</ActionButton> : <ActionButton disabled={goalBusy === goal.id} onClick={() => void doUpdateGoal(goal, { status: "active" })}>{goalLabel.reopen}</ActionButton>}
                    <ActionButton disabled={goalBusy === goal.id} onClick={() => void doDeleteGoal(goal)}>{goalLabel.delete}</ActionButton>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>
    </Section>
    </div>
  );

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: compact ? 16 : 22 }}>Board Cockpit <span style={{ color: colors.muted, fontSize: compact ? 11 : 13, fontWeight: 600 }}>v{BOARD_COCKPIT_VERSION}</span></div>
          <div style={{ color: colors.muted, fontSize: 12 }}>
            {tr(locale, "ownerView")} · {fmt(data.generatedAt)}{data.lastSeenAt ? ` · ${fmt(data.lastSeenAt)}` : " · 24 h"}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ color: colors.muted, fontSize: 11 }} htmlFor={`cockpit-language-${compact ? "compact" : "page"}`}>{tr(locale, "language")}:</label>
          <select
            id={`cockpit-language-${compact ? "compact" : "page"}`}
            disabled={changingLanguage}
            value={data.preferences.languagePreference}
            onChange={(event) => void doSetLanguage(event.target.value as LanguagePreference)}
          >
            <option value="auto">{tr(locale, "auto")} ({LANGUAGE_NAMES[normalizeLocale(localeHint, "en")]})</option>
            {SUPPORTED_LOCALES.map((item) => <option key={item} value={item}>{LANGUAGE_NAMES[item]}</option>)}
          </select>
          <button onClick={() => void refresh()}>{tr(locale, "refresh")}</button>
          <button disabled={marking} onClick={() => void doMarkSeen()}>{marking ? tr(locale, "saving") : tr(locale, "markSeen")}</button>
          {compact ? <a {...hostNavigation.linkProps("/cockpit")}>{tr(locale, "openFull")}</a> : null}
        </div>
      </div>

      <ProjectState data={data} locale={locale} />

      {ownerGoalsSection}

      <div style={{ display: "flex", gap: 20, flexWrap: "wrap", border: `1px solid ${colors.border}`, borderRadius: 10, padding: 14 }}>
        <Stat label={tr(locale, "running")} value={data.stats.runningAgents} tone={data.stats.runningAgents > 0 ? "ok" : "neutral"} />
        <Stat label={tr(locale, "runnable")} value={data.stats.runnable} tone={data.stats.runnable > 0 && data.stats.runningAgents === 0 ? "warn" : "neutral"} />
        <Stat label={tr(locale, "needsYou")} value={data.stats.needsYou} tone={data.stats.needsYou > 0 ? "warn" : "ok"} />
        <Stat label={tr(locale, "blocked")} value={data.stats.blocked} tone={data.stats.blocked > 0 ? "warn" : "ok"} />
        <Stat label={tr(locale, "doneSince")} value={data.stats.doneSince} />
        <Stat label={tr(locale, "open")} value={data.stats.open} />
      </div>

      {compact ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
          {nowSection}
          {needsSection}
          {nextSection}
          {llmSection}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 0.72fr) minmax(520px, 1.28fr)", gap: 12, alignItems: "stretch" }}>
          <div style={{ display: "grid", gap: 12, alignContent: "start" }}>
            {nowSection}
            {needsSection}
            {nextSection}
          </div>
          {llmSection}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: gridColumns, gap: 12 }}>
        {data.runtimeAnomalies.length > 0 ? (
          <Section title={tr(locale, "runtimeSignals")}>
            <div style={{ display: "grid", gap: 12 }}>
              {data.runtimeAnomalies.map((agent) => (
                <div key={agent.id}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <strong>{agent.name}</strong>
                    <Badge tone="warn">{tr(locale, "reportedRunningBadge")}</Badge>
                    <Badge tone="neutral">{tr(locale, "noActiveIssue")}</Badge>
                  </div>
                  <div style={{ marginTop: 5, fontSize: 12, color: agent.staleWithoutIssue ? colors.warn : colors.muted }}>
                    {tr(locale, "reportedRunning")}. {agent.staleWithoutIssue ? tr(locale, "staleRuntime") : tr(locale, "transientRuntime")}
                  </div>
                  <div style={{ marginTop: 4, color: colors.muted, fontSize: 11 }}>
                    {tr(locale, "lastHeartbeat")}: {relativeMinutes(agent.heartbeatAgeMinutes, locale)} {tr(locale, "ago")}
                    {agent.runAgeMinutes !== null ? ` · ${tr(locale, "runAge")}: ${relativeMinutes(agent.runAgeMinutes, locale)}` : ""}
                  </div>
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        <Section title={tr(locale, "waitingFor")}>
          {data.blocked.length === 0 ? <Empty>{tr(locale, "noBlocked")}</Empty> : (
            <div style={{ display: "grid", gap: 12 }}>
              {data.blocked.map((issue) => (
                <div key={issue.id}>
                  <IssueLine issue={issue} />
                  <div style={{ marginLeft: 12, marginTop: 4, color: issue.unresolvedBlockerCount === 0 ? colors.bad : colors.muted, fontSize: 12 }}>
                    {issue.blockers.length === 0
                      ? tr(locale, "staleBlocked")
                      : `${tr(locale, "blockedBy")}: ${issue.blockers.map((b) => `${b.identifier} (${b.status})`).join(", ")}`}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <Section title={tr(locale, "feed")} full={!compact}>
          {data.recent.length === 0 ? <Empty>{tr(locale, "nothingNew")}</Empty> : (
            <div style={{ display: "grid", gap: 12 }}>
              {data.recent.slice(0, compact ? 5 : 8).map((issue) => <CompletionCard key={issue.id} issue={issue} locale={locale} />)}
            </div>
          )}
        </Section>

        <Section title={tr(locale, "health")}>
          <div style={{ display: "grid", gap: 8 }}>
            {data.health.items.map((item, index) => (
              <div key={index} style={{ color: item.tone === "bad" ? colors.bad : item.tone === "warn" ? colors.warn : colors.ok }}>
                {item.tone === "ok" ? "✓" : item.tone === "warn" ? "⚠" : "✕"} {item.text}
              </div>
            ))}
            <div><Badge tone={healthTone === "bad" ? "bad" : healthTone === "warn" ? "warn" : "ok"}>{healthTone.toUpperCase()}</Badge></div>
          </div>
        </Section>
      </div>
    </div>
  );
}

export function DashboardWidget({ context }: PluginWidgetProps) {
  if (!context.companyId) return <div>Board Cockpit needs a company context.</div>;
  return <Cockpit companyId={context.companyId} compact />;
}

export function CockpitPage({ context }: PluginPageProps) {
  if (!context.companyId) return <div style={{ padding: 20 }}>Board Cockpit needs a company context.</div>;
  return <div style={{ padding: 20, maxWidth: 1500, margin: "0 auto" }}><Cockpit companyId={context.companyId} compact={false} /></div>;
}

export function CockpitSidebarLink({ context }: PluginSidebarProps) {
  const hostNavigation = useHostNavigation();
  if (!context.companyId) return null;
  return (
    <a
      {...hostNavigation.linkProps("/cockpit")}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        width: "100%",
        padding: "6px 8px",
        borderRadius: 6,
        color: "inherit",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 550,
      }}
    >
      <span aria-hidden="true">◫</span>
      <span>Board Cockpit</span>
    </a>
  );
}

function assistantLabels(locale: Locale) {
  const all: Partial<Record<Locale, Record<string, string>>> = {
    cs: {
      title: "Cockpit Assistant", ownerNeed: "Co se po mně chce", noOwnerNeed: "Task neobsahuje žádný explicitní approval ani otázku pro ownera.",
      ownerNeedYes: "Task obsahuje položku, která vyžaduje zásah ownera.", summarize: "Shrnout a vysvětlit", next: "Co mám udělat dál", reply: "Navrhnout odpověď", translate: "Přeložit", copyReply: "Kopírovat odpověď", continue: "Navrhnout další task", copyNext: "Kopírovat další task", draftTask: "Navržený další task", advisoryMeta: "Poznámky poradce pro ownera", projectContext: "Výchozí kontext projektu", originalGoal: "Původní zadání",
      running: "Analýza běží…", latest: "Poslední analýza", noAnalysis: "Spusť jednu z analýz výše. Nic se nespouští automaticky.", source: "Model pro radu",
      pending: "Čeká na ownera", blockers: "Blockery", children: "Podtasky", comments: "Komentářů v kontextu", error: "Analýza selhala",
      wave: "Kontext implementační vlny", verify: "Co mám zkontrolovat", root: "Kořen vlny", parent: "Rodič", waveDone: "Hotovo ve vlně", checkHere: "Kde ověřovat",
    },
    en: {
      title: "Cockpit Assistant", ownerNeed: "What is being asked of me", noOwnerNeed: "The task contains no explicit approval or owner question.",
      ownerNeedYes: "The task contains an item that requires owner action.", summarize: "Summarize and explain", next: "What should I do next", reply: "Draft a reply", translate: "Translate", copyReply: "Copy reply", continue: "Draft next task", copyNext: "Copy next task", draftTask: "Proposed next task", advisoryMeta: "Owner advisory metadata", projectContext: "Original project context", originalGoal: "Original brief",
      running: "Analysis running…", latest: "Latest analysis", noAnalysis: "Run one of the analyses above. Nothing runs automatically.", source: "Advice model",
      pending: "Needs owner", blockers: "Blockers", children: "Subtasks", comments: "Comments in context", error: "Analysis failed",
      wave: "Implementation wave context", verify: "What should I verify", root: "Wave root", parent: "Parent", waveDone: "Done in wave", checkHere: "Where to verify",
    },
    de: { title: "Cockpit Assistant", ownerNeed: "Was wird von mir erwartet", noOwnerNeed: "Keine explizite Freigabe oder Owner-Frage erkannt.", ownerNeedYes: "Diese Aufgabe enthält eine Owner-Aktion.", summarize: "Zusammenfassen", next: "Was soll ich als Nächstes tun", reply: "Antwort vorschlagen", translate: "Übersetzen", copyReply: "Antwort kopieren", continue: "Nächste Aufgabe vorschlagen", copyNext: "Nächste Aufgabe kopieren", projectContext: "Ursprünglicher Projektkontext", originalGoal: "Ursprünglicher Auftrag", running: "Analyse läuft…", latest: "Letzte Analyse", noAnalysis: "Starte oben eine Analyse.", source: "Beratungsmodell", pending: "Owner erforderlich", blockers: "Blocker", children: "Unteraufgaben", comments: "Kommentare im Kontext", error: "Analyse fehlgeschlagen", wave: "Kontext der Implementierungswelle", verify: "Was soll ich prüfen", root: "Wellenwurzel", parent: "Eltern-Task", waveDone: "Erledigt in der Welle", checkHere: "Wo prüfen" },
    pl: { title: "Cockpit Assistant", ownerNeed: "Czego się ode mnie oczekuje", noOwnerNeed: "Brak jawnej akceptacji lub pytania do ownera.", ownerNeedYes: "Task wymaga działania ownera.", summarize: "Podsumuj i wyjaśnij", next: "Co mam zrobić dalej", reply: "Zaproponuj odpowiedź", translate: "Przetłumacz", copyReply: "Kopiuj odpowiedź", continue: "Zaproponuj następny task", copyNext: "Kopiuj następny task", projectContext: "Początkowy kontekst projektu", originalGoal: "Pierwotne zadanie", running: "Analiza trwa…", latest: "Ostatnia analiza", noAnalysis: "Uruchom jedną z analiz powyżej.", source: "Model doradczy", pending: "Czeka na ownera", blockers: "Blokery", children: "Podzadania", comments: "Komentarze w kontekście", error: "Analiza nieudana", wave: "Kontekst fali wdrożeniowej", verify: "Co mam sprawdzić", root: "Korzeń fali", parent: "Rodzic", waveDone: "Ukończono w fali", checkHere: "Gdzie sprawdzić" },
    sk: { title: "Cockpit Assistant", ownerNeed: "Čo sa odo mňa chce", noOwnerNeed: "Task neobsahuje explicitný approval ani otázku pre ownera.", ownerNeedYes: "Task vyžaduje zásah ownera.", summarize: "Zhrnúť a vysvetliť", next: "Čo mám urobiť ďalej", reply: "Navrhnúť odpoveď", translate: "Preložiť", copyReply: "Kopírovať odpoveď", continue: "Navrhnúť ďalší task", copyNext: "Kopírovať ďalší task", projectContext: "Pôvodný kontext projektu", originalGoal: "Pôvodné zadanie", running: "Analýza beží…", latest: "Posledná analýza", noAnalysis: "Spusť jednu z analýz vyššie.", source: "Model poradcu", pending: "Čaká na ownera", blockers: "Blockery", children: "Podtasky", comments: "Komentáre v kontexte", error: "Analýza zlyhala", wave: "Kontext implementačnej vlny", verify: "Čo mám skontrolovať", root: "Koreň vlny", parent: "Rodič", waveDone: "Hotovo vo vlne", checkHere: "Kde overiť" },
    fr: { title: "Cockpit Assistant", ownerNeed: "Ce qu'on me demande", noOwnerNeed: "Aucune approbation ou question explicite pour l’owner.", ownerNeedYes: "Cette tâche requiert une action de l’owner.", summarize: "Résumer et expliquer", next: "Que faire ensuite", reply: "Proposer une réponse", translate: "Traduire", copyReply: "Copier la réponse", continue: "Proposer la tâche suivante", copyNext: "Copier la tâche suivante", projectContext: "Contexte initial du projet", originalGoal: "Brief initial", running: "Analyse en cours…", latest: "Dernière analyse", noAnalysis: "Lancez une analyse ci-dessus.", source: "Modèle conseiller", pending: "Attend l’owner", blockers: "Blocages", children: "Sous-tâches", comments: "Commentaires en contexte", error: "Échec de l’analyse", wave: "Contexte de la vague d’implémentation", verify: "Que dois-je vérifier", root: "Racine de la vague", parent: "Parent", waveDone: "Terminé dans la vague", checkHere: "Où vérifier" },
    es: { title: "Cockpit Assistant", ownerNeed: "Qué se me pide", noOwnerNeed: "No hay aprobación ni pregunta explícita para el owner.", ownerNeedYes: "Esta tarea requiere acción del owner.", summarize: "Resumir y explicar", next: "Qué debo hacer después", reply: "Proponer respuesta", translate: "Traducir", copyReply: "Copiar respuesta", continue: "Proponer siguiente tarea", copyNext: "Copiar siguiente tarea", projectContext: "Contexto inicial del proyecto", originalGoal: "Brief original", running: "Análisis en curso…", latest: "Último análisis", noAnalysis: "Ejecuta un análisis arriba.", source: "Modelo asesor", pending: "Espera al owner", blockers: "Bloqueos", children: "Subtareas", comments: "Comentarios en contexto", error: "Falló el análisis", wave: "Contexto de la ola de implementación", verify: "Qué debo verificar", root: "Raíz de la ola", parent: "Padre", waveDone: "Completado en la ola", checkHere: "Dónde verificar" },
  };
  return all[locale] ?? all.en!;
}

export function IssueCockpitAssistant({ context }: PluginDetailTabProps) {
  const companyId = context.companyId;
  const issueId = context.entityId;
  const localeHint = useMemo(() => hostLocaleHint(), []);
  const { data, loading, error, refresh } = usePluginData<IssueAssistantData>("issue-assistant", {
    companyId,
    issueId,
    localeHint,
  });
  const analyzeIssue = usePluginAction("analyze-issue");
  const setLlmSource = usePluginAction("set-llm-source");
  const hostNavigation = useHostNavigation();
  const [starting, setStarting] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<string | null>(null);

  useEffect(() => {
    if (data?.latestAnalysis?.status !== "running") return;
    const timer = window.setInterval(() => void refresh(), 2000);
    return () => window.clearInterval(timer);
  }, [data?.latestAnalysis?.status, refresh]);

  if (!companyId || !issueId) return null;
  if (loading && !data) return <div style={{ padding: 10, color: colors.muted }}>Loading Cockpit Assistant…</div>;
  if (error) return <div style={{ padding: 10, color: colors.bad }}>Cockpit Assistant: {error.message}</div>;
  if (!data) return null;

  const locale = normalizeLocale(data.preferences.language, normalizeLocale(localeHint, "en"));
  const label = assistantLabels(locale);
  const latest = data.latestAnalysis;
  const running = latest?.status === "running";
  const selectedSource = data.llm.sources.find((source) => source.id === data.llm.selectedSource);
  const draftReply = extractLabeledSection(latest?.analysis, "DRAFT REPLY");
  const draftNextTask =
    extractDelimitedBlock(latest?.analysis, "=== DRAFT NEXT TASK BEGIN ===", "=== DRAFT NEXT TASK END ===") ||
    extractLabeledSection(latest?.analysis, "DRAFT NEXT TASK");
  const activeMode = (starting ?? latest?.mode ?? null) as string | null;

  const run = async (mode: "summary" | "next" | "verify" | "reply" | "translate" | "continue") => {
    setStarting(mode);
    setLocalError(null);
    try {
      const snapshot = {
        issue: {
          id: data.issue.id,
          identifier: data.issue.identifier,
          title: data.issue.title,
          description: data.issue.description.slice(0, 10000),
          status: data.issue.status,
          priority: data.issue.priority,
          updatedAt: data.issue.updatedAt,
          assigneeAgentId: data.issue.assigneeAgentId,
          assigneeName: data.issue.assigneeName,
          parent: data.issue.parent,
        },
        children: data.children.slice(0, 20).map((child) => ({
          id: child.id,
          identifier: child.identifier,
          title: child.title,
          status: child.status,
        })),
        relations: {
          blockedBy: data.relations.blockers.map((item) => ({
            identifier: item.identifier,
            title: item.title,
            status: item.status,
          })),
          blocks: data.relations.blocks.map((item) => ({
            identifier: item.identifier,
            title: item.title,
            status: item.status,
          })),
        },
        pendingInteractions: data.pendingInteractions.map((item) => item.label),
        pendingApprovals: data.pendingApprovals.map((item) => ({ type: item.type, status: item.status })),
        recentComments: data.recentComments.slice(0, 10).map((item) => ({
          id: item.id,
          createdAt: item.createdAt,
          body: item.body.slice(0, 3500),
          authorAgentId: item.authorAgentId,
          actorUserId: item.actorUserId,
        })),
        taskBrief: data.taskBrief,
        projectContext: data.projectContext,
        ownerGoals: data.ownerGoals,
        activeOwnerGoals: data.activeOwnerGoals,
        waveContext: {
          root: data.waveContext.root,
          parent: data.waveContext.parent,
          ancestors: data.waveContext.ancestors,
          siblings: data.waveContext.siblings.slice(0, 20),
          members: data.waveContext.members.slice(0, 50),
          stats: data.waveContext.stats,
          briefings: data.waveContext.briefings.slice(0, 10),
          ownerGuidance: data.waveContext.ownerGuidance,
        },
      };
      const response = await analyzeIssue({
        issueId,
        source: data.llm.selectedSource,
        mode,
        localeHint,
        languagePreference: data.preferences.languagePreference,
        language: data.preferences.language,
        snapshot,
      });
      const envelopeError = actionEnvelopeError(response);
      if (envelopeError) setLocalError(envelopeError);
      await refresh();
    } catch (err) {
      setLocalError(formatActionError(err));
    } finally {
      setStarting(null);
    }
  };

  const changeSource = async (source: string) => {
    setLocalError(null);
    try {
      const response = await setLlmSource({ source });
      const envelopeError = actionEnvelopeError(response);
      if (envelopeError) setLocalError(envelopeError);
      await refresh();
    } catch (err) {
      setLocalError(formatActionError(err));
    }
  };

  const copyReply = async () => {
    if (!draftReply) return;
    await copyTextToClipboard(draftReply);
    setCopyState("✓");
    window.setTimeout(() => setCopyState(null), 1400);
  };

  const copyNextTask = async () => {
    if (!draftNextTask) return;
    await copyTextToClipboard(draftNextTask);
    setCopyState("✓");
    window.setTimeout(() => setCopyState(null), 1400);
  };

  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12, marginTop: 10, background: colors.bg, display: "grid", gap: 11 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800 }}>{label.title}</div>
          <div style={{ color: colors.muted, fontSize: 11, marginTop: 2 }}>
            {data.issue.identifier} · {data.issue.status} · {data.issue.assigneeName ?? "unassigned"}
          </div>
        </div>
        <Badge tone={data.ownerActionDetected ? "warn" : "ok"}>{data.ownerActionDetected ? label.pending : "read-only"}</Badge>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, background: colors.soft, padding: 9, borderRadius: 8 }}>
        <div><strong>{data.pendingInteractions.length + data.pendingApprovals.length}</strong><div style={{ color: colors.muted, fontSize: 10 }}>{label.ownerNeed}</div></div>
        <div><strong>{data.relations.blockers.length}</strong><div style={{ color: colors.muted, fontSize: 10 }}>{label.blockers}</div></div>
        <div><strong>{data.children.length}</strong><div style={{ color: colors.muted, fontSize: 10 }}>{label.children}</div></div>
        <div><strong>{data.recentComments.length}</strong><div style={{ color: colors.muted, fontSize: 10 }}>{label.comments}</div></div>
      </div>

      <div style={{ fontSize: 12, borderLeft: `3px solid ${data.ownerActionDetected ? colors.warn : colors.ok}`, paddingLeft: 9 }}>
        <strong>{label.ownerNeed}:</strong> {data.ownerActionDetected ? label.ownerNeedYes : label.noOwnerNeed}
      </div>

      {data.projectContext.origin ? (
        <div style={{ background: colors.soft, borderRadius: 8, padding: 10, display: "grid", gap: 6 }}>
          <div style={{ fontWeight: 800, fontSize: 12 }}>{label.projectContext}</div>
          <div style={{ fontSize: 12 }}>
            <span style={{ color: colors.muted }}>{label.originalGoal}:</span>{" "}
            <a {...hostNavigation.linkProps(`/issues/${data.projectContext.origin.identifier}`)} style={{ color: colors.info, textDecoration: "underline", fontWeight: 800 }}>
              {data.projectContext.origin.identifier} {data.projectContext.origin.title}
            </a>
          </div>
          {data.projectContext.origin.description ? <div style={{ color: colors.muted, fontSize: 11, lineHeight: 1.45 }}>{data.projectContext.origin.description.slice(0, 700)}{data.projectContext.origin.description.length > 700 ? "…" : ""}</div> : null}
        </div>
      ) : null}

      <div style={{ background: colors.soft, borderRadius: 8, padding: 10, display: "grid", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 12 }}>{label.wave}</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, fontSize: 11 }}>
          <div><span style={{ color: colors.muted }}>{label.root}:</span> <a {...hostNavigation.linkProps(`/issues/${data.waveContext.root.identifier}`)} style={{ color: "inherit", fontWeight: 700 }}>{data.waveContext.root.identifier}</a> · {data.waveContext.root.status}</div>
          <div><span style={{ color: colors.muted }}>{label.parent}:</span> {data.waveContext.parent ? <a {...hostNavigation.linkProps(`/issues/${data.waveContext.parent.identifier}`)} style={{ color: "inherit", fontWeight: 700 }}>{data.waveContext.parent.identifier}</a> : "—"}</div>
          <div><span style={{ color: colors.muted }}>{label.waveDone}:</span> <strong>{data.waveContext.stats.done}/{data.waveContext.stats.total}</strong></div>
        </div>
        <div style={{ fontSize: 12, borderLeft: `3px solid ${data.waveContext.ownerGuidance.directAction ? colors.warn : colors.info}`, paddingLeft: 9 }}>
          <strong>{label.checkHere}:</strong> {data.waveContext.ownerGuidance.reason} {data.waveContext.ownerGuidance.checkIssue.identifier !== data.issue.identifier ? <a {...hostNavigation.linkProps(`/issues/${data.waveContext.ownerGuidance.checkIssue.identifier}`)} style={{ color: "inherit", fontWeight: 800 }}>→ {data.waveContext.ownerGuidance.checkIssue.identifier}</a> : null}
          {data.waveContext.ownerGuidance.manualTest ? <div style={{ marginTop: 5, color: colors.muted }}>Manual test: <RichText text={data.waveContext.ownerGuidance.manualTest} hostNavigation={hostNavigation} locale={locale} /></div> : null}
        </div>
      </div>

      <div style={{ display: "grid", gap: 6 }}>
        <label style={{ color: colors.muted, fontSize: 11, fontWeight: 700 }}>{label.source}</label>
        <select
          value={data.llm.selectedSource}
          disabled={running}
          onChange={(event) => void changeSource(event.target.value)}
          style={{ minHeight: 36, border: `1px solid ${colors.border}`, borderRadius: 7, padding: "6px 8px", background: colors.bg, color: "inherit" }}
        >
          {data.llm.sources.map((source) => (
            <option key={source.id} value={source.id} disabled={!source.available}>
              {source.label} · {source.model ?? source.adapterType}{!source.available ? " · unavailable" : ""}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        <ActionButton variant={activeMode === "summary" ? "primary" : "secondary"} disabled={!data.llm.enabled || running || Boolean(starting)} onClick={() => void run("summary")}>{starting === "summary" ? label.running : label.summarize}</ActionButton>
        <ActionButton variant={activeMode === "next" ? "primary" : "secondary"} disabled={!data.llm.enabled || running || Boolean(starting)} onClick={() => void run("next")}>{starting === "next" ? label.running : label.next}</ActionButton>
        <ActionButton variant={activeMode === "verify" ? "primary" : "secondary"} disabled={!data.llm.enabled || running || Boolean(starting)} onClick={() => void run("verify")}>{starting === "verify" ? label.running : label.verify}</ActionButton>
        <ActionButton variant={activeMode === "continue" ? "primary" : "secondary"} disabled={!data.llm.enabled || running || Boolean(starting)} onClick={() => void run("continue")}>{starting === "continue" ? label.running : label.continue}</ActionButton>
        <ActionButton variant={activeMode === "reply" ? "primary" : "secondary"} disabled={!data.llm.enabled || running || Boolean(starting)} onClick={() => void run("reply")}>{starting === "reply" ? label.running : label.reply}</ActionButton>
        <ActionButton variant={activeMode === "translate" ? "primary" : "secondary"} disabled={!data.llm.enabled || running || Boolean(starting)} onClick={() => void run("translate")}>{starting === "translate" ? label.running : label.translate}</ActionButton>
        {draftReply ? <ActionButton onClick={() => void copyReply()}>{copyState ?? label.copyReply}</ActionButton> : null}
        {draftNextTask ? <ActionButton onClick={() => void copyNextTask()}>{copyState ?? label.copyNext}</ActionButton> : null}
      </div>

      {running ? <div style={{ color: colors.info, fontSize: 12, fontWeight: 700 }}>{label.running}</div> : null}
      {localError || latest?.status === "error" ? (
        <div style={{ color: colors.bad, background: "rgba(196,59,59,.06)", border: `1px solid ${colors.bad}`, borderRadius: 8, padding: 9, fontSize: 12 }}>
          <strong>{label.error}:</strong> {localError ?? latest?.error}
        </div>
      ) : null}

      <AnalysisSecurityNotices analysis={latest} locale={locale} />

      {draftNextTask ? (
        <div style={{ border: `1px solid ${colors.info}`, borderRadius: 9, background: "rgba(45,108,223,.045)", padding: 10, display: "grid", gap: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 800, fontSize: 12 }}>{label.draftTask ?? "Proposed next task"}</div>
            <ActionButton onClick={() => void copyNextTask()}>{copyState ?? label.copyNext}</ActionButton>
          </div>
          <div style={{ color: colors.muted, fontSize: 10 }}>=== DRAFT NEXT TASK BEGIN ===</div>
          <div style={{ fontSize: 12, lineHeight: 1.55 }}><RichText text={draftNextTask} hostNavigation={hostNavigation} sources={latest?.sources} locale={locale} /></div>
          <div style={{ color: colors.muted, fontSize: 10 }}>=== DRAFT NEXT TASK END ===</div>
          <div style={{ color: colors.muted, fontSize: 10 }}>Only the content inside these markers is copied as the task. Owner decision, trust-boundary notes and risks below are advisory metadata.</div>
        </div>
      ) : null}

      {latest?.analysis ? (
        <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 9 }}>
          <div style={{ color: colors.muted, fontSize: 10, marginBottom: 6 }}>
            {label.latest}{latest.sourceLabel ? ` · ${latest.sourceLabel}` : ""}{latest.model ? ` · ${latest.model}` : ""}{latest.generatedAt ? ` · ${fmt(latest.generatedAt)}` : ""}
          </div>
          <div style={{ fontSize: 12, lineHeight: 1.55 }}><RichText text={latest.analysis} hostNavigation={hostNavigation} sources={latest.sources} locale={locale} /></div>
        </div>
      ) : !running ? <Empty>{label.noAnalysis}</Empty> : null}

      {selectedSource?.kind === "agent" ? (
        <div style={{ color: colors.muted, fontSize: 10 }}>Uses the existing Paperclip {selectedSource.adapterType} connection. The assistant is instructed to analyze only and not modify the task.</div>
      ) : null}
    </div>
  );
}
