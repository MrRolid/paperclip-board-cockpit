import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "../src/manifest.js";
import {
  classifyBlockedState,
  decideProjectOrchestration,
  type BlockedClassification,
} from "../src/orchestration.js";

function decision(overrides: Partial<Parameters<typeof decideProjectOrchestration>[0]> = {}) {
  return decideProjectOrchestration({
    activeWorkers: 0,
    runnableTasks: 0,
    inProgressTasks: 0,
    directOwnerActions: 0,
    openIssues: 0,
    terminalIssues: 1,
    hasProjectIntent: true,
    blockedClassifications: [],
    coordinatorPresent: true,
    coordinatorHasActiveIssue: false,
    coordinatorRuntimeStale: false,
    ...overrides,
  });
}

describe("Board Cockpit v0.9.6 orchestration hardening", () => {
  it("ships as 0.9.6 without adding write/invoke capabilities", () => {
    expect(manifest.version).toBe("0.9.6");
    expect(manifest.capabilities).not.toContain("issues.update");
    expect(manifest.capabilities).not.toContain("issue.relations.write");
    expect(manifest.capabilities).not.toContain("agents.invoke");
    const pkg = JSON.parse(readFileSync(resolve("package.json"), "utf8"));
    expect(pkg.version).toBe("0.9.6");
  });

  it("classifies a real open dependency without suggesting manual unblock", () => {
    expect(classifyBlockedState({ relationKnown: true, blockers: [{ status: "in_progress" }] }))
      .toBe("BLOCKED_BY_OPEN_TASK");
    const result = decision({
      openIssues: 2,
      blockedClassifications: ["BLOCKED_BY_OPEN_TASK"],
    });
    expect(result.primary).toBe("BLOCKED_BY_OPEN_TASK");
    expect(result.recommendedAction).toBe("WAIT_FOR_OPEN_BLOCKER");
    expect(result.ownerActionRequired).toBe(false);
    expect(result.shouldSuggestNewTask).toBe(false);
  });

  it("classifies a completed blocker as stale orchestration", () => {
    expect(classifyBlockedState({ relationKnown: true, blockers: [{ status: "done" }] }))
      .toBe("STALE_BLOCKER");
    const result = decision({
      openIssues: 1,
      blockedClassifications: ["STALE_BLOCKER"],
    });
    expect(result.primary).toBe("STALE_ORCHESTRATION");
    expect(result.recommendedAction).toBe("RECONCILE_STALE_ORCHESTRATION");
    expect(result.classifications).toContain("EXISTING_WAVE_NEEDS_ATTENTION");
    expect(result.ownerActionRequired).toBe(false);
    expect(result.shouldSuggestNewTask).toBe(false);
  });

  it("distinguishes blocked-without-relation from unreadable relation state", () => {
    expect(classifyBlockedState({ relationKnown: true, blockers: [] })).toBe("BLOCKED_WITHOUT_RELATION");
    expect(classifyBlockedState({ relationKnown: false, blockers: [] })).toBe("BLOCKER_STATE_UNKNOWN");

    const unknown = decision({
      openIssues: 1,
      blockedClassifications: ["BLOCKER_STATE_UNKNOWN"],
    });
    expect(unknown.primary).toBe("ORCHESTRATION_STATE_UNKNOWN");
    expect(unknown.recommendedAction).toBe("RECONCILE_UNKNOWN_ORCHESTRATION");
    expect(unknown.ownerActionRequired).toBe(false);
  });

  it("selects existing executable work instead of creating a management task", () => {
    const result = decision({ openIssues: 3, runnableTasks: 1 });
    expect(result.primary).toBe("EXECUTABLE_WORK");
    expect(result.recommendedAction).toBe("RESUME_EXECUTABLE_WORK");
    expect(result.existingWaveOpen).toBe(true);
    expect(result.shouldSuggestNewTask).toBe(false);
    expect(result.ownerActionRequired).toBe(false);
    expect(result.classifications).toContain("COORDINATOR_STALE_OR_IDLE");
    expect(result.classifications).toContain("EXISTING_WAVE_NEEDS_ATTENTION");
  });


  it("treats an in-progress task with no active worker as orchestration recovery, not a new wave", () => {
    const result = decision({
      openIssues: 2,
      inProgressTasks: 1,
      activeWorkers: 0,
      runnableTasks: 0,
      blockedClassifications: ["BLOCKED_BY_OPEN_TASK"],
      coordinatorHasActiveIssue: true,
      coordinatorRuntimeStale: true,
    });
    expect(result.primary).toBe("STALE_ORCHESTRATION");
    expect(result.recommendedAction).toBe("RECONCILE_STALE_ORCHESTRATION");
    expect(result.ownerActionRequired).toBe(false);
    expect(result.shouldSuggestNewTask).toBe(false);
    expect(result.classifications).toContain("COORDINATOR_STALE_OR_IDLE");
  });

  it("never creates a continuation owner action while any open issue remains", () => {
    const classifications: BlockedClassification[] = ["STALE_BLOCKER"];
    const result = decision({
      openIssues: 1,
      runnableTasks: 0,
      blockedClassifications: classifications,
      terminalIssues: 20,
      hasProjectIntent: true,
    });
    expect(result.continuationDecisionNeeded).toBe(false);
    expect(result.ownerActionRequired).toBe(false);
    expect(result.shouldSuggestNewTask).toBe(false);
    expect(result.primary).toBe("STALE_ORCHESTRATION");
  });

  it("allows a new-wave continuation decision only after all open work is gone", () => {
    const result = decision({
      openIssues: 0,
      runnableTasks: 0,
      blockedClassifications: [],
      terminalIssues: 20,
      hasProjectIntent: true,
    });
    expect(result.primary).toBe("PLANNING_GAP");
    expect(result.continuationDecisionNeeded).toBe(true);
    expect(result.ownerActionRequired).toBe(true);
    expect(result.shouldSuggestNewTask).toBe(true);
  });

  it("requires an actual owner-controlled item before marking an open wave as owner-blocked", () => {
    const result = decision({
      openIssues: 4,
      directOwnerActions: 1,
      blockedClassifications: ["BLOCKED_BY_OPEN_TASK"],
    });
    expect(result.primary).toBe("OWNER_BLOCKER");
    expect(result.ownerActionRequired).toBe(true);
    expect(result.shouldSuggestNewTask).toBe(false);
  });

  it("keeps independent runnable work moving even when one owner action exists", () => {
    const result = decision({
      openIssues: 4,
      runnableTasks: 2,
      directOwnerActions: 1,
    });
    expect(result.primary).toBe("EXECUTABLE_WORK");
    expect(result.recommendedAction).toBe("RESUME_EXECUTABLE_WORK");
    expect(result.ownerActionRequired).toBe(true);
    expect(result.shouldSuggestNewTask).toBe(false);
  });

  it("puts anti-meta-work and no-blind-unblock rules into the project analysis prompt", () => {
    const worker = readFileSync(resolve("src/worker.ts"), "utf8");
    expect(worker).toContain("do not recommend a new product implementation wave by default");
    expect(worker).toContain("section 6 Suggested next task must say NOT NEEDED");
    expect(worker).toContain("Never recommend changing blocked tasks to todo/in_progress merely because they are blocked");
    expect(worker).toContain("Avoid orchestration-of-orchestration loops");
    expect(worker).toContain("VERIFIED structured state, INFERRED interpretation, and UNKNOWN missing evidence");
  });

  it("bumps the cockpit schema and exposes deterministic orchestration fields to the LLM snapshot", () => {
    const worker = readFileSync(resolve("src/worker.ts"), "utf8");
    const ui = readFileSync(resolve("src/ui/index.tsx"), "utf8");
    expect(worker).toContain("schemaVersion: 8");
    expect(ui).toContain("data.schemaVersion === 8");
    expect(worker).toContain("projectState: cockpitSnapshot.projectState");
    expect(worker).toContain("shouldSuggestNewTask: orchestration.shouldSuggestNewTask");
    expect(worker).toContain("classification = classifyBlockedState");
    expect(worker).toContain("relationKnown");
  });
});
