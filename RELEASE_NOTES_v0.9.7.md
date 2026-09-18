# Board Cockpit v0.9.7

v0.9.7 adds **Grok CLI** advisor support and lets Board Cockpit reuse compatible LLM advisor configurations across Paperclip companies without mixing their project context.

## Grok CLI advisor

Board Cockpit now recognizes:

- `grok_local`
- `xai_local`
- `grok_cli`
- `xai_grok_local`
- generic process/command adapters only when the configured command itself directly launches `grok`

Grok is used only as an explicitly selected advisory model. The direct advisor path launches it with:

```text
--sandbox read-only
--disallowed-tools run_terminal_cmd,search_replace,web_search,web_fetch
```

Board Cockpit does not add Paperclip mutation or agent-invoke capabilities for this feature.

The advisor path intentionally does not force `--model` for Grok; it uses the model/default already configured by the CLI environment.

## Reusable advisors across companies

Paperclip keeps agent reads scoped to the active company. Board Cockpit does not bypass that boundary.

Instead, v0.9.7 maintains a bounded **instance-scoped advisor registry**. When Board Cockpit is opened for a company, it can register compatible, currently visible advisor launch profiles. Other companies can then select those entries under **Shared advisors from other companies**.

The registry may contain:

- compatible Codex/Claude/Grok CLI launch profiles,
- a working local OpenAI-compatible endpoint configured for a company.

### What is shared

Only the minimum launch metadata needed to reuse the advisor:

- advisor/provider kind,
- display name and model metadata,
- direct CLI command,
- allow-listed CLI configuration-home paths (`CODEX_HOME`, `CLAUDE_CONFIG_DIR`, `GROK_HOME`, `GROK_CONFIG_DIR`, `XAI_CONFIG_DIR`),
- for local OpenAI-compatible endpoints: URL, model, LAN policy, timeout and token limit.

### What is not shared

The registry does **not** copy:

- issues,
- comments,
- owner goals,
- project context,
- analysis output,
- arbitrary environment variables,
- API keys or bearer tokens.

The target company's sanitized snapshot is sent only when the owner explicitly clicks an analysis action.

## Discovery behavior

Shared discovery is passive rather than a cross-company scan. After upgrading to v0.9.7, open Board Cockpit once in an existing company to register its compatible advisors. They can then become selectable in other companies on the same Paperclip instance.

Profiles are refreshed when seen and old entries are pruned after 180 days. The registry is bounded to 100 CLI and 50 local-endpoint profiles.

## Compatibility and security boundary

- Cockpit schema: `9`
- Plugin version: `0.9.7`
- No `issues.update`
- No `issue.relations.write`
- No `agents.invoke`
- No `companies.read`
- Existing local OpenAI-compatible, Codex and Claude advisor paths remain available.
- Owner goals and project state remain company-scoped.

## Known limitation

For security, shared CLI profiles do not copy API-key environment variables. A CLI that works only because an API key exists solely in one Paperclip agent's private adapter environment may need its own persistent CLI login/config-home setup before it can be reused by another company. OAuth/session-backed CLI configurations and shared config-home paths are the intended path.
