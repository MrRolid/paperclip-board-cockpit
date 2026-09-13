# Changelog

## 0.9.2

- Added explicit epistemic-integrity rules to project-level and task-level LLM prompts.
- Advisor must preserve evidence provenance and distinguish snapshot/handoff/agent reports from independent verification.
- `Verified` labels and agent assertions are treated as reported evidence, not automatically as independently established facts.
- Added explicit handling for missing, stale, ambiguous, conflicting, indirect, and partial evidence.
- Added guardrails against unsupported precision such as invented confidence scores, percentages, counts, dates, durations, test coverage, URLs, or causal explanations.
- Extended the untrusted-data envelope so status labels, handoff claims, test summaries, and `Verified` fields cannot silently gain stronger epistemic status.
- No orchestration, issue mutation, UI workflow, capability, or deployment behavior was changed.
- Added v0.9.2 regression coverage for the prompt and evidence-provenance safeguards.

## 0.9.1

- Added explicit `=== DRAFT NEXT TASK BEGIN ===` and `=== DRAFT NEXT TASK END ===` boundaries around paste-ready next-task drafts.
- `Copy next task` now extracts only the delimited task body and excludes owner-only meta-analysis.
- Added a visually separated proposed-task panel with explicit copy boundaries.
- Added visible plugin version in the Cockpit header to make UI/worker upgrade mismatches easier to diagnose.
- Expanded public documentation for installation, operation, owner goals, LLM sources, security, privacy, troubleshooting and development.
- Added public-release regression tests for task delimiters and version display.
- Prepared repository metadata and GitHub community files for the first public release.

## 0.9.0

- Added company-scoped owner goals with high/normal/low priority and active/paused/done lifecycle.
- Active owner goals now influence project-level and task-level next-wave LLM guidance.
- Owner goals remain plugin-only state: no Paperclip issue mutations are performed.
- Added goal alignment to next-task prompts while preserving prompt-injection and security boundaries.
- Bumped cockpit worker schema to v7.

## 0.8.0

- Added deterministic **continuation decision** detection when a project is idle, the previous wave is complete, and no follow-up work exists.
- Reworked next-task prompts around original-goal gap analysis and the smallest high-value end-to-end vertical slice.
- Next-task drafts now request explicit scope, acceptance criteria, out-of-scope items, autonomy/stop conditions, review/deployment gates and owner handoff.
- Added prompt-injection preprocessing for untrusted issue/comment/handoff content before it reaches an LLM.
- Added credential/token redaction, hidden-Unicode stripping, bounded input depth/size, and visible security findings.
- Added advisory output linting for obvious suggestions to weaken authentication/security, expose secrets, use unsafe shell patterns, or run as root.
- Hardened direct Codex/Claude advisor subprocesses so they no longer inherit the whole Paperclip worker environment.
- Tightened LAN LLM bypass: only explicit loopback/RFC1918/ULA endpoints may bypass Paperclip's managed HTTP client; cloud metadata endpoints and credentials-in-URL are rejected.

## 0.7.0

- Original project/charter context is carried into owner and task-level advice.
- Added a ready-to-paste **Draft next task** action for continuing completed waves.
- The action that produced the current task analysis is highlighted correctly.
- Advisor output linkifies HTTP/HTTPS URLs and Paperclip issue identifiers.
- Original-project context is visible and clickable in the UI.
- Repository cleaned for public GitHub release.

## 0.6.0

- Task assistant became implementation-wave aware.
- Added ancestor, sibling, descendant and wave-root context.
- Added deterministic guidance about where owner acceptance belongs.
- Added **What should I verify?** owner verification analysis.

## 0.5.x

- Added Cockpit Assistant to issue/task detail views.
- Added local OpenAI-compatible LLM autodetection and connectivity testing.
- Added existing Codex/Claude CLI sources.
- Added safe background LLM result handling across Paperclip invocation scopes.
- Added multi-language UI.
- Added full-page Cockpit and main sidebar entry.

## 0.4.x

- Added LLM advisor and local-LAN endpoint support.
- Separated real active work from stale `agent.status=running` signals.

## 0.1–0.3

- Initial owner dashboard.
- Added blockers, owner actions, next work and orchestration-health checks.
