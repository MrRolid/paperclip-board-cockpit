export type AdvisorKind = "codex" | "claude" | "grok";

export type SharedCliAdvisor = {
  id: string;
  originCompanyId: string;
  originAgentId: string;
  name: string;
  advisorKind: AdvisorKind;
  adapterType: string;
  model: string | null;
  command: string | null;
  env: Record<string, string>;
  lastSeenAt: string;
};

export type SharedLocalAdvisor = {
  id: string;
  originCompanyId: string;
  label: string;
  baseUrl: string;
  model: string;
  allowPrivateNetwork: boolean;
  timeoutSeconds: number;
  maxTokens: number;
  lastSeenAt: string;
};

export type SharedAdvisorRegistry = {
  version: 1;
  cli: SharedCliAdvisor[];
  local: SharedLocalAdvisor[];
};

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function rec(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function basename(value: string): string {
  const normalized = value.replace(/\\/g, "/");
  return normalized.slice(normalized.lastIndexOf("/") + 1).toLowerCase();
}

function looksLikeGrokCommand(config: Record<string, unknown>): boolean {
  const command = text(config.command);
  const commandBase = basename(command);
  if (commandBase === "grok" || commandBase.startsWith("grok-")) return true;

  return commandBase.includes("xai-grok");
}

export function advisorKindForAdapter(adapterTypeRaw: string, configRaw: Record<string, unknown>): AdvisorKind | null {
  const adapterType = adapterTypeRaw.trim().toLowerCase();
  if (adapterType === "codex_local") return "codex";
  if (adapterType === "claude_local") return "claude";
  if (["grok_local", "xai_local", "grok_cli", "xai_grok_local"].includes(adapterType)) return "grok";
  if (["process", "process_local", "shell", "command"].includes(adapterType) && looksLikeGrokCommand(configRaw)) return "grok";
  return null;
}

export function advisorProviderLabel(kind: AdvisorKind): string {
  if (kind === "codex") return "Codex CLI";
  if (kind === "claude") return "Claude CLI";
  return "Grok CLI";
}

export function isSupportedAnalysisAdapter(adapterType: string, config: Record<string, unknown>): boolean {
  return advisorKindForAdapter(adapterType, config) !== null;
}

const SAFE_ENV_KEYS = new Set([
  "CODEX_HOME",
  "CLAUDE_CONFIG_DIR",
  "GROK_HOME",
  "GROK_CONFIG_DIR",
  "XAI_CONFIG_DIR",
]);

export function safeAdvisorAdapterConfig(configRaw: Record<string, unknown>): { command?: string; env?: Record<string, string> } {
  const result: { command?: string; env?: Record<string, string> } = {};
  const command = text(configRaw.command);
  // Shared profiles must contain only an executable path/name, never shell
  // fragments, inline arguments or credentials. Current-company execution may
  // still use the original adapter config; this restriction applies only to
  // metadata persisted for cross-company reuse.
  if (command && /^[A-Za-z0-9_./\\:-]+$/.test(command)) result.command = command;

  const sourceEnv = rec(configRaw.env);
  const env: Record<string, string> = {};
  for (const key of SAFE_ENV_KEYS) {
    const value = text(sourceEnv[key]);
    if (value) env[key] = value;
  }
  if (Object.keys(env).length > 0) result.env = env;
  return result;
}

export function sharedAgentSourceId(companyId: string, agentId: string): string {
  return `shared-agent:${companyId}:${agentId}`;
}

export function sharedLocalSourceId(companyId: string): string {
  return `shared-local:${companyId}`;
}

export function emptySharedAdvisorRegistry(): SharedAdvisorRegistry {
  return { version: 1, cli: [], local: [] };
}

function normalizeCli(value: unknown): SharedCliAdvisor | null {
  const item = rec(value);
  const originCompanyId = text(item.originCompanyId);
  const originAgentId = text(item.originAgentId);
  const name = text(item.name);
  const adapterType = text(item.adapterType).toLowerCase();
  const advisorKindRaw = text(item.advisorKind).toLowerCase();
  const advisorKind: AdvisorKind | null = advisorKindRaw === "codex" || advisorKindRaw === "claude" || advisorKindRaw === "grok"
    ? advisorKindRaw
    : null;
  if (!originCompanyId || !originAgentId || !name || !adapterType || !advisorKind) return null;
  const sourceEnv = rec(item.env);
  const env: Record<string, string> = {};
  for (const key of SAFE_ENV_KEYS) {
    const valueText = text(sourceEnv[key]);
    if (valueText) env[key] = valueText;
  }
  return {
    id: sharedAgentSourceId(originCompanyId, originAgentId),
    originCompanyId,
    originAgentId,
    name,
    advisorKind,
    adapterType,
    model: text(item.model) || null,
    command: text(item.command) || null,
    env,
    lastSeenAt: text(item.lastSeenAt) || new Date(0).toISOString(),
  };
}

function normalizeLocal(value: unknown): SharedLocalAdvisor | null {
  const item = rec(value);
  const originCompanyId = text(item.originCompanyId);
  const baseUrl = text(item.baseUrl);
  if (!originCompanyId || !baseUrl) return null;
  return {
    id: sharedLocalSourceId(originCompanyId),
    originCompanyId,
    label: text(item.label) || "Local OpenAI-compatible LLM",
    baseUrl,
    model: text(item.model) || "auto",
    allowPrivateNetwork: item.allowPrivateNetwork === true,
    timeoutSeconds: typeof item.timeoutSeconds === "number" && Number.isFinite(item.timeoutSeconds) ? item.timeoutSeconds : 45,
    maxTokens: typeof item.maxTokens === "number" && Number.isFinite(item.maxTokens) ? item.maxTokens : 900,
    lastSeenAt: text(item.lastSeenAt) || new Date(0).toISOString(),
  };
}

export function normalizeSharedAdvisorRegistry(value: unknown): SharedAdvisorRegistry {
  const root = rec(value);
  const cli = Array.isArray(root.cli) ? root.cli.map(normalizeCli).filter((item): item is SharedCliAdvisor => item !== null) : [];
  const local = Array.isArray(root.local) ? root.local.map(normalizeLocal).filter((item): item is SharedLocalAdvisor => item !== null) : [];
  return { version: 1, cli: cli.slice(0, 100), local: local.slice(0, 50) };
}
