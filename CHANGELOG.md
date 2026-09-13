# Changelog

All notable changes to Board Cockpit are documented here.

Board Cockpit is designed as a read-only human control plane for Paperclip. The deterministic Cockpit works without an LLM; LLM advisors are optional and operate behind additional security and provenance controls.

---

## 0.9.5

### Multilingual prompt-injection hardening

- Replaced the original flat English-only injection regex list with data-driven pattern sets for:
  - English
  - Czech
  - Slovak
  - German
  - Polish
  - French
  - Spanish
- All language sets run simultaneously regardless of the selected UI locale. The language used by project content or an attacker is therefore not assumed to match the operator's language.
- Added stable pattern IDs such as `cs.ignore_previous` and `de.reveal_secret` so findings and regressions can be traced to a specific rule.
- Injection rules follow a precision-first model and generally require both:
  - an instruction/action verb; and
  - a security-sensitive object such as previous instructions, system prompt, credentials, secrets, or authority context.
- Ordinary technical text such as references to cache invalidation, API versions, tokens, or legitimate system-prompt development is therefore less likely to be removed from the advisor snapshot.

### Unicode and evasion resistance

- Added normalization specifically for injection matching:
  - NFKC compatibility normalization;
  - Latin-diacritic-insensitive matching;
  - whitespace normalization;
  - selected Cyrillic/Greek look-alike mapping inside otherwise Latin text.
- Original input text remains unchanged for excerpts, findings, and redaction.
- Fixed normalization so Cyrillic characters such as `й` remain intact instead of being damaged by Latin-oriented diacritic stripping.
- Added `ё -> е` normalization for more robust future Cyrillic matching.
- Replaced ASCII-style word-boundary assumptions with Unicode-aware term boundaries.
- Added detection of short injection instructions split across adjacent lines while retaining redaction against the original lines.

### Language-independent warning signals

- Added non-redacting `foreign_script` findings for unusual non-Latin script changes inside otherwise predominantly Latin project data.
- Added detection of English security-sensitive tokens such as `system prompt`, `api key`, `token`, `password`, `secret`, and `instructions` when embedded in non-Latin text.
- These signals deliberately warn rather than redact because Board Cockpit does not claim to understand arbitrary unsupported languages.

### Multilingual generated-advice safety lint

- Extended generated-advice safety checks to all seven shipped UI languages.
- Added localized handling for recommendations involving:
  - weakening authentication or security controls;
  - exposing credentials or secrets;
  - unsafe privilege recommendations.
- Preserved language-independent checks for dangerous shell pipelines and similar command patterns.
- Added language-specific negation handling so warnings such as "never disable TLS" are not interpreted as recommendations to disable TLS.
- Tightened root-privilege detection to avoid false positives such as `root cause analysis`.

### Public regression corpus

Added a public regression corpus under `tests/corpus/` covering both malicious-looking and legitimate project text.

Current shipped corpus results:

| Language | Injection samples | Detected | Benign samples | False positives | Unsafe advice | Detected | Benign advice | False positives |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| EN | 40 | 40 | 60 | 0 | 15 | 15 | 25 | 0 |
| CS | 40 | 40 | 60 | 0 | 15 | 15 | 25 | 0 |
| SK | 40 | 40 | 60 | 0 | 15 | 15 | 25 | 0 |
| DE | 40 | 40 | 60 | 0 | 15 | 15 | 25 | 0 |
| PL | 40 | 40 | 60 | 0 | 15 | 15 | 25 | 0 |
| FR | 40 | 40 | 60 | 0 | 15 | 15 | 25 | 0 |
| ES | 40 | 40 | 60 | 0 | 15 | 15 | 25 | 0 |

Total regression corpus:

- **280/280** shipped injection samples detected.
- **0/420** benign project lines falsely detected.
- **105/105** unsafe-advice samples detected.
- **0/175** benign-advice samples falsely detected.

These figures describe the shipped regression corpus only. They are not presented as a universal prompt-injection detection rate.

### CI

- Added GitHub Actions CI for:
  - type checking;
  - unit/regression tests;
  - production build;
  - corpus measurements;
  - release ZIP artifact generation.
- Corpus metrics are emitted in CI so changes to detection or false-positive behavior can be reviewed.

### Artifact ingestion investigation

- Added `docs/ARTIFACTS.md`.
- Investigated Paperclip SDK support for read-only artifact/document ingestion.
- No artifact ingestion was implemented.
- Current recommendation is to defer ingestion until the host capability and approval model are sufficiently stable and clear.

### Security boundary

No new Paperclip capabilities were added.

