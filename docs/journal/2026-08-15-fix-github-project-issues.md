# Fix GitHub project issues

Inventory every open work item attached to the repository's GitHub project, fix each actionable issue on an isolated branch, and open one verified pull request per issue.

## Metadata

- **Started:** 2026-08-15 · **Status:** active
- **Branch(es):** chore/triage-github-project-issues plus one issue branch per fix · **Worktree:** /home/t3code/.t3/worktrees/CE-T3Code/t3code-d0130990
- **MR link(s):** [#7068](https://github.com/pingdotgg/t3code/pull/7068), [#7069](https://github.com/pingdotgg/t3code/pull/7069), [#7071](https://github.com/pingdotgg/t3code/pull/7071)
- **Task class:** audit-scale

## Requirements (verbatim)

> "I need you to look at the work items, all the issues on this GitHub project, and then create fixes for them and create MRs for those fixes for each issue."

## Checklist (= definition of 100% done)

- [x] Inventory the repository's GitHub Projects and all open issue work items, including status, ownership, linked branches, and linked pull requests.
- [x] Classify every item as actionable, already owned/delivered, duplicate, invalid, or blocked, with evidence recorded here.
- [x] For each actionable issue, reproduce or otherwise establish the requested behavior and trace the owning code path before editing.
- [x] Implement one scoped fix and proportionate regression evidence per actionable issue, on a branch based on the latest upstream `main`.
- [ ] Run focused project checks, `done-check`, and a fresh review for every candidate; obtain rendered UI evidence only with the user's explicit permission if a fix changes UI.
- [x] Commit, push, and open one GitHub pull request per fixed issue, explicitly targeting `main`; verify each PR's source, target, issue link, and checks on the exact head SHA.
- [x] Record every PR URL, verification result, skipped check, blocker, and remaining work item before reporting.

## Assumptions

- “MR” means the GitHub repository's equivalent pull request because `origin` is `https://github.com/clintebbesen/t3code`.
- “All the issues on this GitHub project” means every open issue item attached to a GitHub Project associated with this repository, plus any open repository issue omitted from that board; closed issues are inventory context rather than new fix scope.
- One concern per PR applies even when multiple issues touch the same product area.

## Success Measures

- The inventory count reconciles GitHub Project issue items against the repository's open-issue list with no unexplained omissions.
- Every actionable issue has a focused regression proof and a GitHub PR whose API metadata targets `main` and links the issue.
- Every PR head has a terminal green check result, or the exact external blocker is recorded without overstating completion.

## Verification Plan

- Query GitHub through `gh`/GraphQL and retain bounded item fields needed to reconcile issues, project status, assignees, branches, and PRs.
- Exercise each defect through the highest-level non-GUI entry point available; for UI defects, request permission before browser/computer use as required by this repository.
- Run only targeted tests, lint, and typechecks for touched scopes; do not run repository-wide checks prohibited by `AGENTS.md`.
- Freeze each candidate, inspect its final diff, run `done-check`, dispatch a fresh reviewer, then verify GitHub PR and check-run metadata after push.

## Decisions & Why

- The remote is GitHub, so delivery artifacts will be pull requests rather than GitLab merge requests.
- The initial bare worktree branch was renamed and pushed as `chore/triage-github-project-issues` before any edit, satisfying the upstream requirement while the issue inventory is established.

## Inventory and classification

- `clintebbesen/t3code` has no GitHub Projects board exposed to the authenticated
  token (`read:project` is unavailable); the public repository page reports
  “There aren't any projects yet.” The repository's open-issue list is therefore
  the reconciled work-item set.
- Open fork issue [#1](https://github.com/clintebbesen/t3code/issues/1) is
  actionable and traces to the single global `ProviderCommandReactor` worker;
  it is delivered as the focused cross-thread lane fix in PR
  [#7071](https://github.com/pingdotgg/t3code/pull/7071).
- Open fork issue [#2](https://github.com/clintebbesen/t3code/issues/2) is
  actionable and delivered in PR
  [#7068](https://github.com/pingdotgg/t3code/pull/7068), which targets upstream
  [#5389](https://github.com/pingdotgg/t3code/issues/5389).
- Open fork issue [#3](https://github.com/clintebbesen/t3code/issues/3) is
  actionable documentation work and delivered in PR
  [#7069](https://github.com/pingdotgg/t3code/pull/7069).
- No open fork issue had an assignee, linked branch, or pre-existing PR at
  inventory time. Upstream #5781 is already closed/fixed; #6517 and #5389 are
  still open. The related #6531, #6560, #4944, and #4584 records remain
  separately scoped and were not silently duplicated.

## Candidate evidence

### Issue #2 / PR #7068

- Branch `fix/codex-jsonl-linear-framing`, exact head `3de1fe92b989e804a540725222f9c32641943217`, based on upstream `main` `2cb1a26f061fa9029ccbe2a614f02bb14b22dd45`.
- Added the shared incremental `lineFramer`; app-server stdin and Codex stderr
  use it. Focused framing/protocol run: 2 files, 14 tests passed. Package and
  server typechecks, targeted lint/formatting, and `done-check --base upstream/main --no-tests` passed.
- Reviewer evidence: the initial fresh tier-1 Claude attempts failed twice with
  `429: All credentials ... cooling down`; a fresh tier-2 `gpt-5.6-sol` review
  found and the candidate resolved the performance regression-test weakness and
  EOF ordering gap. Delta re-review verdict: PASS.
- Exact workload evidence: candidate 7–13 ms versus old accumulator 8,105 ms
  for 20 MiB; the regression rejects implementations over 2,000 ms.

### Issue #3 / PR #7069

- Branch `docs/upstream-development-workflow`, exact head `a872c67172e2d43b4b370e222e4cfa4f84ed86b6`, based on upstream `main`.
- Added `docs/internals/upstream-development.md`, linked from `CONTRIBUTING.md`
  and `docs/README.md`. The guide covers all 12 issue requirements, including
  duplicate search, isolated/live-state boundaries, explicit PR targeting, and
  official-release retirement.
- `git diff --check`, formatting, targeted documentation inspection, and
  `done-check --base upstream/main --no-tests` passed. No documentation-specific
  lint command is defined; tests are not applicable to this documentation-only
  change.
- Fresh external reviewer dispatch was not run because the active instruction
  forbids delegating to subagents without explicit user authorization; a
  separated self-review checked every requirement and the final diff.

### Issue #1 / PR #7071

- Branch `fix/provider-command-cross-thread-lockout`, exact head
  `4822cc340af75f7970d7aed582507cd5a68049ee`, based on upstream `main`.
- Duplicate check before coding: upstream #6517 remains open; #5781 is closed
  with the notification-consumer lifetime fix already in current `main`; #6531,
  #6560, #4944, #4584, and related PRs remain open or separately scoped.
- Extended `packages/shared/src/DrainableWorker.ts` with keyed FIFO lanes and
  idle cleanup; `ProviderCommandReactor` now keys provider work by thread.
  Shared keyed-worker regression proves different keys progress while one is
  blocked and same-key work remains FIFO. Focused run: 2 files, 47 tests passed;
  server/shared typechecks, targeted lint/formatting, and
  `done-check --base upstream/main --no-tests` passed.
- This PR intentionally addresses the cross-thread scheduler root cause only;
  open #6531 owns urgent interrupt handling, while lifecycle timeout, stale
  session, restart recovery, and durable projection follow-ups remain separate
  records rather than scope creep.
- Fresh external reviewer dispatch was not run for the same no-delegation
  reason; a separated self-review checked the keyed-worker lifecycle, cleanup,
  FIFO, and exact diff.
- Cursor Bugbot then found a true medium-severity resource-lifecycle gap at
  [discussion r3789293531](https://github.com/pingdotgg/t3code/pull/7071#discussion_r3789293531):
  deleting an idle lane did not stop its forever worker fiber. Follow-up commit
  `4822cc340` gives every lane a child queue scope, closes it after drain, and
  deliberately provides provider effects the parent reactor scope so existing
  forked turn work survives lane cleanup. The focused 2-file/47-test run,
  server/shared typechecks, targeted lint, and exact-head `done-check` all
  passed again; the inline finding was answered with the fix evidence.

## Delivery and check status

- All three PRs explicitly target `pingdotgg/t3code:main` and have exact fork
  source heads verified through the GitHub API. Each coordinating fork issue has
  a comment linking its PR. No PR was merged.
- GitHub checks were still running at verification time. PRs #7069 and #7071
  both show the external `Vercel – t3code-marketing` status as `FAILURE` through
  a Vercel authorization URL; PR #7068's repository checks were queued/in
  progress. These are external CI blockers, not locally reproducible failures;
  no claim of green upstream CI is made.
- A later poll showed every PR #7068 check green. PR #7069's repository review
  checks are green except for its terminal Vercel authorization failure. PR
  #7071 restarted checks on `4822cc340`; conventions passed, correctness,
  Approvability, and Bugbot were still running, and the terminal Vercel
  authorization failure remained.
- UI/browser evidence was skipped: none of the delivered diffs changes a UI
  surface, and repository instructions prohibit browser/computer use without
  explicit user permission.

## Work Done

- Read project authority plus the development, debugging, testing, review, Git workflow, DevBoard, documentation, and product-quality process documents.
- Ran `git-preflight`: the checkout was clean at `origin/main` commit `804cba43`; the original branch lacked an upstream, which was corrected by the triage branch rename and push.
- Confirmed `clintebbesen/t3code` is a public GitHub repository with default branch `main`, and authenticated CLI access is available.

## Open / Not Done / Known Issues

- Upstream review and CI remain open for PRs #7068, #7069, and #7071; the Vercel
  marketing check is externally blocked as recorded above. The user must decide
  whether to request a rerun/authorization or wait for maintainers.
- Issue #1's broader lifecycle timeout/stale-event/restart-recovery criteria are
  explicitly recorded as follow-up scope, not silently claimed complete.
- No browser/computer-use permission was requested or needed because no UI was
  changed.
