import type { EnvironmentId, ThreadId, ProviderGoal, ProviderGoalAction } from "@t3tools/contracts";
import {
  goalPauseDescription,
  goalStartDescription,
  goalStatusLabel,
} from "@t3tools/client-runtime/state/thread-goal";
import * as Cause from "effect/Cause";
import * as Option from "effect/Option";
import { useEffect, useRef, useState } from "react";
import { threadEnvironment, useEnvironmentThread } from "../../state/threads";
import { useAtomCommand } from "../../state/use-atom-command";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogPopup,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogPanel,
} from "../ui/dialog";
import { Textarea } from "../ui/textarea";

export function ThreadGoalControl({
  environmentId,
  threadId,
}: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
}) {
  const thread = useEnvironmentThread(environmentId, threadId);
  const control = useAtomCommand(threadEnvironment.controlGoal, { reportFailure: false });
  const [open, setOpen] = useState(false);
  const [goal, setGoal] = useState<ProviderGoal | null>(null);
  const [objective, setObjective] = useState("");
  const [pending, setPending] = useState(false);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  async function run(operation: ProviderGoalAction) {
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await control({ environmentId, input: { threadId, operation } });
      if (!alive.current) return;
      setCheckedAt(new Date().toLocaleTimeString());
      if (result._tag === "Success") setGoal(result.value.goal);
      else setError(Cause.pretty(result.cause));
    } finally {
      inFlight.current = false;
      if (alive.current) setPending(false);
    }
  }
  if (Option.getOrNull(thread.data)?.session?.providerName !== "codex") return null;
  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpen(true);
          void run({ action: "read" });
        }}
      >
        Goal
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogPopup className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Thread goal</DialogTitle>
            <DialogDescription>{goalStartDescription}</DialogDescription>
          </DialogHeader>
          <DialogPanel className="space-y-3">
            {pending && (
              <p role="status">Reading or updating the native goal. No action is required.</p>
            )}
            {error && (
              <div role="alert">
                <p>Goal request failed at {checkedAt}.</p>
                <details open>
                  <summary>Technical details</summary>
                  <pre className="whitespace-pre-wrap break-words text-xs">{error}</pre>
                </details>
              </div>
            )}
            {checkedAt && !error && (
              <p>
                {goalStatusLabel(goal)}. Last read at {checkedAt}.
              </p>
            )}
            {goal && <p className="whitespace-pre-wrap">{goal.objective}</p>}
            {goal && (
              <p>
                {goal.tokensUsed.toLocaleString()} tokens used. {goal.timeUsedSeconds} seconds
                active.
              </p>
            )}
            {checkedAt && !error && (!goal || goal.status === "complete") && (
              <label className="grid gap-2">
                Objective
                <Textarea
                  value={objective}
                  onChange={(event) => setObjective(event.target.value)}
                />
              </label>
            )}
            <p className="text-sm text-muted-foreground">{goalPauseDescription}</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                disabled={pending}
                onClick={() => void run({ action: "read" })}
              >
                Refresh
              </Button>
              {checkedAt && !error && (!goal || goal.status === "complete") && (
                <Button
                  disabled={pending || !objective.trim()}
                  onClick={() => void run({ action: "start", objective: objective.trim() })}
                >
                  Start goal
                </Button>
              )}
              {goal?.status === "active" && (
                <Button
                  disabled={pending || Boolean(error)}
                  onClick={() => void run({ action: "pause" })}
                >
                  Pause goal
                </Button>
              )}
              {goal &&
                ["paused", "blocked", "usageLimited", "budgetLimited"].includes(goal.status) && (
                  <Button
                    disabled={pending || Boolean(error)}
                    onClick={() => void run({ action: "resume" })}
                  >
                    Resume goal
                  </Button>
                )}
              {goal && (
                <Button
                  variant="outline"
                  disabled={pending || Boolean(error)}
                  onClick={() => void run({ action: "clear" })}
                >
                  Clear goal
                </Button>
              )}
            </div>
          </DialogPanel>
        </DialogPopup>
      </Dialog>
    </>
  );
}
