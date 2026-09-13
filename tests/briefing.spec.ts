import { describe, expect, it } from "vitest";
import { parseCompletionSummary } from "../src/briefing.js";

describe("completion briefing parser", () => {
  it("extracts owner-facing sections from Forseti-style reports", () => {
    const parsed = parseCompletionSummary(`
## Result
- Implemented and deployed the object finder.

## Verified
- 19 backend tests passed.
- 91 frontend tests passed.

## Manual test
1. Open the app.

## Remaining limitations
- No pagination yet.

## Next
- Membership-aware discovery should be separate future work.
`);

    expect(parsed.result).toContain("Implemented and deployed");
    expect(parsed.verified).toContain("19 backend tests");
    expect(parsed.remaining).toContain("No pagination yet");
    expect(parsed.next).toContain("Membership-aware discovery");
  });

  it("returns empty fields for unstructured comments", () => {
    const parsed = parseCompletionSummary("ordinary comment without headings");
    expect(parsed.result).toBeNull();
    expect(parsed.verified).toBeNull();
    expect(parsed.remaining).toBeNull();
    expect(parsed.next).toBeNull();
  });
});
