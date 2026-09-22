import type { ProviderGoal } from "@t3tools/contracts";

export function goalStatusLabel(goal: ProviderGoal | null): string {
  if (!goal) return "No goal";
  switch (goal.status) {
    case "active":
      return "Active";
    case "paused":
      return "Paused";
    case "blocked":
      return "Blocked";
    case "usageLimited":
      return "Usage limit reached";
    case "budgetLimited":
      return "Token budget reached";
    case "complete":
      return "Complete";
  }
}
export const goalPauseDescription =
  "Pause stops automatic continuation after the current turn. Use Stop to interrupt the current turn.";
export const goalStartDescription =
  "Codex continues this explicit goal between turns. The model still decides when the goal is complete.";
