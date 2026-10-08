// @effect-diagnostics nodeBuiltinImport:off
import * as NodeFS from "node:fs";
import * as NodeOS from "node:os";
import * as NodePath from "node:path";
import * as NodeAssert from "node:assert/strict";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { it } from "@effect/vitest";
import { ThreadId, type ProviderEvent } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Deferred from "effect/Deferred";
import * as Stream from "effect/Stream";
import * as TestClock from "effect/testing/TestClock";
import { describe } from "vite-plus/test";
import { makeCodexSessionRuntime } from "./CodexSessionRuntime.ts";

import wireFixture from "../testFixtures/codexMultiAgentWire.json" with { type: "json" };
const ROOT = wireFixture.rootThreadId;
const FIRST = "capacity-original";
const scriptPath = NodePath.join(import.meta.dirname, "../testFixtures/.capacity-script.json");
const peerPath = NodePath.join(import.meta.dirname, "../testFixtures/codexCollabMockPeer.sh");
const setup = Effect.gen(function* () {
  const error = {
    message: "selected model is at capacity",
    codexErrorInfo: null,
    additionalDetails: null,
  };
  const script = {
    rootThreadId: ROOT,
    turnIds: [FIRST, "capacity-recovery"],
    holdTurns: [true, false],
    notifications: [],
    notificationsByTurn: [
      [
        { method: "error", params: { threadId: ROOT, turnId: FIRST, error, willRetry: false } },
        {
          method: "turn/completed",
          params: { threadId: ROOT, turn: { id: FIRST, status: "failed", items: [], error } },
        },
      ],
      [],
    ],
  };
  // @effect-diagnostics-next-line preferSchemaOverJson:off
  NodeFS.writeFileSync(scriptPath, JSON.stringify(script));
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      NodeFS.rmSync(scriptPath, { force: true });
      NodeFS.rmSync(`${scriptPath}.interrupts`, { force: true });
    }),
  );
  const runtime = yield* makeCodexSessionRuntime({
    threadId: ThreadId.make("capacity-test"),
    binaryPath: peerPath,
    cwd: NodeOS.tmpdir(),
    runtimeMode: "full-access",
    environment: { ...process.env, T3_CODEX_COLLAB_SCRIPT: scriptPath },
  });
  const warning = yield* Deferred.make<ProviderEvent>();
  const finished = yield* Deferred.make<ProviderEvent>();
  yield* runtime.events.pipe(
    Stream.runForEach((event) =>
      Effect.gen(function* () {
        if (event.method === "error") yield* Deferred.succeed(warning, event);
        if (event.method === "turn/completed" || event.method === "turn/aborted")
          yield* Deferred.succeed(finished, event);
      }),
    ),
    Effect.forkScoped,
  );
  yield* runtime.start();
  yield* runtime.sendTurn({ input: "Perform one task" });
  const event = yield* Deferred.await(warning);
  NodeAssert.equal((event.payload as { willRetry: boolean }).willRetry, true);
  return { runtime, finished };
});

describe("Capacity recovery through the real app-server transport", () => {
  it.effect("recovery completion retains the active logical turn under ingestion guards", () =>
    Effect.gen(function* () {
      const { runtime, finished } = yield* setup;
      yield* TestClock.adjust("30 seconds");
      const event = yield* Deferred.await(finished);
      NodeAssert.equal(event?.method, "turn/completed");
      NodeAssert.equal(event?.turnId, FIRST);
      NodeAssert.equal(
        (event?.payload as { turn: { id: string; status: string } }).turn.id,
        "capacity-recovery",
      );
      NodeAssert.equal((yield* runtime.getSession).status, "ready");
      yield* runtime.close;
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );
  it.effect("Stop while waiting emits a terminal event for the active logical turn", () =>
    Effect.gen(function* () {
      const { runtime, finished } = yield* setup;
      yield* runtime.interruptTurn();
      const event = yield* Deferred.await(finished);
      NodeAssert.equal(event?.method, "turn/aborted");
      NodeAssert.equal(event?.turnId, FIRST);
      yield* runtime.close;
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );
});
