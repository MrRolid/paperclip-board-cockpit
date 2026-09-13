import { describe, expect, it } from "vitest";
import { normalizeLanguagePreference, normalizeLocale, resolveLanguage } from "../src/locale.js";
import { tr } from "../src/ui/i18n.js";

describe("Board Cockpit locale handling", () => {
  it("follows browser/host locale in auto mode", () => {
    expect(normalizeLanguagePreference(undefined)).toBe("auto");
    expect(resolveLanguage("auto", "pl-PL")).toBe("pl");
    expect(resolveLanguage("auto", "de-DE")).toBe("de");
    expect(normalizeLocale("cs-CZ")).toBe("cs");
  });

  it("ships translated cockpit labels for supported locales", () => {
    expect(tr("cs", "projectState")).toBe("STAV PROJEKTU");
    expect(tr("de", "projectState")).not.toBe("PROJECT STATE");
    expect(tr("pl", "projectState")).not.toBe("PROJECT STATE");
    expect(tr("fr", "projectState")).not.toBe("PROJECT STATE");
  });
});
