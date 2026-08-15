# Fork-aware T3 package deployment

Distribute this fork through public GitHub Release archives so each Linux server can be installed or updated manually with one idempotent command.

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

> "is there a easy way we can do this without a public registry?"

> "public repo is fine. go ahead and get it ready for me to run the one command"

## GitHub Releases conversion checklist

- [x] Replace npm publication and npm account setup with a manual-only public GitHub Release workflow.
- [x] Give the release tarball stable latest and exact-version URLs, and make pinned runtime installation use exact GitHub Release artifacts rather than the npm registry.
- [x] Make every fork install/update/repair/rollback command use the public release URL while leaving upstream/default package behavior intact.
- [x] Update operator and architecture documentation so the first action is only running the manual release workflow, followed by one command per idle LXC.
- [x] Prove package creation, artifact naming, command rendering, exact-version installation, workflow syntax, builds, and the real tarball CLI entry point; then run final checks and review.

## GitHub Releases conversion contract

- **Task class:** standard, release/deployment boundary.
- The repository is public, so GitHub Release assets may be downloaded anonymously and no npm or LXC credential is required.
- Releases and deployments remain manual and independent: the workflow creates an artifact, while each LXC updates only when an operator runs the command there.
- The final one-line command must use the stable public `fork-cli-latest` release asset, while the installed launcher must retain an immutable exact-version source for repair and rollback. A dedicated alias avoids interference from this repository's unrelated desktop releases.
- No LXC, Proxmox host, npm account, package registry, or deployed service is in scope for mutation during repository preparation.

## GitHub Releases conversion verification plan

- Add pure tests for latest/exact GitHub Release URLs, package specs, asset names, and fork/upstream fallbacks.
- Build and pack the final CLI, inspect the archive, install it from a local tarball URL/spec in an isolated temporary prefix, and run its real help entry point.
- Parse the workflow, syntax-check every shell block, run focused tests and targeted builds/typechecks/lint, inspect the final diff, and perform a separated review.

## Initial npm design checklist (superseded by the GitHub Releases conversion)

- [x] Give the fork a distinct public npm distribution identity without breaking the monorepo's local `t3` workspace filters.
- [x] Make pinned installation, the stable service launcher, CLI suggestions, service messages, and the bundled web client's copied update command use that distribution identity.
- [x] Add a manual-only GitHub Actions release that builds and publishes one monotonically versioned fork CLI release to npm's `latest` tag.
- [x] Document the one-time npm bootstrap and the one-command per-LXC install/update and exact-version rollback workflow.
- [x] Add focused regression coverage for unscoped/scoped package paths and fork-aware commands, then run targeted tests, typechecks, build/package dry-run, `done-check`, and fresh review.

## Assumptions

- The archive's package identity remains `t3code-clintebbesen` so npm can install the downloaded tarball into a deterministic `node_modules` path; it is not registered or published on npm.
- Releases are deliberately manual and independent of deployment. Publishing makes a candidate available; it never contacts or restarts any LXC.
- Each LXC continues to be updated only when the operator logs in and runs the one-line command as the T3 service user.
- The three target LXCs are Linux x64 under Proxmox, so the fork workflow needs the Linux x64 resource monitor rather than desktop/mobile release artifacts.

## Success Measures

- A package built with the fork distribution identity installs and launches from `node_modules/t3code-clintebbesen/dist/bin.mjs`, never from the official `node_modules/t3` path.
- The published web bundle and CLI display/copy `t3code-clintebbesen` update commands.
- The release workflow has no scheduled or push trigger and reads the stable and immutable public GitHub assets back byte-for-byte after upload.
- First install, normal update, and rollback use the same `service update` entry point with the stable alias or an exact immutable GitHub Release URL.

## Verification Plan

- Exercise package-name/path and command rendering through focused server/web tests, including a scoped-name edge case.
- Build the web and server bundles with the fork identity and inspect the packed npm contents/metadata without publishing.
- Validate the workflow syntax statically, run targeted package typechecks and formatting/lint for touched files, then freeze and review the final candidate.

## Decisions & Why

