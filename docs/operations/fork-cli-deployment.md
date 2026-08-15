# Manual deployment of the fork CLI

This fork publishes its Linux server CLI as `t3code-clintebbesen`. The LXC hosts do not pull from
Git, build the monorepo, or run a deployment agent. They download the published npm package only
when an operator chooses to update a host.

## One-time maintainer setup

The package identity is declared in `apps/server/package.json` under
`t3code.distributionPackage`. Change that value before the first publish if a different public npm
name is preferred. The operator command then uses that exact name.

Create the public package once from a maintainer workstation after authenticating to npm. Build the
web and server packages, build the Linux resource monitor, and run the publish command with a unique
fork version. The repository's publish command restores the working tree's package metadata after
it completes:

```sh
vp run --filter @t3tools/web build
vp run --filter t3 build
cargo build --locked --release --manifest-path native/resource-monitor/Cargo.toml
mkdir -p apps/server/dist/resource-monitor/linux-x64
cp native/resource-monitor/target/release/t3-resource-monitor apps/server/dist/resource-monitor/linux-x64/
node apps/server/scripts/cli.ts publish --tag latest --access public --app-version 0.0.33-fork.1 --verbose
```

After the package exists, configure npm Trusted Publishing for this repository and the workflow
`.github/workflows/release-fork-cli.yml`. The workflow has no push, tag, schedule, SSH, Proxmox, or
automatic deployment trigger: use **Run workflow** when a release is ready.

Each run derives a unique version from the current server version, date, GitHub run number, and
rerun attempt, publishes it to npm's `latest` dist-tag, and reads the dist-tag back before reporting
success. Its summary includes both the published version and, when one existed, the previous latest
version to use as a rollback target.

## Manual update on one LXC

Log into the LXC as the user that owns T3's data and provider authentication. Stop or wait for
active agent work, then run:

```sh
npx -y t3code-clintebbesen@latest service update
```

Run the same command again on that host whenever you choose to install the newest published fork
release. It is safe for first installation, repair, and ordinary updates. It briefly restarts the
T3 service; it does not contact or update either of the other LXCs.

Check the result with:

```sh
npx -y t3code-clintebbesen@latest service status
```

The service is installed for the current user, starts at boot through systemd, and keeps exact
runtime versions under the T3 runtime directory. The stable launcher trials an update and restores
the previous version and SQLite snapshot if the candidate fails its preflight or startup checks.

## Exact-version rollback

The release workflow prints the previous latest version in its summary. To return one host to that
version, run the same service command with the exact package version:

```sh
npx -y t3code-clintebbesen@0.0.33-fork.20260815.7 service update
```

Rollback is per host and remains a manual decision. Provider CLI installation, provider login, LXC
backups, and Proxmox lifecycle operations are outside this npm release path.

## Boundaries

- Publishing a release does not update any host.
- Updating one host does not update another host.
- No npm token is stored on the LXCs; the package is public and downloads anonymously.
- The workflow publishes only after building the bundled web client, server CLI, and Linux resource
  monitor. A failed build or npm read-back fails the workflow before an operator is told to update.
