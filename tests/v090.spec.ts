import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import manifest from "../src/manifest.js";

const workerSource = fs.readFileSync(path.resolve("src/worker.ts"), "utf8");
const uiSource = fs.readFileSync(path.resolve("src/ui/index.tsx"), "utf8");

describe("Board Cockpit v0.9.2 owner goals", () => {
  it("stores owner goals only in plugin state", () => {
    expect(manifest.version).toBe("0.9.3");
    expect(workerSource).toContain('"add-owner-goal"');
    expect(workerSource).toContain('"update-owner-goal"');
    expect(workerSource).toContain('"delete-owner-goal"');
    expect(workerSource).toContain('stateKey: "owner-goals"');
    expect(manifest.capabilities).not.toContain("issues.update");
  });

  it("uses active owner goals for next-wave planning", () => {
    expect(workerSource).toContain("activeOwnerGoals");
    expect(workerSource).toContain("Treat active owner-defined goals as current product intent");
    expect(workerSource).toContain("OWNER GOALS ALIGNMENT:");
  });

  it("renders owner goals in the cockpit", () => {
    expect(uiSource).toContain("ownerGoalsSection");
    expect(uiSource).toContain("Cíle ownera");
    expect(uiSource).toContain('usePluginAction("add-owner-goal")');
  });
});
