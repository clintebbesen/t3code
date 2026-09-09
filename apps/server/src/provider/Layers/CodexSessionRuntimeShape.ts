import type {
  ApprovalRequestId,
  ProviderApprovalDecision,
  ProviderEvent,
  ProviderGoalAction,
  ProviderGoalResult,
  ProviderSession,
  ProviderTurnStartResult,
  ProviderUserInputAnswers,
  TurnId,
} from "@t3tools/contracts";
import type * as Effect from "effect/Effect";
import type * as Stream from "effect/Stream";
import type * as EffectCodexSchema from "effect-codex-app-server/schema";
import type {
  CodexSessionRuntimeError,
  CodexSessionRuntimeSendTurnInput,
  CodexThreadSnapshot,
} from "./CodexSessionRuntime.ts";

export interface CodexSessionRuntimeShape {
  readonly controlGoal?: (
    operation: ProviderGoalAction,
  ) => Effect.Effect<ProviderGoalResult, CodexSessionRuntimeError>;
  readonly start: () => Effect.Effect<ProviderSession, CodexSessionRuntimeError>;
  readonly getSession: Effect.Effect<ProviderSession>;
  readonly sendTurn: (
    input: CodexSessionRuntimeSendTurnInput,
  ) => Effect.Effect<ProviderTurnStartResult, CodexSessionRuntimeError>;
  readonly interruptTurn: (turnId?: TurnId) => Effect.Effect<void, CodexSessionRuntimeError>;
  readonly readThread: Effect.Effect<CodexThreadSnapshot, CodexSessionRuntimeError>;
  readonly rollbackThread: (
    numTurns: number,
  ) => Effect.Effect<CodexThreadSnapshot, CodexSessionRuntimeError>;
  readonly uploadFeedback: (
    reason?: string,
  ) => Effect.Effect<EffectCodexSchema.V2FeedbackUploadResponse, CodexSessionRuntimeError>;
  readonly respondToRequest: (
    requestId: ApprovalRequestId,
    decision: ProviderApprovalDecision,
  ) => Effect.Effect<void, CodexSessionRuntimeError>;
  readonly respondToUserInput: (
    requestId: ApprovalRequestId,
    answers: ProviderUserInputAnswers,
  ) => Effect.Effect<void, CodexSessionRuntimeError>;
  readonly events: Stream.Stream<ProviderEvent, never>;
  readonly close: Effect.Effect<void>;
}
