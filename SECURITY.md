# Security policy

Board Cockpit is designed as a **read-only owner-assistance layer** over Paperclip project data.

## Capability boundary

The plugin requests read capabilities for issues, relations, comments, interactions, approvals and agents, plus plugin-owned state, UI registration and optional outbound HTTP for LLM access.

It does not request Paperclip business-data mutation capabilities such as issue update/create, relation writes, approval decisions or arbitrary agent invocation.

## LLM execution

LLM calls happen only after an explicit user action.

- Project/task text is treated as untrusted data.
- Issue titles, descriptions, comments, handoffs, logs and URLs are bounded/sanitized before model submission.
- Common credential/token/password formats are redacted.
- Hidden bidirectional/zero-width controls are removed.
- Common prompt-injection-like instructions are detected/redacted.
- System prompts explicitly state that project content is data, not authority.
- Epistemic-integrity rules prevent agent/handoff claims, status labels and `Verified` fields from being silently upgraded into stronger or independently verified facts.
- Codex/Claude advisor subprocesses receive a small allow-listed environment rather than the full Paperclip worker environment.
- Generated advice is never automatically posted or executed.
- Suspicious generated advice is surfaced for manual review.

These controls are defense in depth. They do not make arbitrary LLM output trustworthy. Review generated tasks/replies before using them.

## Private/LAN LLM endpoints

Paperclip's managed HTTP client intentionally blocks private/reserved destinations. Board Cockpit provides an explicit opt-in for operator-controlled LAN LLM endpoints.

Only enable **Allow private/LAN local LLM endpoints** for infrastructure you control. The bypass is limited to loopback/RFC1918/ULA-style destinations; obvious metadata/link-local targets and credentials embedded in endpoint URLs are rejected.

## Sensitive data

Do not paste secrets into owner goals, task descriptions or public bug reports. Automatic redaction cannot guarantee recognition of every proprietary credential format.

## Reporting a vulnerability

If GitHub private vulnerability reporting is enabled for the repository, use it for sensitive reports. Otherwise contact the maintainer privately before disclosing exploitable details.

Do **not** open a public issue containing:

- credentials or API keys,
- private Paperclip issue content,
- internal hostnames/IPs that should remain private,
- source code that cannot be published,
- model authentication files,
- complete environment dumps.
