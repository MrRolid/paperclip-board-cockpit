import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../src/manifest.js";
import {
  advisorKindForAdapter,
  normalizeSharedAdvisorRegistry,
  safeAdvisorAdapterConfig,
  sharedAgentSourceId,
  sharedLocalSourceId,
} from "../src/advisors.js";

const workerSource = readFileSync(resolve("src/worker.ts"), "utf8");
const uiSource = readFileSync(resolve("src/ui/index.tsx"), "utf8");

describe("Board Cockpit v0.9.7 reusable advisors", () => {
  it("ships as 0.9.7 without adding mutation or agent-invoke capabilities", () => {
    expect(manifest.version).toBe("0.9.7");
    expect(manifest.capabilities).not.toContain("issues.update");
    expect(manifest.capabilities).not.toContain("issue.relations.write");
    expect(manifest.capabilities).not.toContain("agents.invoke");
    expect(manifest.capabilities).not.toContain("companies.read");
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    expect(pkg.version).toBe("0.9.7");
    expect(workerSource).toContain("schemaVersion: 9");
    expect(uiSource).toContain("data.schemaVersion === 9");
  });

  it("recognizes Grok CLI adapters and a direct process adapter that launches grok", () => {
    expect(advisorKindForAdapter("grok_local", {})).toBe("grok");
    expect(advisorKindForAdapter("xai_local", {})).toBe("grok");
    expect(advisorKindForAdapter("process", { command: "/usr/local/bin/grok" })).toBe("grok");
    expect(advisorKindForAdapter("process", { command: "bash", args: ["-lc", "grok -p test"] })).toBe(null);
    expect(advisorKindForAdapter("codex_local", {})).toBe("codex");
    expect(advisorKindForAdapter("claude_local", {})).toBe("claude");
  });

  it("stores only allow-listed CLI launch metadata in the shared registry", () => {
    expect(safeAdvisorAdapterConfig({
      command: "grok",
      env: {
        GROK_HOME: "/srv/paperclip/grok-home",
        XAI_API_KEY: "must-not-be-copied",
        OPENAI_API_KEY: "must-not-be-copied",
      },
    })).toEqual({ command: "grok", env: { GROK_HOME: "/srv/paperclip/grok-home" } });
    expect(safeAdvisorAdapterConfig({ command: "grok --api-key secret" })).toEqual({});
  });

  it("normalizes instance-wide shared CLI/local advisor profiles without project data", () => {
    const cliId = sharedAgentSourceId("company-a", "agent-a");
    const localId = sharedLocalSourceId("company-a");
    const registry = normalizeSharedAdvisorRegistry({
      version: 1,
      cli: [{
        id: "ignored",
        originCompanyId: "company-a",
        originAgentId: "agent-a",
        name: "George Will",
        advisorKind: "grok",
        adapterType: "process",
        model: "grok-4.6",
        command: "grok",
        env: { GROK_HOME: "/tmp/grok", XAI_API_KEY: "drop-me" },
        lastSeenAt: "2026-09-18T10:00:00.000Z",
        projectContext: "must not survive normalization",
      }],
      local: [{
        originCompanyId: "company-a",
        baseUrl: "http://192.168.1.2:8080/v1",
        model: "thinkingcap",
        allowPrivateNetwork: true,
        timeoutSeconds: 45,
        maxTokens: 900,
        lastSeenAt: "2026-09-18T10:00:00.000Z",
      }],
    });
    expect(registry.cli[0]?.id).toBe(cliId);
    expect(registry.cli[0]?.env).toEqual({ GROK_HOME: "/tmp/grok" });
    expect(registry.local[0]?.id).toBe(localId);
    expect(JSON.stringify(registry)).not.toContain("projectContext");
    expect(JSON.stringify(registry)).not.toContain("drop-me");
  });

  it("runs Grok in an explicit read-only advisory lane", () => {
    expect(workerSource).toContain('"--sandbox",\n      "read-only"');
    expect(workerSource).toContain('"run_terminal_cmd,search_replace,web_search,web_fetch"');
    expect(workerSource).toContain('shared-advisor-registry-v1');
    expect(workerSource).toContain('scopeKind: "instance" as const');
  });

  it("exposes shared advisors separately in the UI", () => {
    expect(uiSource).toContain('"shared-agent"');
    expect(uiSource).toContain('"shared-local"');
    expect(uiSource).toContain('tr(locale, "sharedAdvisors")');
  });
});
