import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "rolid.board-cockpit",
  apiVersion: 1,
  version: "0.9.5",
  displayName: "Board Cockpit",
  description:
    "Owner-centric Paperclip cockpit: project state, owner handoffs, implementation-wave context, original-project continuity, owner-defined tracking goals, secure next-task guidance, prompt-injection-resistant LLM assistance, manual verification, per-task advice, and orchestration health.",
  author: "Rolid",
  categories: ["ui"],
  capabilities: [
    "issues.read",
    "issue.relations.read",
    "issue.comments.read",
    "issue.interactions.read",
    "approvals.read",
    "agents.read",
    "plugin.state.read",
    "plugin.state.write",
    "http.outbound",
    "instance.settings.register",
    "ui.dashboardWidget.register",
    "ui.page.register",
    "ui.sidebar.register",
    "ui.detailTab.register",
  ],
  instanceConfigSchema: {
    type: "object",
    properties: {
      llmEnabled: {
        type: "boolean",
        title: "Enable LLM analysis",
        default: false,
        description: "Enables explicit next-step analysis through either the configured local OpenAI-compatible endpoint or the host Codex/Claude CLI selected from an existing Paperclip agent. No automatic LLM calls are made."
      },
      llmBaseUrl: {
        type: "string",
        title: "OpenAI-compatible base URL (optional)",
        default: "",
        description: "Used only for the local LLM source. Example: http://llm.home.arpa:8080/v1"
      },
      llmAllowPrivateNetwork: {
        type: "boolean",
        title: "Allow private/LAN local LLM endpoints",
        default: false,
        description: "When enabled, Board Cockpit connects directly from its local Node worker to the configured local LLM. Use this only for an operator-controlled LAN endpoint such as 192.168.x.x. Paperclip's audited ctx.http client intentionally blocks private/reserved IP ranges."
      },
      llmDefaultSource: {
        type: "string",
        title: "Default LLM provider",
        enum: ["local", "codex", "claude"],
        default: "local",
        description: "Default provider when no source has been selected in the Cockpit. Exact connected Codex/Claude agent is selected dynamically inside Board Cockpit."
      },
      llmTimeoutSeconds: {
        type: "integer",
        title: "Timeout (seconds)",
        minimum: 5,
        maximum: 120,
        default: 45
      },
      llmMaxTokens: {
        type: "integer",
        title: "Maximum output tokens",
        minimum: 128,
        maximum: 4096,
        default: 900
      }
    }
  },
  entrypoints: {
    worker: "./dist/worker.js",
    ui: "./dist/ui",
  },
  ui: {
    slots: [
      {
        type: "dashboardWidget",
        id: "board-cockpit-summary",
        displayName: "Board Cockpit",
        exportName: "DashboardWidget",
      },
      {
        type: "page",
        id: "board-cockpit-page",
        displayName: "Board Cockpit",
        exportName: "CockpitPage",
        routePath: "cockpit",
      },
      {
        type: "sidebar",
        id: "board-cockpit-sidebar",
        displayName: "Board Cockpit",
        exportName: "CockpitSidebarLink",
      },
      {
        type: "taskDetailView",
        id: "board-cockpit-issue-assistant",
        displayName: "Cockpit Assistant",
        exportName: "IssueCockpitAssistant",
        entityTypes: ["issue"],
      },
    ],
  },
};

export default manifest;
