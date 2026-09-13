import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const workerSource = fs.readFileSync(path.resolve("src/worker.ts"), "utf8");
const uiSource = fs.readFileSync(path.resolve("src/ui/index.tsx"), "utf8");

describe("Board Cockpit v0.6.0 wave-aware owner assistant", () => {
  it("builds ancestor, sibling and wave context for issue analysis", () => {
    expect(workerSource).toContain("const ancestorIssues: Issue[] = []");
    expect(workerSource).toContain("const waveIssues: Issue[] = []");
    expect(workerSource).toContain("briefings: waveBriefings");
    expect(workerSource).toContain("ownerGuidance");
  });

  it("asks the advisor to explain the whole wave and owner verification", () => {
    expect(workerSource).toContain("WHAT HAPPENED IN THE WAVE:");
    expect(workerSource).toContain("WHAT THE OWNER SHOULD CHECK:");
    expect(workerSource).toContain("OWNER CHECKLIST:");
  });

  it("shows deterministic wave context and a verification action in the task UI", () => {
    expect(uiSource).toContain("data.waveContext.root.identifier");
    expect(uiSource).toContain('run("verify")');
    expect(uiSource).toContain("ownerGuidance.manualTest");
  });
});
