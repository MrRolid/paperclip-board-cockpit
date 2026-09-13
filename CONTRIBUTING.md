# Contributing

Contributions are welcome.

## Development checks

Before submitting a change:

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

Keep the plugin's owner-facing behavior conservative:

- distinguish fact from inference,
- never turn `agent.status=running` alone into proof of useful work,
- prefer parent/root-wave handoffs over isolated child-task interpretation,
- do not add mutation capabilities merely for convenience,
- keep LLM calls explicit rather than automatic,
- do not expose model chain-of-thought/reasoning content,
- preserve the ability to use a local OpenAI-compatible LLM.

## Compatibility

When changing Paperclip SDK usage, test against the exact Paperclip release named in `package.json` and update compatibility notes if required.
