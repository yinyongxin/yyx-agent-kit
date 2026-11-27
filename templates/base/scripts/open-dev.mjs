import { exec } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

/**
 * `pnpm dev` 的辅助进程：等 server 起来后自动打开开发导航页。
 * 只用 Node 内置能力，不额外依赖 open/wait-on。
 */
for (let dir = process.cwd(), i = 0; i < 4; i++, dir = resolve(dir, "..")) {
  const candidate = resolve(dir, ".env");
  if (existsSync(candidate)) {
    config({ path: candidate, quiet: true });
    break;
  }
}

const port = Number(process.env.PORT ?? 47100);
const url = `http://localhost:${port}/api/dev`;
const deadline = Date.now() + 90_000;

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

const isUp = async () => {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(1000) });
    return res.ok;
  } catch {
    return false;
  }
};

const openBrowser = (target) => {
  const command =
    process.platform === "win32"
      ? `start "" "${target}"`
      : process.platform === "darwin"
        ? `open "${target}"`
        : `xdg-open "${target}"`;
  exec(command, { windowsHide: true });
};

const main = async () => {
  while (Date.now() < deadline) {
    if (await isUp()) {
      console.log(`开发导航页：${url}`);
      if (process.env.DEV_NO_OPEN !== "1") openBrowser(url);
      return;
    }
    await sleep(1000);
  }
  console.warn(`开发导航页未就绪，可手动打开：${url}`);
};

main();
