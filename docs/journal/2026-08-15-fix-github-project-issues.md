# Fix GitHub project issues

Inventory every open work item attached to the repository's GitHub project, fix each actionable issue on an isolated branch, and open one verified pull request per issue.

## Metadata

- **Started:** 2026-08-15 · **Status:** active
- **Branch(es):** chore/triage-github-project-issues plus one issue branch per fix · **Worktree:** /home/t3code/.t3/worktrees/CE-T3Code/t3code-d0130990
- **MR link(s):** <none yet>
- **Task class:** audit-scale

## Requirements (verbatim)

> "I need you to look at the work items, all the issues on this GitHub project, and then create fixes for them and create MRs for those fixes for each issue."

## Checklist (= definition of 100% done)

- [ ] Inventory the repository's GitHub Projects and all open issue work items, including status, ownership, linked branches, and linked pull requests.
- [ ] Classify every item as actionable, already owned/delivered, duplicate, invalid, or blocked, with evidence recorded here.
- [ ] For each actionable issue, reproduce or otherwise establish the requested behavior and trace the owning code path before editing.
- [ ] Implement one scoped fix and proportionate regression evidence per actionable issue, on a branch based on the latest `origin/main`.
- [ ] Run focused project checks, `done-check`, and a fresh review for every candidate; obtain rendered UI evidence only with the user's explicit permission if a fix changes UI.
- [ ] Commit, push, and open one GitHub pull request per fixed issue, explicitly targeting `main`; verify each PR's source, target, issue link, and checks on the exact head SHA.
- [ ] Record every PR URL, verification result, skipped check, blocker, and remaining work item before reporting.

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

## Work Done

- Read project authority plus the development, debugging, testing, review, Git workflow, DevBoard, documentation, and product-quality process documents.
- Ran `git-preflight`: the checkout was clean at `origin/main` commit `804cba43`; the original branch lacked an upstream, which was corrected by the triage branch rename and push.
- Confirmed `clintebbesen/t3code` is a public GitHub repository with default branch `main`, and authenticated CLI access is available.

## Open / Not Done / Known Issues

- GitHub project and issue inventory is not yet complete.
- No issue has yet been reproduced, fixed, verified, reviewed, or delivered in a pull request.
- No browser/computer-use permission has been requested or granted for any potential UI issue.
