# Native Codex goal controls

## User request, verbatim

Yes, merge and deploy to production, then continue with all of the other remaining fixes.

## Source and runtime

This branch starts at upstream v0.0.38, c0995d2eaf8ec787b3318ed1169ae266ed1529f8.
The user fork main is 441 commits behind this base. A merge against that main would include the upstream upgrade.
The source tag uses package version 0.0.37 before release stamping. No active service or live T3 database changed.

Codex 0.153.4 accepted native goal get/set/clear in an isolated thread.
A paused goal survived process replacement. Native notifications included updated and cleared state.
An actual Astra task completed three turns in 65 seconds with zero rescue prompts and 13,092 tokens.
The task wrote two ordered files, verified both, and marked the goal complete.
This proves native continuation for that controlled task. It does not prove general reliability or T3 interface acceptance.
The evaluation's cleanup flag is false. Do not claim every cleanup RPC succeeded.

## Implemented behavior

Typed goal controls use the existing provider service, authorized WebSocket RPC, and client commands.
Codex owns persistence and continuation. Start requires an explicit objective. No timer sends continuation prompts.
Web and desktop expose Goal in the thread header. Mobile exposes it above the thread.
The panel supports Start, Pause, Resume, Clear, and Refresh. It displays native status, usage, and last read time.
Each error remains visible at the failed control. Unsupported providers cannot recover a session through this operation.
The interface does not subscribe to native goal notifications. Budget editing is not implemented.
Stop pauses an active native goal even between turns. It interrupts the current turn after a pause failure and reports that failure.
Only method-not-found errors identify unsupported older native runtimes. Other pause failures remain errors.
Explicit session stop pauses continuation. Runtime shutdown preserves restart recovery.

## Verification and delivery

Focused lifecycle checks passed. The final Stop integration passed 46 tests across CodexGoalRuntime, CodexAdapter, and CodexCollabRuntime.integration.
Provider routing tests passed, including unsupported-provider refusal, recovery binding, and empty objective validation.
Server, web, mobile, contracts, and client-runtime typechecks passed. Targeted lint passed with one pre-existing unused import warning in ws.ts.
Rendered web/mobile acceptance, packaged application acceptance, CI, merge, and deployment remain unfinished.
No PR exists. The project requires an explicit PR request. Browser testing permission is pending under its AGENTS.md.

## Packaging and push correction

The combined web and CLI build passed. Packaged runtime acceptance remains unfinished.
The real push failed because the shared hook ran ESLint against T3's Vite+ configuration.
The new project-owned prepush command uses Vite+ lint, changed-package typechecks, and changed test files.
It receives the actual pushed base from the shared hook. It does not repeat the full repository suite.
The task runs the repository formatter and the shared policy hooks. Neither hook is skipped.
