import type { EnvironmentId, ThreadId, ProviderGoal, ProviderGoalAction } from "@t3tools/contracts";
import {
  goalPauseDescription,
  goalStartDescription,
  goalStatusLabel,
} from "@t3tools/client-runtime/state/thread-goal";
import * as Cause from "effect/Cause";
import { useEffect, useRef, useState } from "react";
import { Modal, ScrollView, TextInput, View } from "react-native";
import { AppText } from "../../components/AppText";
import { ControlPill } from "../../components/ControlPill";
import { ErrorBanner } from "../../components/ErrorBanner";
import { threadEnvironment } from "../../state/threads";
import { useAtomCommand } from "../../state/use-atom-command";

export function ThreadGoalControl({
  environmentId,
  threadId,
}: {
  environmentId: EnvironmentId;
  threadId: ThreadId;
}) {
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
  return (
    <>
      <View className="items-end px-3 py-1">
        <ControlPill
          variant="pill"
          label="Goal"
          onPress={() => {
            setOpen(true);
            void run({ action: "read" });
          }}
        />
      </View>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View className="flex-1 justify-center bg-backdrop px-5 py-12">
          <ScrollView
            className="max-h-full rounded-2xl bg-card"
            contentContainerStyle={{ padding: 20, gap: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            <AppText className="text-lg font-t3-medium">Thread goal</AppText>
            <AppText>{goalStartDescription}</AppText>
            {pending && (
              <AppText accessibilityRole="text">
                Reading or updating the native goal. No action is required.
              </AppText>
            )}
            {error && <ErrorBanner message={`Goal request failed at ${checkedAt}.\n${error}`} />}
            {checkedAt && !error && (
              <AppText>
                {goalStatusLabel(goal)}. Last read at {checkedAt}.
              </AppText>
            )}
            {goal && <AppText>{goal.objective}</AppText>}
            {goal && (
              <AppText>
                {goal.tokensUsed.toLocaleString()} tokens used. {goal.timeUsedSeconds} seconds
                active.
              </AppText>
            )}
            {checkedAt && !error && (!goal || goal.status === "complete") && (
              <>
                <AppText>Objective</AppText>
                <TextInput
                  accessibilityLabel="Goal objective"
                  multiline
                  value={objective}
                  onChangeText={setObjective}
                  className="min-h-24 rounded-xl border border-border bg-background p-3 text-foreground"
                />
              </>
            )}
            <AppText className="text-sm text-foreground-secondary">{goalPauseDescription}</AppText>
            <View className="flex-row flex-wrap gap-2">
              <ControlPill
                variant="pill"
                label="Refresh"
                disabled={pending}
                onPress={() => void run({ action: "read" })}
              />
              {checkedAt && !error && (!goal || goal.status === "complete") && (
                <ControlPill
                  variant="primary"
                  label="Start goal"
                  disabled={pending || !objective.trim()}
                  onPress={() => void run({ action: "start", objective: objective.trim() })}
                />
              )}
              {goal?.status === "active" && (
                <ControlPill
                  variant="pill"
                  label="Pause goal"
                  disabled={pending || Boolean(error)}
                  onPress={() => void run({ action: "pause" })}
                />
              )}
              {goal &&
                ["paused", "blocked", "usageLimited", "budgetLimited"].includes(goal.status) && (
                  <ControlPill
                    variant="pill"
                    label="Resume goal"
                    disabled={pending || Boolean(error)}
                    onPress={() => void run({ action: "resume" })}
                  />
                )}
              {goal && (
                <ControlPill
                  variant="pill"
                  label="Clear goal"
                  disabled={pending || Boolean(error)}
                  onPress={() => void run({ action: "clear" })}
                />
              )}
              <ControlPill variant="pill" label="Close" onPress={() => setOpen(false)} />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
