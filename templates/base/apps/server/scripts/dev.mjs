/**
 * 开发模式：tsc watch + tsc-alias watch + node --watch。
 *
 * server 用 `@/` 别名，tsc 编译后不会重写路径，所以由 tsc-alias 监听 dist 实时重写，
 * 再由 node --watch 在产物变化时重启。不要用 `nest start --watch`（不会跑 tsc-alias）。
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(root, "package.json"));

const tscBin = require.resolve("typescript/bin/tsc");
const aliasPkgPath = require.resolve("tsc-alias/package.json");
const aliasPkg = JSON.parse(readFileSync(aliasPkgPath, "utf8"));
const aliasBin = join(dirname(aliasPkgPath), aliasPkg.bin["tsc-alias"]);

const commands = [
  ["tsc", [tscBin, "-p", "tsconfig.json", "-w", "--preserveWatchOutput"]],
  ["alias", [aliasBin, "-p", "tsconfig.json", "-w"]],
  ["run", ["--watch", "dist/apps/server/src/main.js"]],
];

const children = commands.map(([name, args]) => {
  const child = spawn(process.execPath, args, { cwd: root, stdio: "inherit" });
  child.on("error", (error) => console.error(`[${name}] ${error.message}`));
  return child;
});

let stopping = false;
const stop = (code) => {
  if (stopping) return;
  stopping = true;
  children.forEach((child) => child.kill());
  setTimeout(() => process.exit(code), 200);
};

children.forEach((child) => child.on("exit", (code) => stop(code ?? 0)));
process.on("SIGINT", () => stop(0));
process.on("SIGTERM", () => stop(0));
