# Fork release: goal controls, capacity retry, Xcode MCP default

Date: 2026-09-22

## User request, verbatim

Goal: get the CE-T3Code fork's stalled fixes merged to the fork's main, built, and installed on the
T3 Code servers, so agents stop stopping early.

## What was merged

The release branch is `release/fork-2026-09-22`. It starts at `origin/fix/codex-native-goal-controls`.
That branch holds three fork commits on upstream base c0995d2ea:

- 653dd4289 feat: add explicit native Codex goal controls
- 901770ea0 fix: run focused T3 checks with the project tools
- a44ba533e fix: preserve global policy checks through Vite hooks

Two branches merged into it:

- `origin/fix/disable-unrelated-xcode-mcp` (068b6950a). It disables an unrelated Xcode MCP server
  by default in `.codex/config.toml`.
- `origin/fix/codex-capacity-retry` (08a54a648). This is new. It was uncommitted work on the
  192.168.30.101 checkout. It retries a Codex capacity error automatically. The delay is 30 seconds.
  The limit is 5 attempts. The constant is `CODEX_CAPACITY_RETRY_DELAY_MS`.

One conflict occurred in `apps/web/src/components/chat/MessagesTimeline.tsx`. The goal-controls base
already shows `circle-alert` for warnings and adds a failure indicator. The capacity-retry side only
changed the same icon. The merge kept the goal-controls version.

A version commit 5d448ab7e stamps the packaged version as 0.0.39.

## Build and install commands

Run these from `/home/t3code/projects/HomeLab/CE-T3Code` on the release branch:

```sh
pnpm install --frozen-lockfile
PATH="$PWD/node_modules/.bin:$PATH" vp run --filter t3 build
node /tmp/fork-pack.mjs            # writes the publish package.json (catalog and overrides resolved)
cd apps/server && pnpm pack --pack-destination /tmp
cp /tmp/fork-pack-original-package.json apps/server/package.json
```

`npm pack` fails here. It rejects the pnpm override selectors such as
`@anthropic-ai/claude-agent-sdk>@anthropic-ai/claude-agent-sdk-darwin-arm64`. Use `pnpm pack`.

Install on one host:

```sh
scp /tmp/t3-0.0.39.tgz t3code@<host>:/tmp/t3-0.0.39.tgz
ssh t3code@<host> 'npm install -g /tmp/t3-0.0.39.tgz && systemctl --user restart t3code.service'
```

The systemd user unit is `t3code.service`. It runs
`/home/t3code/.npm-global/bin/t3 --host 0.0.0.0 --port 3773 --no-browser`.

## Versions per server

| Host | Before | After | Service | Web port 3773 |
|---|---|---|---|---|
| 192.168.30.101 | 0.0.38 | 0.0.39 | active | HTTP 200 |
| 192.168.30.112 | 0.0.38 | 0.0.39 | active | HTTP 200 |
| 192.168.30.118 | 0.0.38 | 0.0.38 | active | not restarted |

192.168.30.118 runs the agent session that made this release. Its restart is deferred to the user.

## Tests

Focused server tests passed: 4 files, 83 tests. The files were `CodexSessionRuntime.test.ts`,
`CodexGoalRuntime.test.ts`, `CodexAdapter.test.ts`, and `CodexCollabRuntime.integration.test.ts`.

The `apps/server` typecheck passed with `tsgo --noEmit`. It reported suggestions only.

The full repository suite, lint, and web tests were not run.

## Verified after install

`t3 --version` reports 0.0.39 on both updated hosts. `systemctl --user is-active t3code.service`
reports active. `curl http://127.0.0.1:3773/` returns 200. The installed `dist/bin.mjs` contains
`CODEX_CAPACITY_RETRY_DELAY_MS` on both hosts.

The hand-patched bundles are now replaced by a built package. The backups named
`bin.mjs.bak-capacity-retry-*` are no longer needed on the updated hosts.

## Not done

No agent behavior test proves that the goal controls stop the early stops in production. Only the
build, the install, the service state, and the served page were observed.
