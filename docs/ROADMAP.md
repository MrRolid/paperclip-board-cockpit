# Board Cockpit roadmap

The roadmap is intentionally narrow and security-first. Items are implemented only when they preserve Board Cockpit's read-only Paperclip boundary and deterministic operation without an LLM.

## Next

- **1.0.0:** stabilization and release-readiness after provenance and multilingual injection hardening. Exact scope will be defined before implementation rather than inferred here. Artifact-ingestion capability and trust-boundary findings are recorded in [ARTIFACTS.md](ARTIFACTS.md).

## Deliberately not planned in this phase

- automatic ingestion of linked artifacts or documents;
- automatic execution, posting or mutation based on advisor output;
- weakening the existing Paperclip capability boundary;
- treating LLM provenance citations as a substitute for owner review.

## Done

- **0.9.3:** direct LLM destination-policy hardening, redirect refusal, pinned approved addresses, CGNAT classification and IPv6 literal fixes.
- **0.9.4:** source IDs assigned after sanitization, citation-aware advisor prompts, provenance audit, unknown-citation detection and citation-aware UI.
- **0.9.5:** seven-language injection detection, Unicode normalization, precision-first public corpora, multilingual advice linting and CI regression measurement.
- **0.9.6:** deterministic blocked-state classification, existing-wave/new-task guards, stale execution detection, and anti-meta-work LLM guidance.
