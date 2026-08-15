import packageJson from "../package.json" with { type: "json" };

/** The npm package name embedded in a published CLI build. */
declare const __T3CODE_BUILD_PACKAGE_NAME__: string | undefined;

const configuredPackageName =
  typeof __T3CODE_BUILD_PACKAGE_NAME__ === "undefined"
    ? undefined
    : __T3CODE_BUILD_PACKAGE_NAME__.trim();

export const CLI_PACKAGE_NAME =
  configuredPackageName || packageJson.t3code?.distributionPackage || packageJson.name;

/** Package names become path segments below node_modules (including scopes). */
export function packageNamePathSegments(packageName: string): ReadonlyArray<string> {
  return packageName.split("/");
}

export const CLI_PACKAGE_PATH_SEGMENTS = packageNamePathSegments(CLI_PACKAGE_NAME);

export function cliPackageSpec(version: string, packageName = CLI_PACKAGE_NAME): string {
  return `${packageName}@${version}`;
}
