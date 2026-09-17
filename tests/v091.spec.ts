import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import manifest from "../src/manifest.js";

const workerSource = fs.readFileSync(path.resolve("src/worker.ts"), "utf8");
const uiSource = fs.readFileSync(path.resolve("src/ui/index.tsx"), "utf8");

describe("Board Cockpit v0.9.2 public release UX", () => {
  it("uses explicit next-task begin/end delimiters", () => {
    expect(manifest.version).toBe("0.9.6");
    expect(workerSource).toContain('"=== DRAFT NEXT TASK BEGIN ==="');
    expect(workerSource).toContain('"=== DRAFT NEXT TASK END ==="');
    expect(workerSource).toContain("Everything after === DRAFT NEXT TASK END === is owner-facing advisory metadata");
  });

  it("copies only the delimited next-task body", () => {
    expect(uiSource).toContain("function extractDelimitedBlock");
    expect(uiSource).toContain('extractDelimitedBlock(latest?.analysis, "=== DRAFT NEXT TASK BEGIN ===", "=== DRAFT NEXT TASK END ===")');
    expect(uiSource).toContain("Only the content inside these markers is copied as the task");
  });

  it("shows the public release version in the cockpit header", () => {
    expect(uiSource).toContain('const BOARD_COCKPIT_VERSION = "0.9.6"');
    expect(uiSource).toContain("v{BOARD_COCKPIT_VERSION}");
  });
});
