# Board Cockpit architecture notes

Board Cockpit intentionally separates deterministic Paperclip state synthesis from optional LLM interpretation.

## Deterministic layer

The worker reads bounded Paperclip data using declared read capabilities and synthesizes project state, implementation-wave context, owner actions, runtime anomalies, original-project context and structured handoffs.

This layer should stay useful with all LLM features disabled.

## Advisory layer

LLM prompts receive a bounded, sanitized snapshot produced by the deterministic layer. The LLM never becomes authoritative for issue state, blockers, agent activity or approvals.

## Mutation boundary

The plugin writes only plugin-owned state. It does not request issue/task mutation capabilities.

## UI surfaces

- dashboard widget
- full `/cockpit` page
- sidebar entry
- per-task Cockpit Assistant
