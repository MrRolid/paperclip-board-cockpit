import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const workerSource = fs.readFileSync(path.resolve("src/worker.ts"), "utf8");
const uiSource = fs.readFileSync(path.resolve("src/ui/index.tsx"), "utf8");

describe("Board Cockpit v0.7.0 owner continuity", () => {
  it("keeps original project brief context for next-wave advice", () => {
    expect(workerSource).toContain("const projectOriginIssue = substantiveRoots[0]");
    expect(workerSource).toContain("projectContext: cockpitSnapshot.projectContext");
    expect(workerSource).toContain("DRAFT NEXT TASK:");
    expect(uiSource).toContain("data.projectContext.origin.identifier");
  });

  it("highlights the action that produced the visible analysis", () => {
    expect(uiSource).toContain("const activeMode = (starting ?? latest?.mode ?? null)");
    expect(uiSource).toContain('variant={activeMode === "verify" ? "primary" : "secondary"}');
    expect(uiSource).toContain('variant={activeMode === "continue" ? "primary" : "secondary"}');
  });

  it("linkifies URLs and Paperclip issue identifiers in advisor output", () => {
    expect(uiSource).toContain("function RichText");
    expect(uiSource).toContain('target="_blank"');
    expect(uiSource).toContain('hostNavigation.linkProps(`/issues/${part}`)');
  });
});
