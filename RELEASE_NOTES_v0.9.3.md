# Board Cockpit v0.9.3

v0.9.3 is a narrow hardening release for the direct local-LLM transport path.

## What changed

- Direct LLM requests refuse HTTP redirects and return `LLM endpoint returned a redirect; redirects are not followed`.
- DNS resolution used by the direct destination-policy check is now also used for the actual socket connection; the direct client does not perform a second independent destination lookup.
- The original configured hostname remains in use for the HTTP `Host` header and, for HTTPS, TLS SNI/certificate validation.
- Carrier-grade NAT `100.64.0.0/10` is classified as private and requires the existing private/LAN endpoint opt-in.
- IPv6 ULA and link-local checks apply only to actual IP literals or resolved IP addresses, not to ordinary DNS hostnames that happen to begin with `fc`, `fd` or `fe80`.
- Endpoint classification is centralized in one shared address classifier used by the surrounding policy helpers.
- Regression coverage was added for redirect refusal, DNS pinning, link-local rejection, CGNAT boundaries and IPv6 literal handling.

## What did not change

This release deliberately does **not** change:

- Paperclip capabilities or the read-only business-data boundary;
- project-state, continuation-decision or implementation-wave logic;
- LLM prompts or epistemic-integrity rules;
- owner-goal behavior;
- handoff parsing;
- UI layout or i18n;
- Codex/Claude advisor behavior.

The deterministic Cockpit continues to work without an LLM.
