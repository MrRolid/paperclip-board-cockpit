# Board Cockpit v0.9.2

v0.9.2 is a narrow prompt-safety release focused on **epistemic integrity**.

## What changed

Board Cockpit's LLM prompts now explicitly require the advisor to:

- preserve the source and strength of evidence;
- distinguish facts shown by the snapshot from claims reported by an agent or handoff;
- treat `Verified` fields, passing-status labels and agent assertions as reported evidence unless independent verification is explicitly present;
- retain caveats, failures, partial coverage and remaining limitations;
- mark missing, stale, ambiguous, conflicting or indirect evidence as uncertain instead of filling gaps with plausible details;
- avoid treating the absence of a reported problem as proof that no problem exists;
- avoid unsupported precision such as invented confidence scores, percentages, counts, dates, durations, causal explanations, test coverage or URLs;
- prefer a narrower supported statement over a broader polished statement that would require inference.

The untrusted-data security envelope carries the same evidence-provenance rule so project content cannot silently acquire stronger epistemic status merely because it appears under a label such as `Verified`.

## What did not change

This release deliberately does **not** change:

- Paperclip orchestration or project-state logic;
- issue/agent mutation capabilities;
- owner-goal behavior;
- continuation-decision logic;
- UI workflow;
- LLM provider selection;
- deployment behavior;
- existing prompt-injection, secret-redaction or Unicode defenses.

The change is intentionally limited to prompt/evidence handling plus regression coverage and release metadata.
