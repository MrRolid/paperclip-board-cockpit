# Operations guide

## Install / upgrade

```bash
./install-local.sh
```

## Health

```bash
paperclipai plugin inspect rolid.board-cockpit
paperclipai plugin health rolid.board-cockpit
```

## Development checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

## After upgrade

Hard-refresh the browser and verify that the version shown in the Cockpit header matches the installed manifest version.

## Capability escalation

When Paperclip rejects an upgrade because new capabilities were introduced, review the requested capability list. Capability changes must be explicitly approved; do not bypass this control blindly.
