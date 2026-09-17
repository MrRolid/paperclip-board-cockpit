import { describe, expect, it } from "vitest";
import manifest from "../src/manifest.js";

describe("Board Cockpit manifest", () => {
  it("registers dashboard, full page, and main sidebar entry", () => {
    expect(manifest.id).toBe("rolid.board-cockpit");
    expect(manifest.version).toBe("0.9.6");
    expect(manifest.ui?.slots?.some((slot) => slot.type === "dashboardWidget")).toBe(true);
    expect(manifest.ui?.slots?.some((slot) => slot.type === "page")).toBe(true);
    expect(manifest.ui?.slots?.some((slot) => slot.type === "sidebar")).toBe(true);
    expect(manifest.capabilities).toContain("ui.sidebar.register");
  });

  it("remains read-only against Paperclip business data", () => {
    expect(manifest.capabilities).toContain("issues.read");
    expect(manifest.capabilities).toContain("agents.read");
    expect(manifest.capabilities).not.toContain("issues.update");
    expect(manifest.capabilities).not.toContain("agents.invoke");
    expect(manifest.capabilities).not.toContain("issue.relations.write");
  });

  it("can analyze through local HTTP or host Codex/Claude CLI selection", () => {
    expect(manifest.capabilities).toContain("http.outbound");
    expect(manifest.capabilities).not.toContain("agent.sessions.create");
    expect(manifest.capabilities).not.toContain("agent.sessions.send");
    expect(manifest.capabilities).not.toContain("agent.sessions.close");
    expect(manifest.capabilities).toContain("instance.settings.register");
  });
});
