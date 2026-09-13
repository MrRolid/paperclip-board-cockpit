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
- Injection-like instructions are detected across English, Czech, Slovak, German, Polish, French and Spanish using all language sets at once; matching is Unicode-aware and diacritics-insensitive for Latin-script text.
- Detection is precision-first because false positives redact legitimate advisor input; coverage and false positives are measured by the public regression corpus in CI. The corpus is a regression suite for covered phrasings, not a universal injection benchmark.
- Text in other scripts is not assumed safe: rare/mixed non-Latin script changes and common English prompt/credential tokens inside non-Latin text are flagged without redacting the line.
- System prompts explicitly state that project content is data, not authority.
- Epistemic-integrity rules prevent agent/handoff claims, status labels and `Verified` fields from being silently upgraded into stronger or independently verified facts.
- Source IDs are assigned by the plugin only after untrusted snapshot data has been sanitized; the model cannot create registry entries.
- Citations to source IDs that are not present in the snapshot registry are flagged as unknown/hallucinated provenance.
- Codex/Claude advisor subprocesses receive a small allow-listed environment rather than the full Paperclip worker environment.
- Generated advice is never automatically posted or executed.
- Suspicious generated advice is surfaced for manual review.

A syntactically valid provenance citation proves only that the referenced source exists in the sanitized snapshot; it does not prove that the source semantically supports the model's claim. Review the linked excerpt when the distinction matters.

These controls are defense in depth. They do not make arbitrary LLM output trustworthy. Review generated tasks/replies before using them.

## Private/LAN LLM endpoints

Paperclip's managed HTTP client intentionally blocks private/reserved destinations. Board Cockpit provides an explicit opt-in for operator-controlled private/LAN LLM endpoints.

Connection tests and model discovery use Paperclip's managed HTTP client for public endpoints. If an endpoint resolves to a private address and the private-network option is enabled, Board Cockpit uses its direct HTTP(S) client. Analysis calls use the direct client after the same destination-policy check because the host HTTP invocation scope may expire before a slow model responds.

Every direct connection is pinned to the exact DNS addresses that passed the policy check. The original configured hostname is retained for the HTTP `Host` header, TLS SNI and certificate validation. Direct requests refuse redirects instead of following them to a new destination.

Address classes are treated as follows:

| Class | Ranges/examples | Policy |
| --- | --- | --- |
| private | loopback, RFC1918, `100.64.0.0/10`, IPv6 ULA `fc00::/7` | Requires **Allow private/LAN local LLM endpoints** |
| link-local | `169.254.0.0/16`, IPv6 `fe80::/10` | Always rejected |
| public | other policy-approved IPv4/IPv6 addresses | Allowed; public probes use the managed host client |

Credentials embedded directly in the LLM URL are rejected. IPv6 private/link-local classification is applied only to actual IP literals or DNS results; ordinary DNS names beginning with strings such as `fd` are not classified by prefix.

### Known limitations of the endpoint policy

- Direct analysis/private-endpoint requests are intended for directly reachable endpoints and do not inherit proxy behavior from Paperclip's managed HTTP client.
- Destination policy is a network-boundary defense, not authentication of the LLM service itself. Use endpoint authentication and trusted transport where appropriate.

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
