export interface PublishCommandConfig {
  readonly access: string;
  readonly tag: string;
  readonly provenance: boolean;
  readonly dryRun: boolean;
}

/** The directory remains stable while the publish step temporarily changes the package name. */
export const SERVER_WORKSPACE_FILTER = "./apps/server";

export function createVpPmPublishArgs(config: PublishCommandConfig): ReadonlyArray<string> {
  const args = [
    "publish",
    "--filter",
    SERVER_WORKSPACE_FILTER,
    "--access",
    config.access,
    "--tag",
    config.tag,
    "--no-git-checks",
  ];

  if (config.provenance) args.push("--provenance");
  if (config.dryRun) args.push("--dry-run");

  return args;
}
