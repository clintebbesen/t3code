# Thread goals

Codex can continue an explicit goal after an ordinary turn ends. The model still decides whether the work is complete.

Open **Goal** in an existing thread. Enter the objective, then select **Start goal**. T3 does not create goals from ordinary messages.

**Pause goal** stops automatic continuation after the current turn. Use the existing **Stop** control to interrupt that turn.
**Resume goal** activates the saved objective. **Clear goal** removes it without cancelling the current turn.

The panel shows the native status and usage from its last read. Select **Refresh** to read the latest state.
A usage limit, token budget limit, or blocked status means the work remains unfinished. Review the conversation before resuming.
Goal state remains with the Codex thread across reconnection and server restart.

These controls require a Codex runtime with native goal support. Other providers and older runtimes return an inspectable error.
Web and desktop use the thread header. Mobile shows the Goal control above the thread.
