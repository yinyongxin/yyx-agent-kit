#!/usr/bin/env node
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TEMPLATE = join(PKG_ROOT, 'templates', 'base');
const VERSION = JSON.parse(readFileSync(join(PKG_ROOT, 'package.json'), 'utf8')).version;

const HELP = `yyx-new — 从 yyx-agent-kit 模板创建新项目

用法:
  yyx-new <项目名> [选项]

选项:
  -p, --path <目录>       生成到哪个目录（默认当前目录）
      --port-base <数字>  端口基址，client/admin/portal/server = +73/+74/+75/+00（默认 47100）
  -f, --force             目标目录已存在时覆盖
  -h, --help              显示帮助
  -v, --version           显示版本

示例:
  yyx-new myapp -p D:\\projects
  yyx-new myapp -p D:\\projects --port-base 48100
`;

function parseArgs(argv) {
  const opts = { path: null, portBase: 47100, force: false };
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') return { help: true };
    if (a === '-v' || a === '--version') return { version: true };
    if (a === '-f' || a === '--force') { opts.force = true; continue; }
    if (a === '-p' || a === '--path') {
      if (!argv[i + 1]) throw new Error(`${a} 缺少目录参数`);
      opts.path = argv[++i];
      continue;
    }
    if (a === '--port-base') {
      const v = Number(argv[++i]);
      if (!Number.isInteger(v) || v < 1 || v > 65535) throw new Error('--port-base 必须是有效端口号');
      opts.portBase = v;
      continue;
    }
    if (a.startsWith('-')) throw new Error(`未知选项: ${a}`);
    pos.push(a);
  }
  if (!pos[0]) throw new Error('缺少项目名');
  opts.name = pos[0];
  return opts;
}

function walk(dir, cb) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) walk(p, cb);
    else if (entry.isFile()) cb(p);
  }
}

function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`错误: ${err.message}`);
    process.exit(1);
  }
  if (opts.help) { process.stdout.write(HELP); return; }
  if (opts.version) { console.log(VERSION); return; }

  const { name, portBase, force } = opts;
  if (!/^[a-z0-9][a-z0-9-_]*$/.test(name)) {
    console.error('错误: 项目名只能包含小写字母、数字、- 和 _，且以字母或数字开头');
    process.exit(1);
  }

  const parent = opts.path ? resolve(opts.path) : process.cwd();
  const target = join(parent, name);
  if (existsSync(target)) {
    if (!force) {
      console.error(`错误: 目标目录已存在: ${target}（加 --force 覆盖）`);
      process.exit(1);
    }
    rmSync(target, { recursive: true, force: true });
  }
  mkdirSync(parent, { recursive: true });

  // 复制模板
  cpSync(TEMPLATE, target, { recursive: true });

  const oldAgentSection = [
    '## 同步 agent',
    '',
    '仓库 `agents/` 改动后（注意 `-ConfigDir` 指向本项目的 `.opencode`）：',
    '',
    '```powershell',
    'pwsh -NoProfile -File ..\\..\\scripts\\sync.ps1 -ConfigDir .opencode',
    '```',
    '',
    '在 OpenCode 里 `/reload`。模板里的 `.opencode/agents/` 是仓库 agents 的快照，别手改，改了会被覆盖。',
  ].join('\n');
  const newAgentSection = [
    '## agents',
    '',
    '`.opencode/agents/` 由 CLI 生成时写入，是 kit 仓库 agents 的快照，不要手改。',
  ].join('\n');

  const replacements = [
    [TEMPLATE.replace(/\\/g, '/'), target.replace(/\\/g, '/')],
    ['`yyx-agent-kit` 的项目模板，也是 CLI 生成新项目的复制源。', '由 `yyx-agent-kit` 生成的项目，已接入交付流水线。'],
    ['**必须在 `templates/base` 目录打开 OpenCode**，不要打开仓库根目录。原因：`.opencode/opencode.json` 里的 `skills` 是相对路径 `../../skills`，按工作目录解析。', '在项目根目录打开 OpenCode。`.opencode/skills/` 随项目生成，`.opencode/opencode.json` 的 `skills` 指向它，项目自包含。'],
    ['clone 到其他机器后路径不同也没关系，相对路径会跟着走。', '项目自包含，换机器后直接打开即可。'],
    [oldAgentSection, newAgentSection],
    ['starter', name],
    ['47173', String(portBase + 73)],
    ['47174', String(portBase + 74)],
    ['47175', String(portBase + 75)],
    ['47100', String(portBase)],
  ];

  let changed = 0;
  walk(target, (file) => {
    const content = readFileSync(file, 'utf8');
    const nl = content.includes('\r\n') ? '\r\n' : '\n';
    let next = content;
    for (const [from, to] of replacements) {
      const f = from.includes('\n') ? from.split('\n').join(nl) : from;
      const t = to.includes('\n') ? to.split('\n').join(nl) : to;
      next = next.split(f).join(t);
    }
    if (next !== content) {
      writeFileSync(file, next, 'utf8');
      changed++;
    }
  });

  // 包内 skills/agents 复制进项目，使生成项目不依赖 CLI 的安装位置（pnpm dlx 也可用）
  cpSync(join(PKG_ROOT, 'skills'), join(target, '.opencode', 'skills'), { recursive: true });
  cpSync(join(PKG_ROOT, 'agents'), join(target, '.opencode', 'agents'), { recursive: true });

  const opencodePath = join(target, '.opencode', 'opencode.json');
  const opencode = readFileSync(opencodePath, 'utf8');
  writeFileSync(opencodePath, opencode.split('"../../skills"').join('".opencode/skills"'), 'utf8');

  console.log(`\n==> 已生成项目: ${target}`);
  console.log(`==> ${changed} 个文件内容已更新，skills 与 agents 已内置`);
  console.log('\n下一步:');
  console.log(`  cd ${target}`);
  console.log('  pnpm install');
  console.log('  opencode\n');
}

main();
