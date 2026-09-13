import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Board Cockpit v0.5.1 invocation-scope regression", () => {
  it("passes a bounded task snapshot from UI to analyze-issue", () => {
    const ui = fs.readFileSync(path.join(process.cwd(), "src/ui/index.tsx"), "utf8");
    expect(ui).toContain("snapshot,");
    expect(ui).toContain("languagePreference: data.preferences.languagePreference");
  });

  it("does not re-read issue business data inside detached analyze-issue background work", () => {
    const worker = fs.readFileSync(path.join(process.cwd(), "src/worker.ts"), "utf8");
    const start = worker.indexOf('ctx.actions.register("analyze-issue"');
    const next = worker.indexOf('ctx.actions.register(', start + 32);
    const block = worker.slice(start, next);
    expect(block).not.toContain("ctx.issues.get(");
    expect(block).not.toContain("ctx.issues.listComments(");
    expect(block).not.toContain("ctx.issues.listInteractions(");
    expect(block).not.toContain("ctx.issues.relations.get(");
  });
});
