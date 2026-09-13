# Board Cockpit v0.9.1

This is the first release intended for broad public GitHub distribution.

## Highlights

- Explicit BEGIN/END boundaries around generated next-task drafts.
- `Copy next task` copies only the paste-ready task body.
- Owner advisory metadata remains visible but outside the copied task.
- Owner goals influence next-wave planning without mutating Paperclip issues.
- Deterministic continuation-decision detection for completed waves with no runnable follow-up.
- Original project brief and implementation-wave context carried into task advice.
- Local OpenAI-compatible, Codex CLI and Claude CLI advisor choices.
- Prompt-injection defenses, secret redaction and generated-advice safety linting.
- Read-only capability boundary against Paperclip business data.
- Expanded installation, operator, security, privacy and troubleshooting documentation.

## Compatibility

Developed against Paperclip / plugin SDK `2026.831.1`.

## Install

```bash
git clone https://github.com/MrRolid/paperclip-board-cockpit.git
cd paperclip-board-cockpit
./install-local.sh
```

or install from the release archive and run the same installer.

## Upgrade note

Paperclip may require explicit approval when a plugin upgrade introduces new capabilities. Review capability changes before approving them.