This release does **not** change:

- the read-only business-data boundary;
- project-state calculation;
- wave/continuation logic;
- the provenance pipeline;
- advisor prompt structure;
- snapshot structure;
- the direct LLM endpoint policy from 0.9.3;
- write behavior.

The multilingual regex layer remains defense in depth. The primary independent controls remain the read-only capability boundary, explicit untrusted-data handling, source provenance, and generated-advice linting.

Dedicated Russian/Ukrainian injection pattern sets are not included in this release.

---

## 0.9.4

### Source-level provenance

Added deterministic source attribution to information supplied to the LLM advisor.

Board Cockpit, rather than the model, now assigns stable source IDs after sanitization.

Supported source classes include:

- issue title;
- issue description;
- Paperclip host state;
- comments;
- structured completion-handoff fields;
- original project brief;
- owner goals.

Example citation forms:

```text
ROL-22#desc
ROL-22#state
ROL-22#c:1f3a9b2c
ROL-22#handoff.verified
ROL-1#origin
goal:9a1b2c3d
```

### Stable comment references

- Comment IDs use a deterministic prefix derived from the real Paperclip comment ID rather than list position.
- If two comments collide on the first eight characters, both IDs automatically extend to twelve characters.
- Reordering or adding unrelated comments therefore does not silently change existing source identity.

### Provenance is attached after sanitization

The processing order is explicitly:

```text
snapshot
  -> security sanitization
  -> provenance attachment
  -> LLM context
```

This ensures:

- source excerpts contain sanitized text;
- secrets removed by the sanitizer do not reappear in provenance tooltips;
- source IDs cannot be injected by user-controlled project content.

Text such as:

```text
[ROL-99#state]
```

inside an issue or comment does not create a valid source entry.

### Advisor citation rules

- Factual project claims in selected advisor sections are expected to cite source IDs.
- The advisor may cite only IDs explicitly present in the snapshot's source registry.
- Agent comments and handoff fields remain reported evidence.
- `#state` is the only source class treated as independently established Paperclip host state.
- Recommendations and opinions do not require citations.

Existing epistemic-integrity and next-task decision rules were preserved rather than rewritten.

### Provenance audit

Added deterministic post-generation analysis of advisor output.

The audit records:

- valid cited IDs;
- citations that do not exist in the snapshot;
- selected factual-looking lines without a citation;
- claims backed by host `#state`;
- claims backed only by report-style sources.

Unknown citations are surfaced as a particularly strong warning because they may indicate hallucination or citation-looking content propagated from untrusted input.

The audit is advisory. It does not rewrite or block the model response.

### UI

- Citations are rendered as links to the relevant Paperclip issue.
- Citation tooltips show the sanitized source excerpt and source kind.
- Unknown citations use the warning/error presentation.
- Added expandable provenance information to analysis security notices.
- Added expandable per-path input security findings with path, finding kind, and excerpt.

### Security boundary

No capabilities were added and no write path was introduced.

Unchanged:

- deterministic project state;
- blocker calculation;
- implementation-wave resolution;
- continuation decisions;
- direct LLM network policy;
- issue mutation behavior.

---

## 0.9.3

### Direct LLM transport hardening

Hardened the direct HTTP path used by local/OpenAI-compatible advisors.

### Redirect refusal

- Direct LLM requests no longer follow HTTP redirects.
- Redirect responses fail explicitly rather than allowing the connection to move to a destination that was not evaluated by the endpoint policy.

### DNS pinning

Previously, destination validation and the subsequent network connection could perform independent DNS lookups.

0.9.3 changes the direct path so:

1. the hostname is resolved;
2. the resolved addresses are evaluated by Board Cockpit's endpoint policy;
3. the actual connection uses those approved addresses.

The configured hostname remains in use for:

- HTTP `Host`;
- HTTPS SNI;
- TLS certificate validation.

This closes the gap between "address that passed policy" and "address actually contacted."

### Unified endpoint classification

Consolidated overlapping address classification logic into a shared classifier covering:

- public addresses;
- private/LAN addresses;
- link-local addresses.

This reduces the possibility that separate checks drift apart over time.

### Carrier-grade NAT

Added:

```text
100.64.0.0/10
```

to the private-address class.

CGNAT/Tailscale-style addresses now require the same explicit private-network opt-in as RFC1918 destinations.

Boundary cases are covered by regression tests.

### IPv6 classification fix

Previously, hostname-prefix checks could misclassify ordinary DNS names beginning with strings such as `fd`.

IPv6 ULA and link-local classification now applies only to actual IPv6 literals or resolved addresses.

