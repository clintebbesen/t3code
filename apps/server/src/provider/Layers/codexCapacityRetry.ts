import {
  type ProviderSession,
  type ProviderEvent,
  type ThreadId,
  TurnId,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";
import * as Ref from "effect/Ref";
import * as Schema from "effect/Schema";
import * as Scope from "effect/Scope";
import type * as CodexErrors from "effect-codex-app-server/errors";
import type * as CodexClient from "effect-codex-app-server/client";
import * as CodexSchema from "effect-codex-app-server/schema";
import type { CodexTurnStartParamsWithCollaborationMode } from "./CodexSessionRuntime.ts";

const decodeTurnStartResponse = Schema.decodeUnknownEffect(CodexSchema.V2TurnStartResponse);
const isCapacityError = (message: string) =>
  /selected model is at capacity|server_is_overloaded|servers are currently overloaded/i.test(
    message,
  );
type Client = CodexClient.CodexAppServerClient["Service"];
type Pending = {
  readonly params: CodexTurnStartParamsWithCollaborationMode;
  readonly token: object;
  readonly logicalTurnId?: string;
  readonly attempt: number;
  readonly waiting: boolean;
  readonly inFlight: boolean;
};

export const makeCapacityRetry = Effect.fn("CodexCapacityRetry.make")(function* (options: {
  readonly client: {
    readonly raw: Pick<Client["raw"], "request">;
    readonly request: Client["request"];
  };
  readonly aliases: Map<string, string>;
  readonly update: (patch: Partial<ProviderSession>) => Effect.Effect<void>;
  readonly terminal: (turnId: string | undefined, error?: string) => Effect.Effect<void>;
}) {
  const scope = yield* Scope.Scope;
  const state = yield* Ref.make<Pending | undefined>(undefined);
  const waiting = Ref.get(state).pipe(Effect.map((pending) => pending?.waiting === true));
  const clear = Ref.set(state, undefined);
  const cancel = Effect.gen(function* () {
    const pending = yield* Ref.getAndSet(state, undefined);
    if (pending && pending.attempt > 0) yield* options.terminal(pending.logicalTurnId);
    return pending?.waiting === true || pending?.inFlight === true;
  });
  const begin = (params: CodexTurnStartParamsWithCollaborationMode) =>
    Effect.gen(function* () {
      yield* cancel;
      options.aliases.clear();
      yield* Ref.set(state, { params, token: {}, attempt: 0, waiting: false, inFlight: false });
    });
  const accept = (turnId: string) =>
    Ref.update(state, (pending) => {
      if (!pending) return undefined;
      const logicalTurnId = pending.logicalTurnId ?? turnId;
      options.aliases.set(turnId, logicalTurnId);
      return { ...pending, logicalTurnId };
    });
  const isCurrent = (pending: Pending) =>
    Ref.get(state).pipe(
      Effect.map(
        (current) => current?.token === pending.token && current.attempt === pending.attempt,
      ),
    );
  const fail = (pending: Pending, message: string) =>
    Effect.gen(function* () {
      if (!(yield* isCurrent(pending))) return;
      yield* clear;
      yield* options.update({ status: "error", activeTurnId: undefined, lastError: message });
      yield* options.terminal(pending.logicalTurnId, message);
    });
  const schedule: (message: string, providerWillRetry: boolean) => Effect.Effect<boolean> = (
    message,
    providerWillRetry,
  ) =>
    Effect.gen(function* () {
      const pending = yield* Ref.get(state);
      if (providerWillRetry || !isCapacityError(message) || !pending) return false;
      if (pending.waiting) return true;
      if (pending.attempt >= 5) return false;
      const params = {
        ...pending.params,
        input: [
          {
            type: "text" as const,
            text: "Continue the current task from where it stopped. Check the saved conversation and completed tool results before taking further actions.",
          },
        ],
      };
      const next = {
        ...pending,
        params,
        attempt: pending.attempt + 1,
        waiting: true,
        inFlight: false,
      };
      yield* Ref.set(state, next);
      yield* options.update({ status: "running", lastError: message });
      yield* Effect.gen(function* () {
        yield* Effect.sleep("30 seconds");
        if (!(yield* isCurrent(next))) return;
        const running = { ...(yield* Ref.get(state))!, waiting: false, inFlight: true };
        yield* Ref.set(state, running);
        const raw = yield* options.client.raw.request("turn/start", params);
        const response = yield* decodeTurnStartResponse(raw);
        if (!(yield* isCurrent(running))) {
          yield* options.client
            .request("turn/interrupt", { threadId: params.threadId, turnId: response.turn.id })
            .pipe(Effect.timeoutOption("5 seconds"), Effect.ignore);
          return;
        }
        yield* accept(response.turn.id);
        yield* Ref.update(state, (current) =>
          current ? { ...current, inFlight: false } : undefined,
        );
        yield* options.update({
          status: "running",
          activeTurnId: TurnId.make(response.turn.id),
          lastError: undefined,
        });
      }).pipe(
        Effect.catch((cause) =>
          Effect.gen(function* () {
            if (!(yield* isCurrent(next))) return;
            yield* Ref.update(state, (current) =>
              current ? { ...current, waiting: false, inFlight: false } : undefined,
            );
            if (yield* schedule(cause.message, false)) return;
            yield* fail(next, cause.message);
          }),
        ),
        Effect.forkIn(scope),
      );
      return true;
    });
  return { begin, cancel, clear, waiting, accept, schedule };
});

export const registerCodexLifecycle = Effect.fn("CodexCapacityRetry.registerLifecycle")(function* (
  client: Pick<Client, "handleServerNotification">,
  currentThreadId: Effect.Effect<string | undefined>,
  update: (patch: Partial<ProviderSession>) => Effect.Effect<void>,
  retry: Effect.Success<ReturnType<typeof makeCapacityRetry>>,
) {
  yield* client.handleServerNotification("turn/started", (payload) =>
    Effect.gen(function* () {
      const id = yield* currentThreadId;
      if (id && payload.threadId !== id) return;
      yield* retry.accept(payload.turn.id);
      yield* update({ status: "running", activeTurnId: TurnId.make(payload.turn.id) });
    }),
  );
  yield* client.handleServerNotification("turn/completed", (payload) =>
    Effect.gen(function* () {
      const id = yield* currentThreadId;
      if (id && payload.threadId !== id) return;
      if (payload.turn.status === "failed" && (yield* retry.waiting)) return;
      const lastError =
        payload.turn.status === "failed" && payload.turn.error
          ? payload.turn.error.message
          : undefined;
      yield* retry.clear;
      yield* update({
        status: payload.turn.status === "failed" ? "error" : "ready",
        activeTurnId: undefined,
        ...(lastError ? { lastError } : {}),
      });
    }),
  );
  yield* client.handleServerNotification("error", (payload) =>
    Effect.gen(function* () {
      const id = yield* currentThreadId;
      if (id && payload.threadId && payload.threadId !== id) return;
      const retrying = yield* retry.schedule(payload.error.message, payload.willRetry);
      yield* update({
        status: payload.willRetry || retrying ? "running" : "error",
        lastError: payload.error.message,
      });
    }),
  );
});

export const makeTerminalEmitter =
  (
    emit: (
      event: Omit<ProviderEvent, "id" | "provider" | "createdAt">,
    ) => Effect.Effect<void, CodexErrors.CodexAppServerIdentifierGenerationError>,
    threadId: ThreadId,
  ) =>
  (turnId: string | undefined, error?: string) =>
    Effect.gen(function* () {
      const turn = turnId ? { turnId: TurnId.make(turnId) } : {};
      if (error)
        yield* emit({
          kind: "error",
          threadId,
          method: "capacity/retryFailed",
          message: error,
          ...turn,
        });
      yield* emit({
        kind: "notification",
        threadId,
        method: "turn/aborted",
        message: error ?? "Stopped automatic capacity recovery",
        ...turn,
      });
    }).pipe(
      Effect.catch((cause) =>
        Effect.logError("Could not emit capacity recovery terminal event", { cause }),
      ),
    );
