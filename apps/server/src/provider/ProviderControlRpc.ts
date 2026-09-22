import {
  WS_METHODS,
  ProviderGoalError,
  ProviderUploadFeedbackError,
  type ProviderGoalInput,
  type ProviderUploadFeedbackInput,
  type EnvironmentAuthorizationError,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import type { ProviderServiceShape } from "./Services/ProviderService.ts";

type Observe = <A, E, R>(
  method: string,
  effect: Effect.Effect<A, E, R>,
  attributes?: Readonly<Record<string, unknown>>,
) => Effect.Effect<A, E | EnvironmentAuthorizationError, R>;
export function providerControlRpcHandlers(provider: ProviderServiceShape, observe: Observe) {
  return {
    [WS_METHODS.providerControlGoal]: (input: ProviderGoalInput) =>
      observe(
        WS_METHODS.providerControlGoal,
        Effect.gen(function* () {
          if (!provider.controlGoal)
            return yield* new ProviderGoalError({
              threadId: input.threadId,
              cause: new Error("This server does not support native goal controls."),
            });
          return yield* provider.controlGoal(input);
        }).pipe(
          Effect.mapError((cause) => new ProviderGoalError({ threadId: input.threadId, cause })),
        ),
        { "rpc.aggregate": "provider" },
      ),
    [WS_METHODS.providerUploadFeedback]: (input: ProviderUploadFeedbackInput) =>
      observe(
        WS_METHODS.providerUploadFeedback,
        provider
          .uploadFeedback(input)
          .pipe(
            Effect.mapError(
              (cause) => new ProviderUploadFeedbackError({ threadId: input.threadId, cause }),
            ),
          ),
        { "rpc.aggregate": "provider" },
      ),
  };
}
