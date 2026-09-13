import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const workerSource = readFileSync(resolve(here, "../src/worker.ts"), "utf8");

describe("Board Cockpit v0.5.4 LLM output handling", () => {
  it("never exposes reasoning_content from OpenAI-compatible responses", () => {
    expect(workerSource).not.toContain("contentText(message.reasoning_content)");
    expect(workerSource).toContain("chat_template_kwargs: { enable_thinking: false }");
    expect(workerSource).toContain("stripPrivateReasoning");
  });

  it("uses the installed Codex/Claude CLI directly for advisor output", () => {
    expect(workerSource).toContain('const args = ["exec", "--sandbox", "read-only", "--skip-git-repo-check"]');
    expect(workerSource).toContain('const args = ["-p", "--output-format", "json", "--permission-mode", "plan", "--max-turns", "1"]');
    expect(workerSource).toContain("transcript withheld — see run log");
  });

  it("translation has a dedicated output-only prompt", () => {
    expect(workerSource).toContain("Return ONLY the translation. No headings, no commentary, no original text, no explanation.");
  });
});
