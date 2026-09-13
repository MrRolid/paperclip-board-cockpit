export const SUPPORTED_LOCALES = ["cs", "en", "de", "pl", "sk", "fr", "es"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export type LanguagePreference = "auto" | Locale;

export const LANGUAGE_NAMES: Record<Locale, string> = {
  cs: "Čeština",
  en: "English",
  de: "Deutsch",
  pl: "Polski",
  sk: "Slovenčina",
  fr: "Français",
  es: "Español",
};

export function normalizeLocale(value: unknown, fallback: Locale = "en"): Locale {
  if (typeof value !== "string" || !value.trim()) return fallback;
  const raw = value.trim().toLowerCase().replace("_", "-");
  const primary = raw.split("-")[0];
  if ((SUPPORTED_LOCALES as readonly string[]).includes(primary)) return primary as Locale;
  return fallback;
}

export function normalizeLanguagePreference(value: unknown): LanguagePreference {
  if (value === "auto") return "auto";
  if (typeof value === "string") {
    const normalized = normalizeLocale(value, "en");
    const primary = value.trim().toLowerCase().replace("_", "-").split("-")[0];
    if ((SUPPORTED_LOCALES as readonly string[]).includes(primary)) return normalized;
  }
  return "auto";
}

export function resolveLanguage(preference: LanguagePreference, localeHint?: unknown): Locale {
  return preference === "auto" ? normalizeLocale(localeHint, "en") : preference;
}
