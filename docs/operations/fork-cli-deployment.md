# Manual deployment of the fork CLI

This fork distributes its Linux server CLI as a public GitHub Release archive. The LXC hosts do
not pull from Git, build the monorepo, use an npm account, or run a deployment agent. They download
the release only when an operator chooses to update that host.

## Create a release

After the release workflow is on the repository's default branch:

1. Open **Actions → Release Fork CLI** in `clintebbesen/t3code`.
2. Select **Run workflow**.
3. Wait for the workflow and its **Read back release assets** step to pass.
4. Copy the manual update command from the workflow summary.

No npm registration or trusted-publisher setup is required. The workflow has no push, tag,
schedule, SSH, Proxmox, or automatic deployment trigger.

Each run builds the web client, server CLI, and Linux x64 resource monitor. It then creates:

- an immutable release such as `fork-cli-v0.0.33-fork.20260816.7.1`, used for exact installs and
  rollback;
- the stable `fork-cli-latest` release asset, refreshed by the manual workflow after local package
  validation.

The workflow downloads both public assets and compares their bytes with the archive it built. It
also runs the CLI help entry point from the public stable URL before reporting success.

## Install or update one LXC

Log into the LXC as the user that owns T3's data and provider authentication. Wait for active agent
work to finish, then run this single command:

```sh
npx -y --prefer-online --package=https://github.com/clintebbesen/t3code/releases/download/fork-cli-latest/t3code-clintebbesen.tgz -- t3 service update
```

The same command handles first installation, ordinary updates, and repair. `--prefer-online`
ensures npm revalidates the stable GitHub asset instead of trusting a cached copy. The command
briefly restarts this LXC's T3 service and does not contact either of the other LXCs.

Check the result with:

```sh
npx -y --prefer-online --package=https://github.com/clintebbesen/t3code/releases/download/fork-cli-latest/t3code-clintebbesen.tgz -- t3 service status
```

The service is installed for the current user, starts at boot through systemd, and keeps exact
runtime versions under the T3 runtime directory. Although the initial command uses the stable
asset, the running CLI installs its pinned runtime from that version's immutable release URL. The
launcher restores the previous runtime and SQLite snapshot if a candidate fails preflight or
startup checks.

## Roll back one LXC

The workflow summary prints the previous immutable release command. Its form is:

```sh
npx -y --prefer-online --package=https://github.com/clintebbesen/t3code/releases/download/fork-cli-v0.0.33-fork.20260816.7.1/t3code-clintebbesen.tgz -- t3 service update
```

Rollback remains a manual, per-host decision. Provider CLI installation, provider login, LXC
backups, and Proxmox lifecycle operations are outside this release path.

## Boundaries

- Creating a GitHub Release does not update any host.
- Updating one host does not update another host.
- Public release downloads require no GitHub or npm credentials on an LXC.
- The fork package itself is never published to a package registry. Its declared third-party
  dependencies are still resolved by npm while installing the GitHub archive.
- A failed build, package validation, release upload, public read-back, or public CLI smoke test
  fails the workflow before an operator is told to update.
