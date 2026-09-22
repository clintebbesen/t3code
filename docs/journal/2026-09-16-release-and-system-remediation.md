# Release and system remediation continuation

## User request

> Okay, I need you to merge those MRs and release them to production, and then what about everything else? You've only done part of the work, haven't you?

## Outcome

Work is continuing. The named DevBoard and agent-harness merge requests were already merged and the DevBoard revision was deployed. The remaining work is to trace the live release callers, measure each release phase, and repair the shared bottlenecks without creating a second release coordinator or workflow writer.

## Additional request

> Okay, I need you to merge those MRs and release them to production, and then what about everything else? You've only done part of the work, haven't you?

## Finding

The project-level Codex configuration enabled the optional Xcode MCP server for every provider session. That server is unrelated to this web project and can delay or distort opposing-family review tool discovery. The setting is now disabled locally; Xcode remains available through an explicit project that enables it.

## Continuation request

> Do not stop. Continue that goal until it is finished.

## Worktree recovery finding

The live QFLP checkout had a valid `.git` directory configured with `core.bare=true`. T3 therefore classified it as an unknown VCS and repeatedly failed pull request settlement. The metadata now has `core.bare=false` and an explicit worktree path. After the T3 service restart, no new `VcsUnsupportedOperationError` appeared.
