import * as NodeAssert from "node:assert/strict";
import { it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Deferred from "effect/Deferred";
import * as CodexErrors from "effect-codex-app-server/errors";
import * as TestClock from "effect/testing/TestClock";
import { describe } from "vite-plus/test";
import { buildTurnStartParams } from "./CodexSessionRuntime.ts";
import { makeCapacityRetry } from "./codexCapacityRetry.ts";

const makeFixture = (errors: string[] = [], gate?: Deferred.Deferred<unknown>) =>
  Effect.gen(function* () {
    const calls: unknown[] = [];
    const interrupts: unknown[] = [];
    const terminals: unknown[] = [];
    const aliases = new Map<string, string>();
    const retry = yield* makeCapacityRetry({
      client: {
        request: (_method, params) =>
          Effect.sync(() => {
            interrupts.push(params);
            return {};
          }) as never,
        raw: {
          request: (_method, params) =>
            Effect.gen(function* () {
              calls.push(params);
              const error = errors.shift();
              if (error)
                return yield* new CodexErrors.CodexAppServerRequestError({
                  code: -32000,
                  errorMessage: error,
                });
              if (gate) return yield* Deferred.await(gate);
              return { turn: { id: "retry-turn", status: "inProgress", items: [], error: null } };
            }),
        },
      },
      aliases,
      update: () => Effect.void,
      terminal: (turnId, error) =>
        Effect.sync(() => {
          terminals.push({ turnId, error });
        }),
    });
    const params = yield* buildTurnStartParams({
      threadId: "thread",
      runtimeMode: "full-access",
      prompt: "Original task",
    });
    yield* retry.begin(params);
    yield* retry.accept("original-turn");
    return { retry, calls, params, interrupts, terminals, aliases };
  });
const fixture = makeFixture();

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
  it.effect("retries a capacity RPC rejection but settles ordinary RPC failure", () =>
    Effect.gen(function* () {
      const { retry, calls, terminals } = yield* makeFixture([
        "server_is_overloaded",
        "connection reset",
      ]);
      yield* retry.schedule("server_is_overloaded", false);
      yield* TestClock.adjust("30 seconds");
      NodeAssert.equal(calls.length, 1);
      NodeAssert.equal(terminals.length, 0);
      yield* TestClock.adjust("30 seconds");
      NodeAssert.equal(calls.length, 2);
      NodeAssert.deepEqual(terminals, [{ turnId: "original-turn", error: "connection reset" }]);
    }),
  );
  it.effect("interrupts a retry accepted after Stop and preserves its logical turn", () =>
    Effect.gen(function* () {
      const gate = yield* Deferred.make<unknown>();
      const { retry, calls, interrupts, terminals } = yield* makeFixture([], gate);
      yield* retry.schedule("server_is_overloaded", false);
      yield* TestClock.adjust("30 seconds");
      NodeAssert.equal(calls.length, 1);
      yield* retry.cancel;
      yield* Deferred.succeed(gate, {
        turn: { id: "retry-turn", status: "inProgress", items: [], error: null },
      });
      yield* Effect.yieldNow;
      NodeAssert.deepEqual(terminals, [{ turnId: "original-turn", error: undefined }]);
      NodeAssert.deepEqual(interrupts, [{ threadId: "thread", turnId: "retry-turn" }]);
    }),
  );
  it.effect("maps recovery provider turns to the original accepted logical turn", () =>
    Effect.gen(function* () {
      const { retry, aliases } = yield* fixture;
      yield* retry.schedule("server_is_overloaded", false);
      yield* TestClock.adjust("30 seconds");
      NodeAssert.equal(aliases.get("retry-turn"), "original-turn");
    }),
  );
});
