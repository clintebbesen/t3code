import * as NodeURL from "node:url";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as NodeServices from "@effect/platform-node/NodeServices";
import { assert, it } from "@effect/vitest";
import { describe } from "vite-plus/test";
import { ThreadId } from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Stream from "effect/Stream";
import * as Schema from "effect/Schema";
import { makeCodexSessionRuntime } from "./CodexSessionRuntime.ts";

const decodeResumeCursor = Schema.decodeUnknownSync(Schema.Struct({ threadId: Schema.String }));
const peerPath = NodeURL.fileURLToPath(
  new URL("../testFixtures/codexCollabMockPeer.sh", import.meta.url),
);
const encodeScript = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown));
const decodeRequest = Schema.decodeUnknownSync(
  Schema.fromJsonString(
    Schema.Struct({
      method: Schema.String,
      params: Schema.Struct({
        threadId: Schema.String,
        tokenBudget: Schema.optionalKey(Schema.Number),
        objective: Schema.optionalKey(Schema.String),
      }),
    }),
  ),
);
const setup = (goalError?: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const cwd = yield* fs.makeTempDirectoryScoped({ prefix: "t3-goal-control-" });
    const scriptPath = path.join(cwd, "script.json");
    yield* fs.writeFileString(
      scriptPath,
      encodeScript({
        notifications: [],
        goalStatePath: path.join(cwd, "goal.json"),
        ...(goalError ? { goalError } : {}),
      }),
    );
    return { cwd, scriptPath, fs };
  });
const requests = (path: string) =>
  Effect.gen(function* () {
    const fs = yield* FileSystem.FileSystem;
    const content = yield* fs.readFileString(`${path}.requests`);
    return content
      .trim()
      .split("\n")
      .map((line) => decodeRequest(line));
  });

describe("Codex native goal controls through the session runtime", () => {
  it.effect(
    "uses native thread identity, preserves the objective, and resumes persisted state",
    () =>
      Effect.gen(function* () {
        const { cwd, scriptPath, fs } = yield* setup();
        const options = {
          threadId: ThreadId.make("t3-canonical-goal-thread"),
          binaryPath: peerPath,
          cwd,
          runtimeMode: "full-access" as const,
          environment: { ...process.env, T3_CODEX_COLLAB_SCRIPT: scriptPath },
        };
        const session = yield* Effect.scoped(
          Effect.gen(function* () {
            const runtime = yield* makeCodexSessionRuntime(options);
            const session = yield* runtime.start();
            assert.isFalse(yield* fs.exists(`${scriptPath}.requests`));
            if (!runtime.controlGoal) return yield* Effect.die("Goal runtime is missing");
            assert.deepEqual(yield* runtime.controlGoal({ action: "read" }), { goal: null });
            const turnStarted = yield* runtime.events.pipe(
              Stream.filter((event) => event.method === "turn/started"),
              Stream.take(1),
              Stream.runCollect,
              Effect.forkScoped,
            );
            const started = yield* runtime.controlGoal({
              action: "start",
              objective: "Finish the isolated test",
            });
            assert.equal(started.goal?.status, "active");
            assert.equal(Array.from(yield* Fiber.join(turnStarted)).length, 1);
            yield* runtime.interruptTurn();
            const paused = yield* runtime.controlGoal({ action: "read" });
            assert.equal(paused.goal?.status, "paused");
            assert.equal(paused.goal?.objective, "Finish the isolated test");
            return session;
          }),
        );
        const resumed = yield* makeCodexSessionRuntime({
          ...options,
          resumeCursor: decodeResumeCursor(session.resumeCursor),
        });
        yield* resumed.start();
        if (!resumed.controlGoal) return yield* Effect.die("Goal runtime is missing after restart");
        assert.equal((yield* resumed.controlGoal({ action: "read" })).goal?.status, "paused");
        assert.equal((yield* resumed.controlGoal({ action: "resume" })).goal?.status, "active");
        assert.deepEqual(yield* resumed.controlGoal({ action: "clear" }), { goal: null });
        assert.deepEqual(yield* resumed.controlGoal({ action: "read" }), { goal: null });
        const recorded = yield* requests(scriptPath);
        assert.isTrue(recorded.every((request) => request.params.threadId !== options.threadId));
        assert.isTrue(recorded.every((request) => request.params.tokenBudget === undefined));
        assert.equal(
          recorded.filter(
            (request) => request.method === "thread/goal/set" && request.params.objective,
          ).length,
          1,
        );
      }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );

  it.effect("returns unsupported-runtime failures once without starting another turn", () =>
    Effect.gen(function* () {
      const { cwd, scriptPath } = yield* setup("Native goal methods are unavailable");
      const runtime = yield* makeCodexSessionRuntime({
        threadId: ThreadId.make("t3-goal-unsupported"),
        binaryPath: peerPath,
        cwd,
        runtimeMode: "full-access",
        environment: { ...process.env, T3_CODEX_COLLAB_SCRIPT: scriptPath },
      });
      yield* runtime.start();
      if (!runtime.controlGoal) return yield* Effect.die("Goal runtime is missing");
      const error = yield* runtime.controlGoal({ action: "read" }).pipe(Effect.flip);
      assert.include(error.message, "Native goal methods are unavailable");
      assert.equal((yield* requests(scriptPath)).length, 1);
    }).pipe(Effect.scoped, Effect.provide(NodeServices.layer)),
  );
});
