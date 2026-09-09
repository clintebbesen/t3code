import * as NodeChildProcess from "node:child_process";
import * as NodeFS from "node:fs";
import * as NodePath from "node:path";

// The shared policy hook passes the actual pushed base and checkout revision.
// CI owns full verification. This command checks changed code with T3's own tools.
const [base, head] = process.argv.slice(2);
if (!base || !head || !/^[a-f0-9]{40,64}$/.test(base) || !/^[a-f0-9]{40,64}$/.test(head)) {
  throw new Error("Usage: prepush:check <base commit SHA> <HEAD commit SHA>");
}
const root = process.cwd();
const vp = NodePath.join(root, "node_modules/.bin/vp");
const changed = NodeChildProcess.execFileSync(
  "git",
  ["diff", "--name-only", "-z", "--diff-filter=ACMR", base, head],
  { encoding: "utf8" },
)
  .split("\0")
  .filter(Boolean);
const code = changed.filter((file) => /\.(?:[cm]?[jt]s|[jt]sx)$/.test(file));
const tests = code.filter((file) => /\.(?:test|spec)\.[cm]?[jt]sx?$/.test(file));
const packages = new Set();
for (const file of code.filter((file) => /\.(?:[cm]?ts|tsx)$/.test(file))) {
  let directory = NodePath.dirname(NodePath.resolve(root, file));
  while (!NodeFS.existsSync(NodePath.join(directory, "package.json")) && directory !== root) {
    directory = NodePath.dirname(directory);
  }
  const packageJson = JSON.parse(
    NodeFS.readFileSync(NodePath.join(directory, "package.json"), "utf8"),
  );
  if (directory === root) {
    throw new Error(`A root TypeScript change needs an explicit focused typecheck owner: ${file}`);
  }
  if (!packageJson.name || !packageJson.scripts?.typecheck) {
    throw new Error(`No package typecheck command owns ${file}`);
  }
  packages.add(packageJson.name);
}
function run(args) {
  const result = NodeChildProcess.spawnSync(vp, args, { cwd: root, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (code.length) run(["lint", "--report-unused-disable-directives", ...code]);
for (const name of packages) run(["run", "--filter", name, "typecheck"]);
if (tests.length) run(["test", "run", ...tests]);
