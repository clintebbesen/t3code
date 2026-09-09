import { ProviderDriverKind, type ThreadId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import {
  ProviderAdapterValidationError,
  type ProviderAdapterError,
  type ProviderAdapterSessionNotFoundError,
} from "../Errors.ts";
import type { CodexAdapterShape } from "../Services/CodexAdapter.ts";
import type { CodexSessionRuntimeError, CodexSessionRuntimeShape } from "./CodexSessionRuntime.ts";

const PROVIDER = ProviderDriverKind.make("codex");
export function makeCodexSessionControls(
  requireSession: (
    threadId: ThreadId,
  ) => Effect.Effect<{ runtime: CodexSessionRuntimeShape }, ProviderAdapterSessionNotFoundError>,
  mapCodexRuntimeError: (
    threadId: ThreadId,
    method: string,
    error: CodexSessionRuntimeError,
  ) => ProviderAdapterError,
) {
  const readThread: CodexAdapterShape["readThread"] = (threadId) =>
    requireSession(threadId).pipe(
      Effect.flatMap((session) => session.runtime.readThread),
      Effect.mapError((cause) =>
        cause._tag === "ProviderAdapterSessionNotFoundError"
          ? cause
          : mapCodexRuntimeError(threadId, "thread/read", cause),
      ),
      Effect.map((snapshot) => ({
        threadId,
        turns: snapshot.turns,
      })),
    );

  const rollbackThread: CodexAdapterShape["rollbackThread"] = (threadId, numTurns) => {
    if (!Number.isInteger(numTurns) || numTurns < 1) {
      return Effect.fail(
        new ProviderAdapterValidationError({
          provider: PROVIDER,
          operation: "rollbackThread",
          issue: "numTurns must be an integer >= 1.",
        }),
      );
    }

    return requireSession(threadId).pipe(
      Effect.flatMap((session) => session.runtime.rollbackThread(numTurns)),
      Effect.mapError((cause) =>
        cause._tag === "ProviderAdapterSessionNotFoundError"
          ? cause
          : mapCodexRuntimeError(threadId, "thread/rollback", cause),
      ),
      Effect.map((snapshot) => ({
        threadId,
        turns: snapshot.turns,
      })),
    );
  };

  const uploadFeedback: CodexAdapterShape["uploadFeedback"] = (input) =>
    requireSession(input.threadId).pipe(
      Effect.flatMap((session) => session.runtime.uploadFeedback(input.reason)),
      Effect.map(({ threadId }) => ({ feedbackId: threadId })),
      Effect.mapError((cause) =>
        cause._tag === "ProviderAdapterSessionNotFoundError"
          ? cause
          : mapCodexRuntimeError(input.threadId, "feedback/upload", cause),
      ),
    );

  const controlGoal: NonNullable<CodexAdapterShape["controlGoal"]> = (input) =>
    Effect.gen(function* () {
      const session = yield* requireSession(input.threadId);
      if (!session.runtime.controlGoal)
        return yield* new ProviderAdapterValidationError({
          provider: PROVIDER,
          operation: "controlGoal",
          issue: "This runtime does not support native goals.",
        });
      return yield* session.runtime
        .controlGoal(input.operation)
        .pipe(
          Effect.mapError((cause) => mapCodexRuntimeError(input.threadId, "thread/goal", cause)),
        );
    });
  return { readThread, rollbackThread, uploadFeedback, controlGoal };
}
