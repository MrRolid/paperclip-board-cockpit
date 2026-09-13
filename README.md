# Board Cockpit for Paperclip

**Board Cockpit** is an owner-centric control and LLM advisory plugin for [Paperclip](https://github.com/paperclipai/paperclip).

It is built for a specific problem that appears once autonomous agents become useful: agents can plan, implement, review and close tasks faster than a human owner can reconstruct what actually happened, what is waiting, what should be checked, and what should happen next.

Board Cockpit adds that missing human control layer.

> **Status:** public beta / early release. Developed against Paperclip `2026.831.1` and `@paperclipai/plugin-sdk 2026.831.1`. Paperclip's plugin API is still evolving, so future Paperclip upgrades may require compatibility changes.
>
> **Not an official Paperclip project.** Board Cockpit is an independent MIT-licensed plugin.

## What Board Cockpit answers

The plugin tries to answer six owner-level questions:

1. **What is happening now?**
2. **What is waiting for me?**
3. **Why is work moving or not moving?**
4. **What did a completed task or implementation wave actually change?**
5. **What should I manually verify?**
6. **What should the next task / implementation wave be, given the original project brief and my current goals?**

The design principle is simple: **Paperclip remains the execution/control plane for agents; Board Cockpit is the human control plane for the owner.**

---

## Main features

### 1. Full owner cockpit

Board Cockpit adds a full `/cockpit` page and a sidebar entry. The page summarizes:

- active work,
- runnable work,
- pending owner actions,
- blockers,
- stale `running` runtime signals,
- the original project brief / charter,
- the latest completed milestone,
- completed work since the owner last checked,
- orchestration health,
- the reason work is moving or not moving,
- an optional LLM analysis of the next action.

A compact widget is also added to the standard Paperclip dashboard.

### 2. Deterministic owner-action detection

Board Cockpit does not equate `agent.status = running` with useful work.

An agent is treated as actively working only when the runtime signal agrees with an assigned `in_progress` issue. Stale runtime state is shown separately.

The cockpit also detects an important project-management state:

```text
0 active work
0 runnable work
0 real blockers
previous implementation wave complete
project still has an original/continuing goal
```

Instead of reporting a misleading `IDLE / owner action: NO`, Board Cockpit classifies this as a **continuation decision**: the owner must either declare the project complete or authorize the next implementation wave.

### 3. Cockpit Assistant on every task

Every Paperclip issue gets a read-only **Cockpit Assistant** panel.

Available actions:

- **Summarize and explain**
- **What should I do next?**
- **What should I verify?**
- **Draft next task**
- **Draft a reply**
- **Translate**
- **Copy reply / copy next task**

Nothing is automatically posted to the issue. The assistant is deliberately advisory: the human owner remains the final authority.

### 4. Implementation-wave context

A child task is not analyzed in isolation. Board Cockpit resolves:

- parent tasks,
- ancestors,
- implementation-wave root,
- siblings,
- descendants,
- completion counts for the wave,
- blockers and relationships,
- recent comments,
- structured handoffs,
- the original top-level project brief.

That allows the assistant to tell the owner things such as:

> This child task is done. Do not reply here. Verify the completed implementation wave on ROL-22 using its manual acceptance instructions.

### 5. Structured completion handoffs

Board Cockpit understands the handoff pattern:

- **Result**
- **Verified**
- **Manual test**
- **Remaining limitations**
- **Next**

It uses these sections to distinguish automated testing, independent review, actual deployment, manual verification and known limitations.

### 6. Original-project continuity

The assistant carries forward the earliest substantive top-level project task as the original project/charter context.

This prevents a common failure mode where an agent correctly finishes the most recent wave but loses sight of the long-term product goal.

### 7. Owner-defined goals

The full Cockpit contains a **Owner goals** section.

Goals can be:

- priority `high`, `normal` or `low`,
- `active`, `paused` or `done`.

Examples:

```text
Reach the first real HTTP monitoring flow before adding pagination.
Keep the UI understandable to users who have never used Zabbix.
Minimize paid LLM use for routine owner summaries.
```

Active owner goals are included in next-wave planning and task advice. They are stored only in plugin state and do **not** mutate Paperclip issues.

### 8. Next-task / next-wave drafting

The `Draft next task` action compares:

- original project goal,
- capabilities already delivered,
- remaining goal gaps,
- current owner goals,
- completed-wave handoffs,
- current blockers and trust boundaries.

It is instructed to prefer the **smallest valuable end-to-end vertical slice**, rather than mechanically implementing the next technical TODO.

A ready-to-paste task should include:

- title,
- objective,
- concrete scope,
- acceptance criteria,
- explicit out-of-scope items,
- autonomy / stop conditions,
- security / review / deployment gates,
- owner handoff requirements.

#### Explicit task boundaries in v0.9.1

Generated next-task drafts use explicit markers:

```text
DRAFT NEXT TASK:
=== DRAFT NEXT TASK BEGIN ===

... only the paste-ready Paperclip task ...

=== DRAFT NEXT TASK END ===

OWNER DECISION NEEDED: YES|NO
SECURITY / TRUST BOUNDARIES:
...
RISKS / UNCERTAINTIES:
...
```

The **Copy next task** button copies only the content between `BEGIN` and `END`.

Everything after `=== DRAFT NEXT TASK END ===` is owner-facing advisory metadata and is intentionally excluded from the copied task.

### 9. Clickable advisor output

Advisor output recognizes:

- `http://` and `https://` URLs,
- Paperclip issue identifiers such as `ROL-22`.

They are rendered as active links where possible.

### 10. Multi-language UI

Current built-in UI locales:

- Czech
- English
- German
- Polish
- Slovak
- French
- Spanish

`Auto` follows the Paperclip/browser language when possible.

The host Paperclip translation catalogue is not currently exposed as a stable public plugin i18n API, so Board Cockpit maintains its own translations while following the host locale.

---

# LLM advisory modes

LLM use is **optional and manual**. Nothing is sent to an LLM until the owner clicks an analysis button.

Board Cockpit supports three advisor sources.

## Local OpenAI-compatible LLM

Any endpoint exposing an OpenAI-compatible API can be used, including `llama.cpp` / `llama-server`.

Example:

```text
http://192.168.1.50:8080/v1
```

The plugin can query `/v1/models` and select the advertised model automatically, so the operator normally only needs to enter the base URL.

Example model discovery:

```bash
curl http://192.168.1.50:8080/v1/models
```

## Existing Codex agent configuration

If a Paperclip agent uses a `codex_local` adapter, Board Cockpit can expose it as an advisory model choice.

The advisor uses the local Codex CLI in a restricted/read-only analysis path. It does not give the advisor permission to mutate Paperclip tasks.

## Existing Claude agent configuration

Likewise, `claude_local` agents can be exposed as advisory model choices and use the local Claude CLI.

The model choice shown in Board Cockpit follows the adapter/model information already associated with the Paperclip agent.

---

# Installation

## Supported environment

Board Cockpit v0.9.2 was developed against:

```text
Paperclip:               2026.831.1
@paperclipai/plugin-sdk: 2026.831.1
Node.js:                 24.x
pnpm:                    12.x
```

Because Paperclip plugins are still alpha, use the version-matching installer rather than copying `dist/` from another host.

## Requirements

You need:

- a working self-hosted/local Paperclip instance,
- `paperclipai` CLI configured for that instance,
- Node.js compatible with your Paperclip release,
- `pnpm`,
- permission to install local trusted plugins.

## Install from Git

```bash
git clone https://github.com/MrRolid/paperclip-board-cockpit.git
cd paperclip-board-cockpit
./install-local.sh
```

## Install from a release archive

```bash
unzip paperclip-board-cockpit-v0.9.2.zip
cd paperclip-board-cockpit-0.9.2
./install-local.sh
```

## What the installer does

`install-local.sh` performs the following pipeline:

```text
read local Paperclip version
→ align @paperclipai/plugin-sdk
→ install dependencies
→ TypeScript typecheck
→ unit/regression tests
→ build worker + UI
→ install or upgrade the local Paperclip plugin
```

It handles these states:

```text
not installed  → install
uninstalled    → install
ready          → upgrade
upgrade_pending → upgrade path
```

## Verify installation

```bash
paperclipai plugin inspect rolid.board-cockpit
paperclipai plugin health rolid.board-cockpit
```

Expected output includes:

```text
version=0.9.2
status=ready
```

Then hard-refresh the Paperclip browser UI.

The Cockpit header also displays its version so you can immediately see whether the new UI bundle is actually loaded.

---

# Configuration

Open:

```text
Settings → Plugins → Board Cockpit
```

## Minimal setup without LLM

No LLM configuration is required for the deterministic cockpit features.

You still get:

- project state,
- blockers,
- owner actions,
- original project context,
- implementation-wave context,
- completion summaries,
- owner goals,
- runtime anomaly detection.

## Local LLM setup

Typical trusted-LAN configuration:

```text
Enable LLM analysis: ON
OpenAI-compatible base URL: http://192.168.1.50:8080/v1
Allow private/LAN local LLM endpoints: ON
Default LLM provider: local
Maximum output tokens: 900
Timeout: 60
```

Use **Test Configuration** or **Detect model**.

A successful model probe should produce something similar to:

```text
PONG · thinkingcap · 35 ms
```

### Why the private/LAN checkbox exists

Paperclip's managed plugin HTTP client intentionally rejects private/reserved targets as an SSRF defense.

Board Cockpit can optionally bypass that restriction using direct Node `fetch`, but only for explicitly trusted local/private LLM endpoints.

Do not enable this for arbitrary user-supplied URLs.

---

# User manual

## Daily owner workflow

A typical workflow is:

1. Open **Board Cockpit** from the Paperclip sidebar.
2. Check **Project state**.
3. Look at **Waiting for me**.
4. Review the latest milestone / completed work.
5. If the project is idle, use the LLM advisor or open the completed wave and choose **Draft next task**.
6. Copy the proposed task only after checking its acceptance criteria and trust boundaries.
7. Create/authorize the next Paperclip task yourself.

Board Cockpit deliberately does not auto-create or auto-post tasks.

## Understanding project states

### RUNNING

There is evidence of active in-progress work backed by an assigned task.

### WAITING_FOR_OWNER

The owner must make a decision, answer a question, approve something, or authorize the next wave.

### BLOCKED

There is a real unresolved blocker relation.

### READY_BUT_IDLE

Runnable work exists but no worker is actively executing it.

### IDLE

No active/runnable work exists and there is no detected continuation decision.

## Runtime anomaly warning

Paperclip may report an agent as `running` even when no `in_progress` issue is attached to that agent.

Board Cockpit reports this separately instead of inflating the active-worker count.

## Using task-level analysis

Open any issue and use **Cockpit Assistant**.

### Summarize and explain

Use when you opened a technical child task and want an owner-level explanation.

### What should I do next?

Use when you are unsure whether to reply, approve, wait, or move to another issue.

### What should I verify?

Use after implementation/review/deployment. It asks for concrete UI URLs, expected results and manual acceptance steps.

### Draft next task

Best used on the root of a completed implementation wave.

The assistant considers the original brief and active owner goals and creates a paste-ready next task between explicit `BEGIN`/`END` markers.

### Draft a reply

Produces a suggested owner response. It is never posted automatically.

### Translate

Translates the owner-relevant task context to the active Cockpit language while preserving technical identifiers.

---

# Owner goals manual

Owner goals are useful for temporary or strategic priorities that should influence planning without rewriting the original project brief.

Examples:

```text
HIGH: Reach a real automatically scheduled HTTP check before adding alerting.
NORMAL: Keep setup usable without CLI access.
LOW: Prefer local LLM analysis for routine summaries.
```

Recommended use:

- keep goals short,
- describe desired outcomes, not implementation details,
- use `high` sparingly,
- mark completed goals `done`,
- pause goals that should temporarily stop influencing planning.

Owner goals are advisory. They cannot override hard security boundaries or silently mutate Paperclip data.

---

# Security model

Board Cockpit is intentionally **read-only against Paperclip business data**.

It reads issues, relationships, comments, interactions, approvals and agents. It writes only its own plugin state, such as:

- last-seen time,
- selected language,
- selected LLM source,
- latest advisory result,
- detected local model,
- owner goals.

It does **not** request capabilities to:

- update issues,
- create issues,
- change relationships,
- invoke agents as Paperclip workers,
- approve requests,
- execute arbitrary remote commands.

## Declared capabilities

Current manifest capabilities:

```text
issues.read
issue.relations.read
issue.comments.read
issue.interactions.read
approvals.read
agents.read
plugin.state.read
plugin.state.write
http.outbound
instance.settings.register
ui.dashboardWidget.register
ui.page.register
ui.sidebar.register
ui.detailTab.register
```

## Prompt-injection defenses

Project content is untrusted input.

Before issue/comment/handoff text is sent to an LLM, Board Cockpit applies defense-in-depth processing including:

- input size/depth limits,
- removal of zero-width and bidi control characters,
- credential/token/password redaction,
- detection/redaction of common prompt-injection phrases,
- an explicit untrusted-data envelope,
- system instructions that project text is data, not authority,
- generated-advice safety linting.

The UI shows security findings if preprocessing changed suspicious input.

## LLM output is not trusted

Board Cockpit may flag generated advice that appears to suggest dangerous patterns such as:

- disabling authentication/TLS/review,
- publishing secrets,
- unsafe shell pipelines,
- broad permission changes,
- running as root,
- bypassing tenancy or trust boundaries.

This is advisory linting, not a formal security proof.

**Always review generated tasks before executing them.**

## Secret handling

Do not paste secrets into owner goals or task text.

The plugin attempts to redact common secret formats before LLM submission, but redaction cannot guarantee detection of every proprietary credential format.

## LAN LLM warning

`Allow private/LAN local LLM endpoints` deliberately creates a narrowly scoped bypass around Paperclip's managed outbound-HTTP protections.

Only use it for an operator-controlled endpoint.

Board Cockpit rejects obviously unsafe metadata/link-local destinations and credentials embedded directly in the LLM URL, but the operator remains responsible for the endpoint.

For more detail see [SECURITY.md](SECURITY.md).

---

# Permissions and privacy

## What leaves Paperclip?

Nothing leaves Paperclip because of Board Cockpit unless you explicitly run an LLM analysis.

When an analysis is requested, a bounded/sanitized project snapshot is sent to the selected advisor source:

- local OpenAI-compatible endpoint, or
- selected local Codex/Claude CLI.

Review your own model/provider privacy policy before using project data with external services.

## What is stored?

Board Cockpit stores its own state in Paperclip plugin state. Generated LLM analyses can be retained as the latest analysis for continuity after refresh.

It does not create a separate external database.

---

# Architecture overview

```text
Paperclip issues / agents / approvals
          │
          ▼
   Board Cockpit worker
          │
          ├─ deterministic project-state synthesis
          ├─ implementation-wave resolution
          ├─ original-brief continuity
          ├─ owner-goal overlay
          ├─ structured handoff parsing
          ├─ prompt/security preprocessing
          │
          └──────────────┐
                         ▼
               optional advisor model
               local / Codex / Claude
                         │
                         ▼
                   advisory result
                         │
                         ▼
               Board Cockpit UI
```

The deterministic layer is intentionally useful without an LLM.

The LLM sits on top of already structured project context; it is not the source of truth for task states or relationships.

---

# Troubleshooting

## Plugin says `failed to render`

Check that the UI and worker versions match:

```bash
paperclipai plugin inspect rolid.board-cockpit
paperclipai plugin health rolid.board-cockpit
```

Re-run:

```bash
./install-local.sh
```

Then hard-refresh the browser.

## `Plugin already installed`

Use the provided installer rather than calling `plugin install` manually. It detects install/upgrade/uninstalled state.

## Upgrade introduces new capabilities

Paperclip intentionally requires operator approval when a plugin requests new capabilities.

Review the requested capabilities before approving. Do not approve a capability escalation you do not understand.

## Local LLM: private/reserved IP error

Paperclip's managed HTTP client blocks private ranges.

If the endpoint is your trusted local model, enable:

```text
Allow private/LAN local LLM endpoints
```

Do not use the bypass for arbitrary URLs.

## Local model returns an empty response

Use model discovery first. Some reasoning models can consume a tiny completion budget on hidden thinking and return no normal content. Board Cockpit's connectivity test uses `/v1/models`, not a tiny chat prompt.

## Codex/Claude analysis returns only a run marker

Board Cockpit uses the host CLI analysis path rather than relying on a Paperclip agent-session summary marker. Confirm the CLI is installed and authenticated for the Paperclip service user.

## Analysis appears stuck forever

Modern versions keep long-running analysis results in worker memory and persist them only during a fresh valid Paperclip invocation scope. The UI polls for completion.

A plugin reload interrupts in-memory analysis; the next data load should convert an orphaned `running` result into an explicit interrupted/error state.

## Wrong model name

Use **Detect model**. Manual model naming is normally unnecessary for local OpenAI-compatible endpoints.

## Owner goals are not visible

Check the version shown in the Cockpit header. Owner goals require v0.9.0+.

---
# Roadmap

Next three steps, in order:

1. 0.9.3: npm package and hardening of the direct LLM fetch path.
2. 0.9.4: source-level provenance. Every advisor claim cites the exact issue, comment or handoff field it came from.
3. 0.9.5: injection detection for all shipped UI languages, measured by a regression corpus in CI.

Full roadmap and the things that are deliberately not planned: [docs/ROADMAP.md](docs/ROADMAP.md).

# Known limitations

- Paperclip plugin APIs are still alpha and can change between releases.
- Host-native Paperclip translation resources are not exposed through a stable plugin API, so Board Cockpit ships its own translations.
- Project-origin detection is heuristic: it selects the earliest substantive top-level issue available in the bounded issue snapshot.
- Next-task planning is advisory and depends on the quality/completeness of issue descriptions and handoffs.
- Secret redaction and prompt-injection detection are defense in depth, not a guarantee.
- The plugin does not create/modify Paperclip tasks automatically by design.
- Very large projects may eventually need pagination/streamed project-context acquisition beyond the current bounded snapshots.

---

# Upgrading

From an existing checkout:

```bash
git pull
./install-local.sh
```

From a release archive, replace the old source tree and run the installer again.

The installer will perform an upgrade when the plugin is already in `ready` state.

Always review capability changes during an upgrade.

---

# Uninstalling

Use Paperclip's plugin manager:

```text
Settings → Plugins → Board Cockpit → uninstall/delete
```

Paperclip may preserve an `uninstalled` plugin record. A later `./install-local.sh` reinstall is supported.

---

# Development

Install dependencies:

```bash
pnpm install
```

Run checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

Repository layout:

```text
src/manifest.ts       plugin manifest/capabilities/settings
src/worker.ts         data synthesis, LLM orchestration, plugin actions
src/security.ts       input/output LLM safety preprocessing
src/briefing.ts       structured handoff parsing
src/runtime.ts        runtime-signal interpretation
src/locale.ts         locale resolution
src/ui/index.tsx      dashboard, full cockpit, task assistant
src/ui/i18n.ts        UI translations
tests/                regression tests
```

## CI

GitHub Actions runs:

```text
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Design rule for contributions

Board Cockpit should remain useful even when LLM analysis is disabled.

New features should prefer:

1. deterministic Paperclip-state interpretation,
2. explicit evidence/provenance,
3. bounded LLM context,
4. human approval before mutation.

See [CONTRIBUTING.md](CONTRIBUTING.md).

---

# Reporting security issues

Please read [SECURITY.md](SECURITY.md).

Do not include:

- API keys,
- Paperclip bearer tokens,
- private issue snapshots,
- internal hostnames/IPs,
- proprietary source code,
- LLM credentials

in a public GitHub issue.

---

# Release 0.9.2

v0.9.2 is a deliberately narrow prompt-safety release. It adds epistemic-integrity rules for LLM analysis without changing orchestration, UI behavior, Paperclip capabilities, or project-state logic.

The advisor is now explicitly instructed to preserve the provenance and strength of evidence, avoid upgrading agent/handoff claims into independent verification, retain caveats and limitations, mark missing or conflicting evidence as uncertain, and avoid unsupported precision.

See [CHANGELOG.md](CHANGELOG.md) and [RELEASE_NOTES_v0.9.2.md](RELEASE_NOTES_v0.9.2.md).

---

# Release 0.9.1

v0.9.1 is the first release intended for public GitHub distribution.

Changes from 0.9.0:

- explicit `=== DRAFT NEXT TASK BEGIN ===` / `=== DRAFT NEXT TASK END ===` markers,
- **Copy next task** copies only the paste-ready task body,
- task draft is visually separated from owner advisory metadata,
- plugin version is visible in the Cockpit header,
- public README/manual expanded for installation, operation, security and troubleshooting,
- existing owner-goal, continuation-decision, prompt-injection and wave-context functionality retained.

See [CHANGELOG.md](CHANGELOG.md).

---

# License

MIT. See [LICENSE](LICENSE).

