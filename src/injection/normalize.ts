const COMBINING_MARK = /\p{M}/u;
const LATIN_LETTER = /\p{Script=Latin}/u;
const LATIN_TOKEN = /\p{Script=Latin}/u;
const NON_LATIN_LOOKALIKE = /[аеорсухαο]/u;

const LOOKALIKE_MAP: Record<string, string> = {
  "а": "a",
  "е": "e",
  "о": "o",
  "р": "p",
  "с": "c",
  "у": "y",
  "х": "x",
  "α": "a",
  "ο": "o",
};

/**
 * Normalize only for matching. The original text is always retained for excerpts
 * and redaction decisions so the security UI shows what the operator actually received.
 */
export function normalizeInjectionText(input: string): string {
  const compatibility = input.normalize("NFKC").normalize("NFD");
  let withoutLatinMarks = "";
  let previousBaseWasLatin = false;
  for (const char of compatibility) {
    if (COMBINING_MARK.test(char)) {
      if (!previousBaseWasLatin) withoutLatinMarks += char;
      continue;
    }
    withoutLatinMarks += char;
    previousBaseWasLatin = LATIN_LETTER.test(char);
  }

  // Recompose marks that intentionally survived selective stripping. In particular,
  // Cyrillic й decomposes under NFD to и + breve; NFC restores it to й while
  // Latin accents already stripped above stay stripped. Fold ё to е for matching.
  const lowered = withoutLatinMarks.normalize("NFC").toLowerCase().replace(/ё/g, "е").replace(/ł/g, "l");
  const mapped = lowered.replace(/[\p{L}\p{N}_-]+/gu, (token) => {
    if (!LATIN_TOKEN.test(token) || !NON_LATIN_LOOKALIKE.test(token)) return token;
    // Map look-alikes only inside an otherwise Latin token. Pure Cyrillic/Greek
    // text is intentionally left intact so foreign-language detection can see it.
    const residue = [...token].filter((char) => !LATIN_LETTER.test(char) && !LOOKALIKE_MAP[char] && !/[\p{N}_-]/u.test(char));
    if (residue.length > 0) return token;
    return [...token].map((char) => LOOKALIKE_MAP[char] ?? char).join("");
  });
  return mapped.replace(/\s+/gu, " ").trim();
}