- Keep deployment pull-based and manual. The release workflow only publishes; it does not SSH, call Proxmox, schedule updates, or restart servers.
- Reuse T3's existing systemd launcher and pinned-runtime rollback instead of introducing a shell installer, container image, or repository checkout on each host.
- Keep the workspace package named `t3` for upstream compatibility, but add a committed distribution-package identity used by the published artifact. This avoids rewriting every local workspace filter.
- Keep an unscoped package identity inside the archive for the shortest deterministic install path, while fetching the fork itself from GitHub rather than registering it on npm.
- Generate versions as `<upstream-base>-fork.<UTC-date>.<workflow-run>.<rerun-attempt>`. The exact version is unique even when a failed workflow is rerun, and serialized releases prevent concurrent runs from racing npm's `latest` tag.
- Select the server package for publication by its stable workspace path (`./apps/server`), not package name. The publish command temporarily replaces the package name, so a name-based filter can silently match nothing.
- Supersede npm publication for this fork with public GitHub Release assets. The existing npm publish subcommand remains intact for upstream compatibility, but the fork workflow never invokes it.
- Use the dedicated mutable tag `fork-cli-latest` rather than GitHub's repository-wide “latest release” pointer. Desktop or other releases cannot redirect the LXC command away from the fork CLI. Every build also receives an immutable `fork-cli-v<version>` release for pinning and rollback.
- Use npm's explicit tarball form, `npx --package=<url> -- t3 ...`. A real local archive run proved that positional `npx <tarball>` is treated as an executable path rather than a package.
- Pack through `vp pm pack --filter ./apps/server` after applying release metadata. Plain `npm pack` rejects pnpm's valid dependency override selectors, while the repository-owned Vite+ path preserves them.
- Keep `--prefer-online` on stable commands so npm revalidates the mutable GitHub asset. Exact-version URLs remain immutable.

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
- Replaced the fork workflow's npm OIDC publication with manual GitHub Release creation. It builds and validates one archive, publishes an immutable exact release, refreshes the dedicated stable alias, reads both public assets back byte-for-byte with bounded visible retries, and runs the CLI help entry point from the public stable URL.
- Embedded the GitHub Release repository, tags, and asset name into both server bundles. Pinned runtimes install from the immutable exact-version URL; service repair, CLI suggestions, terminal guidance, and web manual-update copy use the stable or exact URL appropriate to their purpose. A pure fallback test preserves official `t3@version` registry behavior when no GitHub source is configured.
- Added a release `pack` subcommand that shares the existing prepared-manifest/icon transaction with npm publication, selects the renamed workspace by path, writes one requested archive, and restores the worktree even on failure.
- Real archive verification passed: the packed manifest was `t3code-clintebbesen@0.0.33`; the archive contained the CLI, stable launcher, and web client; `npx --package=<local-tarball> -- t3 service update --help` ran successfully and printed the final GitHub command; and `npm install --prefix <temp> <tarball>` produced the expected `node_modules/t3code-clintebbesen/dist/bin.mjs` pinned layout.
- Conversion-focused verification passed 10 files and 49 tests. Targeted server/web typechecks and lint passed with only unrelated pre-existing Effect suggestions. Web and server production builds, the existing npm publish dry-run, formatting, and `git diff --check` passed.
- Workflow YAML parsed with only `workflow_dispatch`, all 11 shell blocks passed `bash -n`, the repository/release metadata resolver produced the expected stable and exact URLs against the real GitHub repository, and the `gh release` flags were verified against the installed CLI.
- Final `done-check --base origin/main --no-tests --ui-trivial ...` passed repository typecheck and lint with one unrelated pre-existing lint warning. Tests were run separately (10 files, 49 tests); the UI waiver applies only to the tested command-copy change and no layout or interaction changed.
- Tier 3 separated self-review ran because the user did not request delegation and proactive reviewer delegation is prohibited by the active harness. The review tried to disprove the stable-download, exact-pinning, first-release, repeat-release, rollback, upstream-fallback, and manual-per-host claims against the final diff and evidence. Verdict: PASS, with the unavailable local Rust build and not-yet-created public release explicitly retained as limitations rather than overstated.

## Open / Not Done / Known Issues

- No npm package will be created or published for this fork. Third-party dependencies inside the GitHub archive are still resolved through npm during installation.
- No GitHub Release has been created yet. The one-line LXC command becomes live only after this workflow reaches the default branch and a maintainer manually runs **Release Fork CLI** once.
- No LXC has been contacted, modified, restarted, or tested.
- The local environment has no `cargo` executable, so the Linux resource-monitor binary could not be rebuilt locally. The workflow now uses the repository's established `dtolnay/rust-toolchain@stable` setup and refuses to publish unless the built binary is present in the archive.
- The repository has no `docs/project-guide.html`; this pre-existing documentation-process gap was not expanded into the deployment change.

## Relevant living-doc candidates

- `docs/internals/server-updates.md`: package-identity ownership in pinned runtimes.
- `docs/operations/release.md`: fork CLI GitHub Release packaging.
- `docs/user/background-service.md`: fork-specific manual update instructions, if this branch remains fork-only.
