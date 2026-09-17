export type BlockedClassification =
  | "BLOCKED_BY_OPEN_TASK"
  | "STALE_BLOCKER"
  | "BLOCKED_WITHOUT_RELATION"
  | "BLOCKER_STATE_UNKNOWN";

export type BlockerState = {
  status: string;
};

export type BlockedStateInput = {
  relationKnown: boolean;
  blockers: BlockerState[];
};

export function classifyBlockedState(input: BlockedStateInput): BlockedClassification {
  if (!input.relationKnown) return "BLOCKER_STATE_UNKNOWN";
  if (input.blockers.length === 0) return "BLOCKED_WITHOUT_RELATION";
  if (input.blockers.some((blocker) => !blocker.status.trim() || blocker.status.trim().toLowerCase() === "unknown")) {
    return "BLOCKER_STATE_UNKNOWN";
  }
  const hasOpenBlocker = input.blockers.some((blocker) => !isTerminalStatus(blocker.status));
  return hasOpenBlocker ? "BLOCKED_BY_OPEN_TASK" : "STALE_BLOCKER";
}

export function isTerminalStatus(status: string): boolean {
  const normalized = status.trim().toLowerCase();
  return normalized === "done" || normalized === "cancelled" || normalized === "canceled";
}

export type ProjectOrchestrationInput = {
  activeWorkers: number;
  runnableTasks: number;
  inProgressTasks: number;
  directOwnerActions: number;
  openIssues: number;
  terminalIssues: number;
  hasProjectIntent: boolean;
  blockedClassifications: BlockedClassification[];
  coordinatorPresent: boolean;
  coordinatorHasActiveIssue: boolean;
  coordinatorRuntimeStale: boolean;
};

export type ProjectOrchestrationPrimary =
  | "RUNNING"
  | "OWNER_BLOCKER"
  | "EXECUTABLE_WORK"
  | "BLOCKED_BY_OPEN_TASK"
  | "STALE_ORCHESTRATION"
  | "ORCHESTRATION_STATE_UNKNOWN"
  | "PLANNING_GAP"
  | "IDLE";

export type ProjectOrchestrationClassification =
  | ProjectOrchestrationPrimary
  | "COORDINATOR_STALE_OR_IDLE"
  | "EXISTING_WAVE_NEEDS_ATTENTION";

export type RecommendedActionCode =
  | "CONTINUE_ACTIVE_WORK"
  | "RESUME_EXECUTABLE_WORK"
  | "RESOLVE_OWNER_BLOCKER"
  | "WAIT_FOR_OPEN_BLOCKER"
  | "RECONCILE_STALE_ORCHESTRATION"
  | "RECONCILE_UNKNOWN_ORCHESTRATION"
  | "DECIDE_PROJECT_CONTINUATION"
  | "NO_ACTION";

export type ProjectOrchestrationDecision = {
  primary: ProjectOrchestrationPrimary;
  classifications: ProjectOrchestrationClassification[];
  recommendedAction: RecommendedActionCode;
  existingWaveOpen: boolean;
  ownerActionRequired: boolean;
  continuationDecisionNeeded: boolean;
  shouldSuggestNewTask: boolean;
  coordinatorNeedsAttention: boolean;
};

/**
 * Deterministic project-control decision. This function intentionally contains
 * no LLM semantics: it only interprets structured Paperclip state.
 */
export function decideProjectOrchestration(input: ProjectOrchestrationInput): ProjectOrchestrationDecision {
  const existingWaveOpen = input.openIssues > 0;
  const hasOpenBlocker = input.blockedClassifications.includes("BLOCKED_BY_OPEN_TASK");
  const hasStaleBlocker = input.blockedClassifications.some((item) => item === "STALE_BLOCKER" || item === "BLOCKED_WITHOUT_RELATION");
  const hasUnknownBlocker = input.blockedClassifications.includes("BLOCKER_STATE_UNKNOWN");
  const orphanedInProgress = input.inProgressTasks > 0 && input.activeWorkers === 0;
  const existingWorkNeedsRecovery = input.runnableTasks > 0 || orphanedInProgress || hasStaleBlocker || hasUnknownBlocker;
  const coordinatorNeedsAttention =
    existingWorkNeedsRecovery &&
    input.activeWorkers === 0 &&
    input.coordinatorPresent &&
    (!input.coordinatorHasActiveIssue || input.coordinatorRuntimeStale);

  const continuationDecisionNeeded =
    !existingWaveOpen &&
    input.activeWorkers === 0 &&
    input.runnableTasks === 0 &&
    input.directOwnerActions === 0 &&
    input.terminalIssues > 0 &&
    input.hasProjectIntent;

  let primary: ProjectOrchestrationPrimary;
  let recommendedAction: RecommendedActionCode;

  if (input.activeWorkers > 0) {
    primary = "RUNNING";
    recommendedAction = "CONTINUE_ACTIVE_WORK";
  } else if (input.runnableTasks > 0) {
    // A concrete owner item may block one branch without blocking unrelated
    // executable work. Keep the owner action visible, but keep execution moving.
    primary = "EXECUTABLE_WORK";
    recommendedAction = "RESUME_EXECUTABLE_WORK";
  } else if (input.directOwnerActions > 0) {
    primary = "OWNER_BLOCKER";
    recommendedAction = "RESOLVE_OWNER_BLOCKER";
  } else if (orphanedInProgress) {
    primary = "STALE_ORCHESTRATION";
    recommendedAction = "RECONCILE_STALE_ORCHESTRATION";
  } else if (hasOpenBlocker) {
    primary = "BLOCKED_BY_OPEN_TASK";
    recommendedAction = "WAIT_FOR_OPEN_BLOCKER";
  } else if (hasStaleBlocker) {
    primary = "STALE_ORCHESTRATION";
    recommendedAction = "RECONCILE_STALE_ORCHESTRATION";
  } else if (hasUnknownBlocker) {
    primary = "ORCHESTRATION_STATE_UNKNOWN";
    recommendedAction = "RECONCILE_UNKNOWN_ORCHESTRATION";
  } else if (continuationDecisionNeeded) {
    primary = "PLANNING_GAP";
    recommendedAction = "DECIDE_PROJECT_CONTINUATION";
  } else {
    primary = "IDLE";
    recommendedAction = "NO_ACTION";
  }

  const classifications: ProjectOrchestrationClassification[] = [primary];
  if (coordinatorNeedsAttention) classifications.push("COORDINATOR_STALE_OR_IDLE");
  if (existingWaveOpen && input.activeWorkers === 0 && existingWorkNeedsRecovery) {
    classifications.push("EXISTING_WAVE_NEEDS_ATTENTION");
  }

  return {
    primary,
    classifications,
    recommendedAction,
    existingWaveOpen,
    ownerActionRequired: input.directOwnerActions > 0 || continuationDecisionNeeded,
    continuationDecisionNeeded,
    shouldSuggestNewTask: continuationDecisionNeeded,
    coordinatorNeedsAttention,
  };
}
