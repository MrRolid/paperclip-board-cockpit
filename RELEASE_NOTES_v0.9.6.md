# Board Cockpit v0.9.6

v0.9.6 is an orchestration-reasoning and token-efficiency hardening release.

The release addresses a failure mode where an existing implementation wave could be described as blocked or stale and the advisor could then escalate that condition into a generic owner action or suggest another top-level implementation task. The Cockpit now derives the relevant orchestration classification from structured Paperclip state before the LLM sees the snapshot.

## Deterministic blocked-state classification

Blocked tasks are now classified as one of:

- `BLOCKED_BY_OPEN_TASK` — a recorded blocker is still open;
- `STALE_BLOCKER` — blockers exist but are already terminal;
- `BLOCKED_WITHOUT_RELATION` — the task is blocked but no blocker relation is recorded;
- `BLOCKER_STATE_UNKNOWN` — relation data could not be read or a blocker state is unknown.

A relation-read failure is no longer silently converted to an empty relation list. This prevents missing evidence from being presented as a confident stale-state diagnosis.

## Existing-wave protection

The project-level deterministic decision now exposes:

- primary orchestration classification;
- recommended action code;
- whether an implementation wave is still open;
- whether owner action is actually required;
- whether a new top-level task may be suggested;
- whether coordinator/wakeup state needs attention.

Most importantly, a continuation/planning-gap owner action can only be created when **no open issue remains**. A stale blocked task or orphaned `in_progress` task therefore cannot be mistaken for a completed wave that needs a new plan.

If executable work exists, the deterministic recommendation is to resume that existing work. A concrete owner-controlled item remains visible but does not freeze unrelated runnable tasks. If stale state exists, the recommendation is to reconcile the existing wave rather than create another one.

## Idle/stale execution detection

An `in_progress` task with no active worker is treated as orchestration recovery rather than as project completion. Coordinator heartbeat/runtime state is also surfaced more explicitly when existing work needs attention.

## LLM anti-meta-work rules

The project and task advisor prompts now explicitly require the model to:

- follow the deterministic orchestration classification instead of inventing a more dramatic explanation;
- avoid new implementation waves while an existing wave remains open;
- output `Suggested next task: NOT NEEDED` unless structured state permits a new task;
- never recommend blind `blocked -> todo/in_progress` status changes;
- treat stale heartbeat, stale dependency state and missing relation data as orchestration issues, not automatic owner blockers;
- prefer existing executable implementation work over recovery/management task churn;
- avoid “orchestration of orchestration” loops;
- distinguish verified structured state, inference and unknown evidence.

## UI

The Cockpit now shows the deterministic orchestration classification and precise blocked-task state. Stale blockers, missing blocker relations and unreadable relation state are no longer presented as the same condition.

Cockpit schema is bumped to `8`, so a UI/worker version mismatch is detected after upgrade.

## Security and compatibility

The plugin remains read-only with respect to Paperclip project state. v0.9.6 does **not** add:

- `issues.update`;
- `issue.relations.write`;
- `agents.invoke`;
- automatic task unblocking;
- automatic agent wakeups;
- automatic LLM analysis.

This is deliberate: the release improves diagnosis and recommendation quality without turning Board Cockpit into a second scheduler.

## Token-efficiency scope

Board Cockpit analysis is still explicitly user-triggered; it does not start project-summary LLM calls automatically. v0.9.6 reduces prompt-driven management churn and suppresses redundant new-task advice.

Paperclip-wide execution/orchestration token accounting is **not** added because the currently used read-only plugin data does not expose a reliable project-wide token ledger. The plugin does not fabricate token estimates from character counts.

## Regression coverage

`tests/v096.spec.ts` covers:

- legitimate open blockers;
- completed/stale blockers;
- blocked-without-relation;
- unreadable/unknown relation state;
- existing executable child work;
- open-wave suppression of continuation/new-task advice;
- orphaned `in_progress` work;
- concrete owner blockers, including coexistence with independent runnable work;
- anti-meta-work and no-blind-unblock prompt guards;
- schema/version and read-only capability invariants.
