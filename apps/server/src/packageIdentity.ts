import packageJson from "../package.json" with { type: "json" };

export interface GitHubReleaseDistribution {
  readonly repository: string;
  readonly exactTagPrefix: string;
  readonly latestTag: string;
  readonly assetName: string;
}

export interface CliDistribution {
  readonly packageName: string;
  readonly githubRelease?: GitHubReleaseDistribution;
}

/** The package distribution embedded in a built CLI. */
declare const __T3CODE_BUILD_DISTRIBUTION__: CliDistribution | undefined;

const packageDistribution: CliDistribution = {
  packageName: packageJson.t3code?.distributionPackage || packageJson.name,
  ...(packageJson.t3code?.githubRelease === undefined
    ? {}
    : { githubRelease: packageJson.t3code.githubRelease }),
};

export const CLI_DISTRIBUTION =
  typeof __T3CODE_BUILD_DISTRIBUTION__ === "undefined"
    ? packageDistribution
    : __T3CODE_BUILD_DISTRIBUTION__;

export const CLI_PACKAGE_NAME = CLI_DISTRIBUTION.packageName;

/** Package names become path segments below node_modules (including scopes). */
export function packageNamePathSegments(packageName: string): ReadonlyArray<string> {
  return packageName.split("/");
}

export const CLI_PACKAGE_PATH_SEGMENTS = packageNamePathSegments(CLI_PACKAGE_NAME);

export function cliPackageLabel(
  version: string,
  distribution: CliDistribution = CLI_DISTRIBUTION,
): string {
  return `${distribution.packageName}@${version}`;
}

function githubReleaseAssetUrl(release: GitHubReleaseDistribution, tag: string): string {
  return `https://github.com/${release.repository}/releases/download/${encodeURIComponent(tag)}/${encodeURIComponent(release.assetName)}`;
}

export function cliInstallSpec(
  version: string,
  distribution: CliDistribution = CLI_DISTRIBUTION,
): string {
  const release = distribution.githubRelease;
  return release === undefined
    ? cliPackageLabel(version, distribution)
    : githubReleaseAssetUrl(release, `${release.exactTagPrefix}${version}`);
}

export function cliLatestInstallSpec(distribution: CliDistribution = CLI_DISTRIBUTION): string {
  const release = distribution.githubRelease;
  return release === undefined
    ? cliPackageLabel("latest", distribution)
    : githubReleaseAssetUrl(release, release.latestTag);
}

export function cliNpxCommand(
  version: string,
  subcommand?: string,
  distribution: CliDistribution = CLI_DISTRIBUTION,
): string {
  const installSpec =
    version === "latest"
      ? cliLatestInstallSpec(distribution)
      : cliInstallSpec(version, distribution);
  if (distribution.githubRelease !== undefined) {
    return `npx -y --prefer-online --package=${installSpec} -- t3${subcommand === undefined ? "" : ` ${subcommand}`}`;
  }
  return `npx -y ${installSpec}${subcommand === undefined ? "" : ` ${subcommand}`}`;
}
