import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import manifest from "../src/manifest.js";

const workerSource = fs.readFileSync(path.resolve("src/worker.ts"), "utf8");
const uiSource = fs.readFileSync(path.resolve("src/ui/index.tsx"), "utf8");

describe("Board Cockpit v0.8.0 planning and security", () => {
  it("marks an idle project with an original brief as a continuation decision", () => {
    expect(manifest.version).toBe("0.9.2");
    expect(workerSource).toContain("continuationDecisionNeeded");
    expect(workerSource).toContain('kind: "planning" as const');
    expect(workerSource).toContain('tr(language, "next_continuation")');
  });

  it("uses goal-gap vertical-slice rules for next-task advice", () => {
    expect(workerSource).toContain("smallest end-to-end vertical slice");
    expect(workerSource).toContain("CAPABILITIES ALREADY DELIVERED:");
    expect(workerSource).toContain("GOAL GAPS:");
    expect(workerSource).toContain("security/review/deployment gates");
  });

  it("guards untrusted Paperclip data before LLM submission", () => {
    expect(workerSource).toContain("prepareUntrustedLlmData");
    expect(workerSource).toContain("untrustedDataEnvelope");
    expect(workerSource).toContain("scanGeneratedAdvice");
    expect(uiSource).toContain("LLM input security:");
    expect(uiSource).toContain("Advice safety review:");
  });

  it("does not copy the whole worker environment into advisor CLIs", () => {
    expect(workerSource).not.toContain("const result: NodeJS.ProcessEnv = { ...process.env }");
    expect(workerSource).toContain('"CODEX_HOME", "CLAUDE_CONFIG_DIR"');
    expect(workerSource).toContain('shell: false');
  });
});
