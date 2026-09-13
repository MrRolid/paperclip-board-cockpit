# LLM security notes

Paperclip project text, comments, issue descriptions, handoffs and owner goals can contain malicious or accidental instructions. Board Cockpit treats them as data, not authority.

Defense in depth includes bounded input, hidden-Unicode stripping, common secret redaction, prompt-injection phrase detection/redaction, explicit untrusted-data envelopes, epistemic-integrity rules that preserve evidence provenance, and advisory-output safety linting.

The model is instructed not to turn agent reports, handoff claims, status labels or `Verified` fields into stronger facts than the supplied state supports. Missing, stale, ambiguous, conflicting or indirect evidence should remain explicitly uncertain rather than being polished into a definitive conclusion.

These controls reduce risk but do not make LLM output safe to execute automatically. Board Cockpit therefore keeps generated replies/tasks behind an explicit human copy/post step.

Local/private LLM access is an operator-controlled exception to Paperclip's normal private-network restrictions and should only be enabled for trusted endpoints. Direct requests refuse redirects and are DNS-pinned to the exact addresses that passed Board Cockpit's endpoint policy check.
