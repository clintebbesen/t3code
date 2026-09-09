import { assert, it } from "@effect/vitest";
import { describe } from "vite-plus/test";
import { ProviderDriverKind, ThreadId, WS_METHODS } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import { makeProviderSessionControls } from "./ProviderSessionControls.ts";
import type { ProviderAdapterShape } from "../Services/ProviderAdapter.ts";
import type { ProviderAdapterError } from "../Errors.ts";
import { requiredScopeForRpcMethod } from "../../auth/RpcAuthorization.ts";

const threadId = ThreadId.make("goal-routing-thread");
function adapter(
  controlGoal?: ProviderAdapterShape<ProviderAdapterError>["controlGoal"],
): ProviderAdapterShape<ProviderAdapterError> {
  const unexpected = () => Effect.die("Unexpected provider operation");
  return {
    provider: ProviderDriverKind.make(controlGoal ? "codex" : "claude"),
    capabilities: { sessionModelSwitch: "in-session" },
    ...(controlGoal ? { controlGoal } : {}),
    startSession: unexpected,
    sendTurn: unexpected,
    interruptTurn: unexpected,
    respondToRequest: unexpected,
    respondToUserInput: unexpected,
    stopSession: unexpected,
    listSessions: unexpected,
    hasSession: unexpected,
    stopAll: unexpected,
    readThread: unexpected,
    rollbackThread: unexpected,
    streamEvents: Stream.empty,
  };
}

describe("Native goal routing", () => {
  it.effect("refuses unsupported providers without recovering or starting a session", () =>
    Effect.gen(function* () {
      const calls: boolean[] = [];
      const service = makeProviderSessionControls((request) => {
        calls.push(request.allowRecovery);
        return Effect.succeed({ threadId, adapter: adapter(), isActive: false });
      });
      const error = yield* service
        .controlGoal({ threadId, operation: { action: "read" } })
        .pipe(Effect.flip);
      assert.include(error.message, "does not support native goals");
      assert.deepEqual(calls, [false]);
    }),
  );
  it.effect("recovers the bound runtime and calls only its native control", () =>
    Effect.gen(function* () {
      const calls: string[] = [];
      const original = adapter(() => Effect.die("Stale adapter must not receive the operation"));
      const recovered = adapter((input) =>
        Effect.sync(() => {
          calls.push(input.operation.action);
          assert.equal(input.threadId, threadId);
          return { goal: null };
        }),
      );
      const service = makeProviderSessionControls((request) => {
        calls.push(request.allowRecovery ? "recover" : "resolve");
        return Effect.succeed({
          threadId,
          adapter: request.allowRecovery ? recovered : original,
          isActive: request.allowRecovery,
        });
      });
      assert.deepEqual(yield* service.controlGoal({ threadId, operation: { action: "clear" } }), {
        goal: null,
      });
      assert.deepEqual(calls, ["resolve", "recover", "clear"]);
    }),
  );
  it.effect("rejects an empty objective before runtime recovery", () =>
    Effect.gen(function* () {
      const service = makeProviderSessionControls(() =>
        Effect.die("Invalid input reached session recovery"),
      );
      const error = yield* service
        .controlGoal({ threadId, operation: { action: "start", objective: " " } })
        .pipe(Effect.flip);
      assert.equal(error._tag, "ProviderValidationError");
    }),
  );
  it("requires the existing orchestration operate scope for every goal operation", () => {
    assert.equal(
      requiredScopeForRpcMethod(WS_METHODS.providerControlGoal),
      requiredScopeForRpcMethod(WS_METHODS.providerUploadFeedback),
    );
  });
});
