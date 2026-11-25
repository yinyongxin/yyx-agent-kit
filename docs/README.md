# 文档地图

`docs/` 里的内容分三类，按目的找，不用从头翻。**全仓库只用 `README.md` 作为目录说明文件。**

| 你想做什么 | 去哪 | 说明 |
| --- | --- | --- |
| 搞懂这套 agent / skill 系统 | [guides/agent-system.md](guides/agent-system.md) | **建议先读这份**：角色、五阶段门禁、10 个 skill、文件流转、同步机制 |
| 写需求、推进交付、查进度 | [本文「需求索引」](#需求索引) | 各需求的实际进度与交付物入口；交付物在 `docs/deliverables/<slug>/` |
| 查工作约定和硬规则 | [guides/conventions.md](guides/conventions.md) | 一手来源、脚手架、模板同步、迁移、命名等跨需求规则 |
| 查环境问题与解法 | [guides/pitfalls.md](guides/pitfalls.md) | 踩过的坑，按「现象 / 原因 / 解决」记录 |
| 查本地默认凭据与生产必改项 | [guides/credentials.md](guides/credentials.md) | 仅 dev 默认账号密码，生产必改清单 |
| 查版本变更 | [CHANGELOG.md](CHANGELOG.md) | 按 Unreleased / 版本号记录 |
| 查官方脚手架基线 | [reference/scaffolds/README.md](reference/scaffolds/README.md) | Vite / NestJS / Next.js 官网实测版本与配置对照 |

## 目录约定

```text
docs/
├── README.md              本文：文档地图 + 需求索引（唯一入口文件）
├── CHANGELOG.md           版本变更记录
├── guides/                常设制度与说明（人读的）
│   ├── agent-system.md
│   ├── conventions.md
│   ├── pitfalls.md
│   └── credentials.md
├── reference/             查资料用的一手基线
│   └── scaffolds/         官方脚手架原样配置
└── deliverables/          需求交付物（统一收敛在这里）
    └── <slug>/            目录名 YYYYMMDD-kebab-case
        └── 01-prd.md / 01-wireframe.md / 01-interaction.md / 02-tech-design.md / 03-dev-log.md / 04-*.md / 05-record.md
```

- **每个目录用 `README.md` 说明职责、文件索引、关联和同步要求**；agent 进目录先读它筛选文件，再读具体内容，结论以具体文件为准（见 `guides/conventions.md` 第 9 节）。
- **需求交付物固定放 `docs/deliverables/<slug>/`**，这是流水线的硬约定（`product-pipeline` / `prd` / `archive` skill 都按这个路径找文件）；slug 目录下不要再套子目录。
- **常设文档放 `guides/`**，改完要同步更新引用它的 skills / agents / README。
- **参考资料放 `reference/`**，官方脚手架配置保持原样，便于升级时对照。
- 每道门禁通过后，往本文「需求索引」追加一条，中文记录，不覆盖旧条目。

## 需求索引

按 `docs/deliverables/<slug>/` 里的实际文件判断进度（不靠记忆）；每道门禁通过后追加一条，不覆盖旧条目。
状态口径：未归档的需求即使报告「通过」也标「未归档」。

| 需求 | 状态 | 更新日期 | 入口 |
| --- | --- | --- | --- |
| 20261124-admin-mantine | 阶段 4 通过（未归档） | 2026-11-24 | [04-test-report.md](deliverables/20261124-admin-mantine/04-test-report.md) |
| 20261124-admin-router | 阶段 3 完成（未测试） | 2026-11-24 | [03-dev-log.md](deliverables/20261124-admin-router/03-dev-log.md) |
| 20261124-db-migration | 阶段 3 完成（未测试） | 2026-11-24 | [03-dev-log.md](deliverables/20261124-db-migration/03-dev-log.md) |
| 20261124-mantine-ui-mcp | 阶段 3 完成（阶段 1+2 合并，未测试） | 2026-11-24 | [03-dev-log.md](deliverables/20261124-mantine-ui-mcp/03-dev-log.md) |
| 20261124-prisma7-upgrade | 阶段 3 完成（阶段 1+2 合并，未测试） | 2026-11-24 | [03-dev-log.md](deliverables/20261124-prisma7-upgrade/03-dev-log.md) |

### 说明

- 这 5 个历史需求都还没有 `05-record.md`，流水线阶段 5 尚未走完。
- 历史目录里也没有 `01-wireframe.md` / `01-interaction.md`——三件套是后来加入的规则（见 [CHANGELOG](CHANGELOG.md) 的 Unreleased），不必回头补。
- 新需求按 [guides/agent-system.md](guides/agent-system.md) 的五阶段推进，slug 形如 `YYYYMMDD-kebab-case`。
- 流水线阶段 5 更新本节的表格。
