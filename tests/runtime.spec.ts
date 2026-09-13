import { describe, expect, it } from "vitest";
import { classifyReportedRunning } from "../src/runtime.js";

describe("runtime activity classification", () => {
  it("does not count a reported-running agent without an in-progress issue as active work", () => {
    const rows = [
      { name: "Skadi", issue: null },
      { name: "Mimir", issue: { id: "ROL-22" } },
    ];

    const result = classifyReportedRunning(rows);

    expect(result.activeWorkers.map((row) => row.name)).toEqual(["Mimir"]);
    expect(result.runtimeAnomalies.map((row) => row.name)).toEqual(["Skadi"]);
  });
});