For example:

```text
fdserver.example.com
```

is no longer classified as ULA merely because its hostname begins with `fd`.

Actual addresses such as:

```text
fd12::1
fe80::1
```

remain correctly classified.

### Deployment hygiene

- Removed deployment-specific `install-on-*.sh` material from the public release tree.
- `install-local.sh` remains the supported ZIP/local-development installer.

### Regression coverage

Added tests for:

- redirect refusal;
- policy-approved address pinning;
- link-local rejection before connection;
- CGNAT boundaries;
- IPv6 literals;
- ordinary hostnames that resemble IPv6 prefixes.

### Security boundary

No changes were made to:

- capabilities;
- prompts;
- project-state logic;
- owner goals;
- handoff parsing;
- UI behavior;
- Codex/Claude advisor semantics.

---

## 0.9.2

### Epistemic-integrity hardening

0.9.2 focused narrowly on preventing the LLM advisor from making project evidence sound stronger than it actually is.

Added explicit rules requiring the advisor to distinguish:

- facts present in Paperclip host state;
- statements made by agents;
- claims inside comments;
- structured handoff claims;
- inferred conclusions;
- independent verification.

### Evidence strength

Labels such as:

```text
Verified
Tests pass
Complete
Done
```

do not automatically become independently verified facts merely because an agent or handoff contains them.

The advisor must preserve the source of such statements.

For example, conceptually:

```text
The handoff reports that tests passed.
```

rather than:

```text
The implementation is verified.
```

unless independent evidence is actually present.

### Uncertainty preservation

The advisor is explicitly instructed to retain:

- caveats;
- partial coverage;
- known failures;
- remaining limitations;
- conflicting evidence;
- stale evidence;
- missing evidence;
- indirect evidence.

Absence of a reported problem must not be converted into proof that the problem does not exist.

### Unsupported precision

Added rules against inventing unsupported:

- confidence percentages;
- counts;
- dates;
- durations;
- coverage figures;
- URLs;
- causal explanations;
- precise metrics.

When evidence supports only a narrower statement, the narrower statement is preferred over a more polished but speculative one.

### Untrusted-data envelope

The same evidence-strength rules are reflected in the untrusted-data boundary so project-controlled labels cannot silently acquire stronger epistemic status before reaching the advisor.

### Scope

No changes were made to:

- orchestration;
- UI workflow;
- capabilities;
- owner goals;
- deployment behavior;
- provider selection;
- issue mutation.

---

## 0.9.1

### First public-oriented release

0.9.1 prepared Board Cockpit for broader GitHub distribution.

### Paste-safe next-task drafts

Added explicit boundaries:

```text
=== DRAFT NEXT TASK BEGIN ===
...
=== DRAFT NEXT TASK END ===
```

`Copy next task` copies only the task body between these markers.

Owner-only analysis such as:

- decisions still required;
- risks;
- security boundaries;
- uncertainty;

remains visible to the operator but is not accidentally copied into the next Paperclip task.

### UI/version visibility

- Added a dedicated proposed-task presentation.
- Added visible plugin version information to the Cockpit UI.
- This makes stale worker/UI combinations easier to diagnose after upgrades.

### Public documentation

Expanded documentation covering:

- installation;
- operation;
- owner goals;
- supported LLM sources;
- security;
- privacy;
- troubleshooting;
- development.

Added initial public repository/community metadata.

---

## 0.9.0

### Owner goals

Added company-scoped owner goals stored only in plugin state.

Goals support:

- `high`, `normal`, and `low` priority;
- `active`, `paused`, and `done` lifecycle.

Active goals influence advisor recommendations and next-wave planning while remaining separate from Paperclip business data.

Board Cockpit does not create or modify Paperclip issues to store goals.

### Planning alignment

Next-task guidance now considers:

- original project intent;
- current project state;
- completed work;
- remaining gaps;
- active owner goals.

Security and untrusted-data boundaries continue to apply to goal content.

---

## 0.8.0

0.8.0 was the first major security and continuation-planning hardening release.

### Continuation decision

Added deterministic recognition of the state where:

- no work is actively running;
- no runnable work remains;
- no blocker explains the idle state;
- the previous implementation wave is complete;
- the original project objective may still be incomplete.

Instead of displaying this as simply "nothing to do," Cockpit surfaces it as an owner continuation decision.

This prevents completed implementation waves from being mistaken for completed projects.

### Next-task planning

Reworked next-task guidance around the original project objective.

The advisor is asked to identify the smallest useful end-to-end vertical slice that advances the original goal rather than mechanically generating another isolated TODO.

