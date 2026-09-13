# Artifact ingestion spike

This document records the 0.9.5 investigation only. Board Cockpit does **not** ingest documents or attachments in this release, and `src/manifest.ts` gains no capability.

## What the current SDK exposes

The investigation was performed against `@paperclipai/plugin-sdk` / Paperclip **2026.831.1**.

The worker SDK exposes two directly relevant content-read surfaces:

- `ctx.issues.documents.list(issueId, companyId)` and `ctx.issues.documents.get(issueId, key, companyId)`. The SDK type definitions explicitly require `issue.documents.read`; `get()` returns the document body.
- `ctx.issues.listAttachments(issueId, companyId)` and `ctx.issues.getAttachmentContent(attachmentId, companyId, { maxBytes })`. The SDK type definitions explicitly require `issue.attachments.read`; attachment bytes are returned through the capability-scoped host bridge and `maxBytes` can refuse oversized content.

The SDK also exposes project workspace **metadata** through `ctx.projects.listWorkspaces`, `getPrimaryWorkspace` and `getWorkspaceForIssue` under `project.workspaces.read`, but that is not a generic artifact-content API. No dedicated `work product` content client appears in the 2026.831.1 worker SDK surface.

The published 2026.831.1 plugin specification lists `issue.documents.read` in its Data Read capability table. The same table does not list `issue.attachments.read`, even though the 2026.831.1 SDK types require it. The specification also lists `assets.read`, but that is a different host/plugin asset surface and is not a substitute for issue-document or issue-attachment access. Because of this capability-documentation mismatch, attachment ingestion should not be added until the host capability contract is confirmed in the target Paperclip release.

## How content would enter Board Cockpit

If implemented later, text-bearing artifact content should enter through exactly the existing trust pipeline:

`host read API -> size/type checks -> prepareUntrustedLlmData -> attachProvenance -> advisor prompt legend`

Provenance would gain an `artifact` source kind whose ID is derived only from trusted Paperclip identifiers, never from artifact content. The source excerpt must be created after sanitization, exactly like current issue/comment provenance.

Artifact text can consume local-model context very quickly. A typical 8-16 KiB text document is roughly 2,000-4,000 tokens depending on language and formatting. A conservative initial policy would cap readable text at **16 KiB per artifact** and **48 KiB total artifact text per analysis snapshot**, with a small maximum artifact count and explicit truncation metadata. Binary formats would require a separately reviewed extraction path rather than being decoded blindly into the prompt.

## Capability approval and graceful degradation

Adding document ingestion would add `issue.documents.read` to the manifest. Adding attachment ingestion would also require `issue.attachments.read` once that capability is confirmed as supported by the host/version being targeted. Paperclip's capability model requires operator approval when an upgrade expands the declared capability set, so the operator should see these new reads during upgrade approval.

If the additional capability is not granted, Board Cockpit should continue normal issue/comment/handoff analysis without artifacts. The security/findings surface should state that artifact content was not read; lack of artifact access must never make ordinary Cockpit analysis fail.

## Recommendation

**Defer artifact ingestion until the attachment capability is documented consistently by the target Paperclip host, then implement issue documents first with strict byte caps and the existing sanitize-before-provenance pipeline.**
