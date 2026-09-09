import { decodeInputOrValidationError, toValidationError } from "./ProviderControlValidation.ts";
import { ProviderGoalInput, ProviderUploadFeedbackInput, type ThreadId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import { type ProviderServiceError, type ProviderAdapterError } from "../Errors.ts";
import type { ProviderServiceShape } from "../Services/ProviderService.ts";
import type { ProviderAdapterShape } from "../Services/ProviderAdapter.ts";

interface RoutedSession {
  adapter: ProviderAdapterShape<ProviderAdapterError>;
  threadId: ThreadId;
  isActive: boolean;
}
export function makeProviderSessionControls(
  resolveRoutableSession: (input: {
    threadId: ThreadId;
    operation: string;
    allowRecovery: boolean;
  }) => Effect.Effect<RoutedSession, ProviderServiceError>,
) {
  const uploadFeedback: ProviderServiceShape["uploadFeedback"] = Effect.fn("uploadFeedback")(
    function* (rawInput) {
      const input = yield* decodeInputOrValidationError({
        operation: "ProviderService.uploadFeedback",
        schema: ProviderUploadFeedbackInput,
        payload: rawInput,
      });
      let routed = yield* resolveRoutableSession({
        threadId: input.threadId,
        operation: "ProviderService.uploadFeedback",
        allowRecovery: false,
      });
      if (routed.adapter.uploadFeedback === undefined) {
        return yield* toValidationError(
          "ProviderService.uploadFeedback",
          `Provider '${routed.adapter.provider}' does not support feedback uploads.`,
        );
      }
      if (!routed.isActive) {
        routed = yield* resolveRoutableSession({
          threadId: input.threadId,
          operation: "ProviderService.uploadFeedback",
          allowRecovery: true,
        });
      }
      const uploadFeedback = routed.adapter.uploadFeedback;
      if (uploadFeedback === undefined) {
        return yield* toValidationError(
          "ProviderService.uploadFeedback",
          `Provider '${routed.adapter.provider}' does not support feedback uploads.`,
        );
      }
      yield* Effect.annotateCurrentSpan({
        "provider.operation": "upload-feedback",
        "provider.kind": routed.adapter.provider,
        "provider.thread_id": input.threadId,
      });
      return yield* uploadFeedback(input);
    },
  );

  const controlGoal: NonNullable<ProviderServiceShape["controlGoal"]> = Effect.fn(
    "ProviderService.controlGoal",
  )(function* (rawInput) {
    const input = yield* decodeInputOrValidationError({
      operation: "ProviderService.controlGoal",
      schema: ProviderGoalInput,
      payload: rawInput,
    });
    let routed = yield* resolveRoutableSession({
      threadId: input.threadId,
      operation: "ProviderService.controlGoal",
      allowRecovery: false,
    });
    if (!routed.adapter.controlGoal)
      return yield* toValidationError(
        "ProviderService.controlGoal",
        `Provider '${routed.adapter.provider}' does not support native goals.`,
      );
    if (!routed.isActive)
      routed = yield* resolveRoutableSession({
        threadId: input.threadId,
        operation: "ProviderService.controlGoal",
        allowRecovery: true,
      });
    if (!routed.adapter.controlGoal)
      return yield* toValidationError(
        "ProviderService.controlGoal",
        "The resumed provider does not support native goals.",
      );
    return yield* routed.adapter.controlGoal(input);
  });
  return { uploadFeedback, controlGoal };
}