Generated tasks request explicit:

- objective;
- scope;
- acceptance criteria;
- out-of-scope items;
- autonomy and stop conditions;
- security/review/deployment gates;
- owner handoff.

### Prompt-injection preprocessing

Added security preprocessing for untrusted:

- issue descriptions;
- comments;
- completion handoffs;
- related project text.

Injection-like instructions are treated as project data rather than trusted advisor instructions.

### Secret and credential handling

Added detection/redaction for common:

- API keys;
- bearer tokens;
- passwords;
- credential-like values.

### Unicode hardening

Added removal/handling of hidden Unicode characters that could obscure or manipulate instructions, including relevant zero-width and bidirectional-control characters.

### Input bounding

Added limits on:

- text length;
- object depth;
- collection size;
- snapshot material supplied to the LLM.

This reduces both context exhaustion and abuse of oversized untrusted input.

### Security findings

Sanitization no longer happens invisibly.

Findings are retained for display so the operator can see that input was modified or considered suspicious.

### Generated-advice lint

Added output-side checks for obvious dangerous recommendations such as:

- disabling authentication;
- disabling TLS/security controls;
- exposing credentials;
- unsafe `curl | shell` patterns;
- overly permissive filesystem permissions;
- unnecessary root execution.

The lint warns the owner; it does not execute or silently rewrite model output.

### Codex/Claude subprocess hardening

Direct Codex and Claude advisor subprocesses no longer inherit the complete Paperclip worker environment.

This reduces unnecessary exposure of environment-held credentials and internal configuration.

### Private/LAN LLM policy

Tightened the exception allowing direct access to local LLM endpoints.

The bypass is limited to explicitly recognized:

- loopback;
- RFC1918 private networks;
- IPv6 ULA.

Additional protections reject:

- cloud metadata destinations;
- credentials embedded in URLs;
- endpoints outside the allowed destination policy.

### Security model

0.8.0 established the layered design later extended by 0.9.2-0.9.5:

```text
read-only Paperclip boundary
+ deterministic state
+ untrusted-input sanitization
+ bounded LLM context
+ isolated advisor execution
+ output safety lint
```

---

## 0.7.0

### Project continuity

- Added original project/charter context to project-level and task-level advisor input.
- Advisor planning can therefore compare the current implementation state with the project's original objective.
- Added a paste-ready **Draft next task** action for continuing completed waves.
- Original-project context became visible and clickable in the UI.
- Advisor output gained linkification for HTTP/HTTPS URLs and Paperclip issue identifiers.
- Improved action highlighting so the UI correctly indicates which advisor action produced the displayed analysis.
- Repository cleanup continued in preparation for public distribution.

---

## 0.6.0

### Implementation-wave awareness

- Task Assistant became aware of implementation-wave structure.
- Added context for:
  - ancestors;
  - siblings;
  - descendants;
  - wave root.
- Added deterministic guidance about where owner acceptance belongs.
- Added **What should I verify?** analysis for owner-side acceptance and manual verification.

This reduced the tendency to treat an individual completed child task as equivalent to completion of the entire implementation wave.

---

## 0.5.x

### Cockpit Assistant

- Added Cockpit Assistant to Paperclip issue/task detail views.
- Added project-level/full-page Cockpit.
- Added main sidebar navigation.

### LLM sources

Added support for:

- local OpenAI-compatible endpoints;
- existing Paperclip Codex CLI connections;
- existing Paperclip Claude CLI connections.

### Local LLM operation

- Added local model discovery.
- Added connectivity testing.
- Added support for background advisor calls that can outlive the original Paperclip UI invocation scope.

### UI

- Added multilingual UI support.
- Expanded task-level advisor actions and result presentation.

---

## 0.4.x

### Initial LLM advisor

- Added optional LLM-assisted project interpretation.
- Added support for local/LAN OpenAI-compatible LLM endpoints.
- Kept deterministic Cockpit functionality usable without an LLM.

### Runtime-state interpretation

Separated:

```text
agent.status = running
```

from evidence that useful project work is actually active.

Cockpit began correlating agent runtime state with assigned/in-progress work so stale runtime signals would not automatically appear as productive activity.

---

## 0.1.x - 0.3.x

### Initial Cockpit

Early releases established the deterministic owner dashboard and core read-only project interpretation.

Features introduced across these versions included:

- project overview;
- active work;
- blockers;
- owner actions;
- next-work visibility;
- orchestration-health checks;
- basic agent/project status interpretation.

These versions established the principle that Board Cockpit observes and explains Paperclip state rather than modifying it.
