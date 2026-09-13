export function classifyReportedRunning<T extends { issue: unknown | null }>(agents: T[]): {
  activeWorkers: T[];
  runtimeAnomalies: T[];
} {
  return {
    activeWorkers: agents.filter((agent) => Boolean(agent.issue)),
    runtimeAnomalies: agents.filter((agent) => !agent.issue),
  };
}
