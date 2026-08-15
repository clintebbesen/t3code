import { assert, it } from "@effect/vitest";

import {
  createVpPmPackArgs,
  createVpPmPublishArgs,
  SERVER_WORKSPACE_FILTER,
} from "./publishConfig.ts";

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

it("packs the temporarily renamed server workspace to the requested archive", () => {
  assert.deepEqual(createVpPmPackArgs("/tmp/t3code-clintebbesen.tgz"), [
    "pack",
    "--filter",
    "./apps/server",
    "--out",
    "/tmp/t3code-clintebbesen.tgz",
  ]);
});
