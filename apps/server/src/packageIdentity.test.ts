import { assert, it } from "@effect/vitest";

import {
  CLI_DISTRIBUTION,
  CLI_PACKAGE_NAME,
  cliInstallSpec,
  cliLatestInstallSpec,
  cliNpxCommand,
  cliPackageLabel,
  packageNamePathSegments,
} from "./packageIdentity.ts";

it("uses immutable and stable GitHub Release assets for fork installs", () => {
  assert.equal(CLI_PACKAGE_NAME, "t3code-clintebbesen");
  assert.equal(cliPackageLabel("1.2.3"), "t3code-clintebbesen@1.2.3");
  assert.equal(
    cliInstallSpec("1.2.3-fork.4"),
    "https://github.com/clintebbesen/t3code/releases/download/fork-cli-v1.2.3-fork.4/t3code-clintebbesen.tgz",
  );
  assert.equal(
    cliLatestInstallSpec(),
    "https://github.com/clintebbesen/t3code/releases/download/fork-cli-latest/t3code-clintebbesen.tgz",
  );
  assert.equal(
    cliNpxCommand("latest", "service update"),
    "npx -y --prefer-online --package=https://github.com/clintebbesen/t3code/releases/download/fork-cli-latest/t3code-clintebbesen.tgz -- t3 service update",
  );
  assert.equal(
    cliNpxCommand("1.2.3-fork.4", "service update"),
    "npx -y --prefer-online --package=https://github.com/clintebbesen/t3code/releases/download/fork-cli-v1.2.3-fork.4/t3code-clintebbesen.tgz -- t3 service update",
  );
});

it("preserves registry package specs when no GitHub Release source is configured", () => {
  const registryDistribution = { packageName: "t3" };
  assert.equal(cliInstallSpec("1.2.3", registryDistribution), "t3@1.2.3");
  assert.equal(cliLatestInstallSpec(registryDistribution), "t3@latest");
  assert.equal(
    cliNpxCommand("latest", "service update", registryDistribution),
    "npx -y t3@latest service update",
  );
  assert.isDefined(CLI_DISTRIBUTION.githubRelease);
});

it("maps unscoped and scoped npm package names below node_modules", () => {
  assert.deepEqual(packageNamePathSegments("t3code-clintebbesen"), ["t3code-clintebbesen"]);
  assert.deepEqual(packageNamePathSegments("@example/t3"), ["@example", "t3"]);
});
