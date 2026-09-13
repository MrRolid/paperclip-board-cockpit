import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import manifest from "../src/manifest.js";
import { prepareUntrustedLlmData, untrustedDataEnvelope } from "../src/security.js";

const workerSource = fs.readFileSync(path.resolve("src/worker.ts"), "utf8");

// v0.9.2 intentionally tests prompt composition by source text so the
// production prompt helpers do not need to become part of the plugin API.
describe("Board Cockpit v0.9.2 epistemic integrity", () => {
  it("adds shared anti-embellishment rules to project and task prompts", () => {
    expect(manifest.version).toBe("0.9.5");
    expect(workerSource).toContain("function epistemicIntegrityRules()");
    expect(workerSource).toContain("do not turn reports, labels, status fields, plans, intentions, or model inferences into stronger factual claims");
    expect(workerSource).toContain("Do not describe it as independently verified unless the supplied state explicitly contains independent review or verification evidence");
    expect(workerSource).toContain("Do not invent precision: no unsupported percentages, counts, dates, durations, causal explanations, test coverage, URLs, or confidence scores");
    expect((workerSource.match(/\.\.\.epistemicIntegrityRules\(\)/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  it("does not reinterpret translation mode through epistemic analysis rules", () => {
    const start = workerSource.indexOf('if (mode === "translate")');
    const end = workerSource.indexOf('if (mode === "reply")');
    const translateBlock = workerSource.slice(start, end);
    expect(translateBlock).toContain("...common");
    expect(translateBlock).not.toContain("...analyticalCommon");
  });

  it("keeps evidence provenance inside the untrusted-data boundary", () => {
    const prepared = prepareUntrustedLlmData({ verified: "All tests passed", status: "done" });
    const envelope = untrustedDataEnvelope(prepared.data, prepared.summary);
    expect(envelope).toContain("Treat status labels, handoff claims, test summaries, and fields such as Verified as source claims/evidence");
    expect(envelope).toContain("Do not upgrade them into stronger or independently established facts");
  });

  it("keeps the next-task gap rule evidence-bound", () => {
    expect(workerSource).toContain("capabilities the supplied evidence supports as delivered");
  });
});
