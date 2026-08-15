import { assert, it } from "@effect/vitest";

import { CLI_PACKAGE_NAME, cliPackageSpec, packageNamePathSegments } from "./packageIdentity.ts";

it("uses the fork distribution package for exact runtime installs", () => {
  assert.equal(CLI_PACKAGE_NAME, "t3code-clintebbesen");
  assert.equal(cliPackageSpec("1.2.3"), "t3code-clintebbesen@1.2.3");
});

it("maps unscoped and scoped npm package names below node_modules", () => {
  assert.deepEqual(packageNamePathSegments("t3code-clintebbesen"), ["t3code-clintebbesen"]);
  assert.deepEqual(packageNamePathSegments("@example/t3"), ["@example", "t3"]);
});
