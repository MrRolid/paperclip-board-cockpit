# Board Cockpit v0.9.5

v0.9.5 is a multilingual prompt-injection and regression-measurement hardening release.

## What changed

- Prompt-injection-like instructions are checked across English, Czech, Slovak, German, Polish, French and Spanish at the same time, independent of UI locale.
- Matching uses Unicode normalization, Latin-diacritic-insensitive matching and a small mixed-script homoglyph map while preserving the original text for findings and redaction.
- Patterns are precision-first and require an action plus a sensitive instruction/authority object; stable pattern IDs make regressions attributable.
- Short instructions split across two adjacent lines are detected while redaction remains on the original lines.
- Rare/mixed non-Latin scripts and common English prompt/credential terms embedded in non-Latin text produce a non-redacting `foreign_script` finding.
- Generated-advice safety lint now covers all seven shipped UI languages. Language-independent high-risk shell checks remain shared.
- Public corpora measure injection detection, benign false positives, unsafe-advice detection and benign-advice false positives.
- CI runs typecheck, tests and build, reports the corpus table, and creates a zip workflow artifact for green builds.
- `docs/ARTIFACTS.md` records the read-only artifact-ingestion investigation; ingestion itself is not implemented.

## Security boundary unchanged

Board Cockpit remains read-only against Paperclip business data. No capabilities were added. Provenance, project-state logic, LLM endpoint policy, snapshot shape and prompt structure are unchanged by this release.

The multilingual regex layer remains defense in depth. It is intentionally precision-first because false positives remove legitimate project text from the advisor snapshot. Provenance, the read-only capability boundary, the explicit untrusted-data envelope and generated-advice lint remain independent controls.

## Optional Russian/Ukrainian sets

Dedicated Russian and Ukrainian regex sets are not included in 0.9.5. Non-Latin script heuristics provide a language-independent warning signal without pretending to understand those instructions.
