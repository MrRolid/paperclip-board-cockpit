import { describe, expect, it } from "vitest";
import manifest from "../src/manifest.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const workerSource = readFileSync(resolve(here, "../src/worker.ts"), "utf8");
const uiSource = readFileSync(resolve(here, "../src/ui/index.tsx"), "utf8");

describe("Board Cockpit v0.9.2", () => {
  it("adds the issue-level Cockpit Assistant", () => {
    expect(manifest.version).toBe("0.9.5");
    expect(manifest.capabilities).toContain("ui.detailTab.register");
    expect(manifest.ui?.slots?.some((slot) => slot.type === "taskDetailView" && slot.exportName === "IssueCockpitAssistant")).toBe(true);
    expect(workerSource).toContain('ctx.data.register("issue-assistant"');
    expect(workerSource).toContain('ctx.actions.register("analyze-issue"');
    expect(uiSource).toContain("export function IssueCockpitAssistant");
    expect(uiSource).toContain("DRAFT REPLY");
  });

  it("autodetects the local OpenAI-compatible model from /models", () => {
    expect(workerSource).toContain("discoverLocalModels");
    expect(workerSource).toContain('ctx.actions.register("discover-local-llm"');
    expect(workerSource).toContain('stateKey: "detected-local-model"');
    expect(workerSource).toContain("isAutoModel");
    expect(uiSource).toContain("Zjistit model");
    expect(manifest.instanceConfigSchema?.properties).not.toHaveProperty("llmModel");
  });

  it("runs long LLM analysis in the worker background to avoid the 30s UI action timeout", () => {
    expect(workerSource).toContain('{ status: "running", startedAt, source: requestedSource }');
    expect(workerSource).toContain('const companyAnalysisRuntime = new Map<string, JsonRecord>();');
    expect(workerSource).toContain('const issueAnalysisRuntime = new Map<string, JsonRecord>();');
    expect(workerSource).toContain('runDirectAgentCli');
    expect(workerSource).toContain('codex_local');
    expect(workerSource).toContain('claude_local');
    expect(workerSource).toContain('const timeoutSeconds = Math.max(');
    expect(workerSource).toContain('Math.min(300, numberValue(config.llmTimeoutSeconds, 45)');
    expect(uiSource).toContain('data?.llm.latestAnalysis?.status !== "running"');
  });

  it("uses a narrow left status stack and a wider right LLM advisor on the full cockpit", () => {
    expect(uiSource).toContain('gridTemplateColumns: "minmax(300px, 0.72fr) minmax(520px, 1.28fr)"');
  });
});
