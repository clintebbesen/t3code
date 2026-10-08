import * as NodeAssert from "node:assert/strict";
import { it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as TestClock from "effect/testing/TestClock";
import { describe } from "vite-plus/test";
import { buildTurnStartParams } from "./CodexSessionRuntime.ts";
import { makeCapacityRetry } from "./codexCapacityRetry.ts";

const fixture = Effect.gen(function* () {
  const calls: unknown[] = [];
  const retry = yield* makeCapacityRetry({
    client: {
      request: () => Effect.die("unused"),
      raw: {
        request: (_method, params) =>
          Effect.sync(() => {
            calls.push(params);
            return { turn: { id: "retry-turn", status: "inProgress", items: [], error: null } };
          }),
      },
    },
    aliases: new Map(),
    update: () => Effect.void,
    terminal: () => Effect.void,
  });
  const params = yield* buildTurnStartParams({
    threadId: "thread",
    runtimeMode: "full-access",
    prompt: "Original task",
  });
  yield* retry.begin(params);
  return { retry, calls, params };
});

describe("Codex capacity recovery", () => {
  it.effect("waits 30 seconds and schedules only one retry per failed turn", () =>
    Effect.gen(function* () {
      const { retry, calls } = yield* fixture;
      NodeAssert.equal(yield* retry.schedule("selected model is at capacity", false), true);
      NodeAssert.equal(yield* retry.schedule("selected model is at capacity", false), true);
      yield* TestClock.adjust("29 seconds");
      NodeAssert.equal(calls.length, 0);
      yield* TestClock.adjust("1 second");
      NodeAssert.equal(calls.length, 1);
    }),
  );

  for (const cancellation of ["stop", "new-message"] as const) {
    it.effect(`cancels a pending retry on ${cancellation}`, () =>
      Effect.gen(function* () {
        const { retry, calls, params } = yield* fixture;
        yield* retry.schedule("server_is_overloaded", false);
        if (cancellation === "stop") yield* retry.cancel;
        else yield* retry.begin({ ...params, input: [{ type: "text", text: "New task" }] });
        yield* TestClock.adjust("30 seconds");
        NodeAssert.equal(calls.length, 0);
      }),
    );
  }

  it.effect("leaves ordinary disconnects and provider-owned retries alone", () =>
    Effect.gen(function* () {
      const { retry, calls } = yield* fixture;
      NodeAssert.equal(
        yield* retry.schedule("stream disconnected before completion", false),
        false,
      );
      NodeAssert.equal(yield* retry.schedule("server_is_overloaded", true), false);
      yield* TestClock.adjust("30 seconds");
      NodeAssert.equal(calls.length, 0);
    }),
  );

  it.effect("resumes saved work instead of replaying actions or attachments", () =>
    Effect.gen(function* () {
      const { retry, calls } = yield* fixture;
      yield* retry.schedule("server_is_overloaded", false);
      yield* TestClock.adjust("30 seconds");
      const text = (calls[0] as { input: Array<{ text: string }> }).input[0]?.text ?? "";
      NodeAssert.match(text, /Continue the current task/);
      NodeAssert.doesNotMatch(text, /Original task/);
    }),
  );

  it.effect("stops after five recovery attempts", () =>
    Effect.gen(function* () {
      const { retry, calls } = yield* fixture;
      for (let attempt = 0; attempt < 5; attempt++) {
        NodeAssert.equal(yield* retry.schedule("server_is_overloaded", false), true);
        yield* TestClock.adjust("30 seconds");
      }
      NodeAssert.equal(calls.length, 5);
      NodeAssert.equal(yield* retry.schedule("server_is_overloaded", false), false);
    }),
  );
});
