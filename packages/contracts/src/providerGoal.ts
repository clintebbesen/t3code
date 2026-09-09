import * as Schema from "effect/Schema";
import { ThreadId } from "./baseSchemas.ts";
import { TrimmedNonEmptyString } from "./baseSchemas.ts";

export const ProviderGoal = Schema.Struct({
  objective: Schema.String,
  status: Schema.Literals([
    "active",
    "paused",
    "blocked",
    "usageLimited",
    "budgetLimited",
    "complete",
  ]),
  tokenBudget: Schema.optionalKey(Schema.NullOr(Schema.Number)),
  tokensUsed: Schema.Number,
  timeUsedSeconds: Schema.Number,
  createdAt: Schema.Number,
  updatedAt: Schema.Number,
});
export type ProviderGoal = typeof ProviderGoal.Type;

export const ProviderGoalAction = Schema.Union([
  Schema.Struct({ action: Schema.Literals(["read", "pause", "resume", "clear"]) }),
  Schema.Struct({ action: Schema.Literal("start"), objective: TrimmedNonEmptyString }),
]);
export type ProviderGoalAction = typeof ProviderGoalAction.Type;
export const ProviderGoalInput = Schema.Struct({
  threadId: ThreadId,
  operation: ProviderGoalAction,
});
export type ProviderGoalInput = typeof ProviderGoalInput.Type;
export const ProviderGoalResult = Schema.Struct({ goal: Schema.NullOr(ProviderGoal) });
export type ProviderGoalResult = typeof ProviderGoalResult.Type;

export class ProviderGoalError extends Schema.TaggedErrorClass<ProviderGoalError>()(
  "ProviderGoalError",
  { threadId: ThreadId, cause: Schema.optional(Schema.Defect()) },
) {
  override get message(): string {
    return `Could not read or change the goal for thread ${this.threadId}.`;
  }
}
