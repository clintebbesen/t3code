# Fork-aware T3 package deployment

Publish this fork as its own npm CLI package so each Linux server can be installed or updated manually with one idempotent command.

## Metadata

- **Started:** 2026-08-15 · **Status:** complete
- **Branch(es):** feat/fork-aware-cli-package · **Worktree:** /home/t3code/.t3/worktrees/CE-T3Code/t3code-d0130990
- **MR link(s):** <none yet>
- **Task class:** standard

## Requirements (verbatim)

> "I have got three T3 code servers, which are all individual LXCs here on Proxmox. What is the best way for us to deploy our own fork of T3 code to these three servers? It needs to be very simple to do. It can't be difficult.
>
> At the moment, I use a single command. I think it's `mpx t3 code latest` or something like that, some install command where it just installs the latest T3 code. I want it to be. It doesn't have to be, obviously, the same as that, but it needs to be a single one-line command to install the latest version on each of these three T3 code servers. It will then pull or install whatever the latest is that we have got on our T3 code fork.
>
> Tell me, walk me through what is the best way. How does all this work? What can we do for it all?"

> "I don't want to update all three from one machine. It's fine to have to log into each and update manually. I don't want to update at one time. I need to do the updates manually when the servers aren't in use. Can you build whatever it is that you've said for this MPX stuff? How much of that can you do by yourself to get all this working?"

## Checklist (= definition of 100% done)

- [x] Give the fork a distinct public npm distribution identity without breaking the monorepo's local `t3` workspace filters.
- [x] Make pinned installation, the stable service launcher, CLI suggestions, service messages, and the bundled web client's copied update command use that distribution identity.
- [x] Add a manual-only GitHub Actions release that builds and publishes one monotonically versioned fork CLI release to npm's `latest` tag.
- [x] Document the one-time npm bootstrap and the one-command per-LXC install/update and exact-version rollback workflow.
- [x] Add focused regression coverage for unscoped/scoped package paths and fork-aware commands, then run targeted tests, typechecks, build/package dry-run, `done-check`, and fresh review.

## Assumptions

- The fork's public package name will be `t3code-clintebbesen`; the name was unclaimed on npm when checked on 2026-08-15. It can be changed in the committed package distribution setting before the first publish.
- Releases are deliberately manual and independent of deployment. Publishing makes a candidate available; it never contacts or restarts any LXC.
- Each LXC continues to be updated only when the operator logs in and runs the one-line command as the T3 service user.
- The three target LXCs are Linux x64 under Proxmox, so the fork workflow needs the Linux x64 resource monitor rather than desktop/mobile release artifacts.

## Success Measures

- A package built with the fork distribution identity installs and launches from `node_modules/t3code-clintebbesen/dist/bin.mjs`, never from the official `node_modules/t3` path.
- The published web bundle and CLI display/copy `t3code-clintebbesen` update commands.
- The release workflow has no scheduled or push trigger and verifies npm `latest` after publication.
- First install, normal update, and rollback are respectively supported by the same `service update` entry point with `@latest` or an exact version.

## Verification Plan

- Exercise package-name/path and command rendering through focused server/web tests, including a scoped-name edge case.
- Build the web and server bundles with the fork identity and inspect the packed npm contents/metadata without publishing.
- Validate the workflow syntax statically, run targeted package typechecks and formatting/lint for touched files, then freeze and review the final candidate.

## Decisions & Why

- Keep deployment pull-based and manual. The release workflow only publishes; it does not SSH, call Proxmox, schedule updates, or restart servers.
- Reuse T3's existing systemd launcher and pinned-runtime rollback instead of introducing a shell installer, container image, or repository checkout on each host.
- Keep the workspace package named `t3` for upstream compatibility, but add a committed distribution-package identity used by the published artifact. This avoids rewriting every local workspace filter.
- Use an unscoped public package for the shortest setup: no registry login is needed on the LXCs, and `npx -y t3code-clintebbesen@latest service update` is unambiguous.
- Generate versions as `<upstream-base>-fork.<UTC-date>.<workflow-run>.<rerun-attempt>`. The exact version is unique even when a failed workflow is rerun, and serialized releases prevent concurrent runs from racing npm's `latest` tag.
- Select the server package for publication by its stable workspace path (`./apps/server`), not package name. The publish command temporarily replaces the package name, so a name-based filter can silently match nothing.

## Work Done

- Confirmed `service update` already reconciles absent and installed services and preserves the stable-launcher/database rollback design.
- Traced the official-package hard-coding through pinned runtime installation, launcher path resolution, CLI suggestions/status, web version-skew commands, and release publication.
- Confirmed both `t3code-clintebbesen` and `@clintebbesen/t3` were unclaimed on the public npm registry; selected the simpler unscoped name.
- Added the committed `t3code.distributionPackage` owner, embedded package identity, scoped/unscoped path handling, and package-aware pinned install, launcher, service/CLI suggestions, web copy command, and update messages.
- Added manual-only `.github/workflows/release-fork-cli.yml`; it serializes releases, builds web/server/Linux telemetry artifacts, validates package contents, publishes with npm provenance, reads `latest` back, and reports current/previous exact versions. It has no scheduled, push, tag, SSH, Proxmox, or LXC mutation path.
- Added `docs/operations/fork-cli-deployment.md` and updated server-update/release living docs.
- Initial publish dry-run exposed that the old `--filter t3` no longer matched after temporary package renaming while Vite+ still exited 0. Replaced it with `--filter ./apps/server` and added `publishConfig.test.ts`; the repeated real dry-run then reported `t3code-clintebbesen@0.0.33-fork.999` and exit 0.
- Focused regression run: 11 files, 53 tests passed. Targeted server/web/client-runtime typechecks passed; existing unrelated Effect suggestions remained non-fatal. Targeted lint and formatting passed.
- Targeted production build passed for `@t3tools/web` and `t3`; built launcher, server chunk, and web assets all contained `t3code-clintebbesen`. Running the built CLI's real `service update --help` printed `npx -y t3code-clintebbesen@latest service update`.
- Workflow YAML parsed, the only trigger was `workflow_dispatch`, serialization was present, and every shell block passed `bash -n`.
- Separated self-review found two release-quality gaps: the published manifest still linked upstream instead of this fork, and an immediate npm read-back could fail on registry propagation. Corrected the repository metadata and added six visibly advancing, bounded read-back attempts.
- Final focused verification passed 11 files and 53 tests. The web and server production builds passed, and `done-check --base origin/main --no-tests --ui-trivial ...` passed typecheck and lint with one unrelated pre-existing lint warning. Tests were supplied separately rather than through `done-check`.
- Tier 3 separated self-review was used because the user did not authorize delegation and the active harness rules prohibit proactive reviewer delegation. The review re-read the request, contract, complete diff, package/runtime owners, workflow, operator runbook, and verification evidence. One optional UI-only wording expansion was rejected as out of scope because it did not affect deployment and would require user-authorized browser evidence. No blocking findings remained.

## Open / Not Done / Known Issues

- No npm package has been created or published. Initial package ownership/trusted-publisher setup is an external account action and will be documented rather than guessed or performed with credentials.
- No LXC has been contacted, modified, restarted, or tested.
- The repository has no `docs/project-guide.html`; this pre-existing documentation-process gap was not expanded into the deployment change.

## Relevant living-doc candidates

- `docs/internals/server-updates.md`: package-identity ownership in pinned runtimes.
- `docs/operations/release.md`: fork CLI publication and npm bootstrap.
- `docs/user/background-service.md`: fork-specific manual update instructions, if this branch remains fork-only.
