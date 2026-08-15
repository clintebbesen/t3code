import { assert, it } from "@effect/vitest";

import { createVpPmPublishArgs, SERVER_WORKSPACE_FILTER } from "./publishConfig.ts";

it("selects the server workspace by path while its publish name is replaced", () => {
  assert.equal(SERVER_WORKSPACE_FILTER, "./apps/server");
  assert.deepEqual(
    createVpPmPublishArgs({
      access: "public",
      tag: "latest",
      provenance: true,
      dryRun: true,
    }),
    [
      "publish",
      "--filter",
      "./apps/server",
      "--access",
      "public",
      "--tag",
      "latest",
      "--no-git-checks",
      "--provenance",
      "--dry-run",
    ],
  );
});
