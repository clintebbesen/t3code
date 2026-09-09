import * as Option from "effect/Option";
import { CodexAppServerRequestError } from "effect-codex-app-server/errors";
import type { ProviderGoalAction, ProviderGoalResult } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import type { CodexAppServerClient } from "effect-codex-app-server/client";

/** Native Codex owns persistence, continuation, pause, and clearing. */
export function makeCodexGoalControl<E>(
  client: Pick<CodexAppServerClient["Service"], "request">,
  readThreadId: Effect.Effect<string, E>,
) {
  return Effect.fn("CodexGoalRuntime.control")(function* (operation: ProviderGoalAction) {
    const threadId = yield* readThreadId;
    if (operation.action === "clear") {
      yield* client.request("thread/goal/clear", { threadId });
      return { goal: null } satisfies ProviderGoalResult;
    }
    if (operation.action === "read") {
      const result = yield* client.request("thread/goal/get", { threadId });
      return { goal: result.goal ?? null } satisfies ProviderGoalResult;
    }
    const result = yield* client.request("thread/goal/set", {
      threadId,
      ...(operation.action === "start"
        ? { objective: operation.objective, status: "active" as const }
        : { status: operation.action === "pause" ? ("paused" as const) : ("active" as const) }),
    });
    return { goal: result.goal } satisfies ProviderGoalResult;
  });
}

// Stop must pause continuation even between turns. Older runtimes lack this optional API.
export function pauseCodexGoalForStop<E>(
  client: Pick<CodexAppServerClient["Service"], "request">,
  readThreadId: Effect.Effect<string, E>,
) {
  return Effect.gen(function* () {
    const threadId = yield* readThreadId;
    const result = yield* client
      .request("thread/goal/get", { threadId })
      .pipe(
        Effect.catchTag("CodexAppServerRequestError", (error) =>
          error.code === -32601 ? Effect.succeed({ goal: null }) : Effect.fail(error),
        ),
      );
    if (result.goal?.status === "active") {
      yield* client.request("thread/goal/set", { threadId, status: "paused" });
    }
  }).pipe(
    Effect.timeoutOption("3 seconds"),
    Effect.flatMap((result) =>
      Option.isSome(result)
        ? Effect.void
        : Effect.fail(
            CodexAppServerRequestError.internalError(
              "Native goal pause timed out. The current turn will still be interrupted.",
            ),
          ),
    ),
  );
}
