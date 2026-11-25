# 文档地图

`docs/` 里的内容分四类，按目的找，不用从头翻：

| 你想做什么 | 去哪 | 说明 |
| --- | --- | --- |
| 搞懂这套 agent / skill 系统 | [guides/agent-system.md](guides/agent-system.md) | **建议先读这份**：角色、五阶段门禁、10 个 skill、文件流转、同步机制 |
| 写需求、推进交付、查进度 | [INDEX.md](INDEX.md) | 所有需求的索引；交付物在 `docs/<slug>/` 里 |
| 查工作约定和硬规则 | [guides/conventions.md](guides/conventions.md) | 一手来源、脚手架、模板同步、迁移、命名等跨需求规则 |
| 查环境问题与解法 | [guides/pitfalls.md](guides/pitfalls.md) | 踩过的坑，按「现象 / 原因 / 解决」记录 |
| 查本地默认凭据与生产必改项 | [guides/credentials.md](guides/credentials.md) | 仅 dev 默认账号密码，生产必改清单 |
| 查版本变更 | [CHANGELOG.md](CHANGELOG.md) | 按 Unreleased / 版本号记录 |
| 查官方脚手架基线 | [reference/scaffolds/README.md](reference/scaffolds/README.md) | Vite / NestJS / Next.js 官网实测版本与配置对照 |

## 目录约定

```text
docs/
├── README.md              本文：文档地图
├── INDEX.md               需求索引（阶段 5 归档时更新）
├── CHANGELOG.md           版本变更记录
├── guides/                常设制度与说明（人读的）
│   ├── agent-system.md
│   ├── conventions.md
│   ├── pitfalls.md
│   └── credentials.md
├── reference/             查资料用的一手基线
│   └── scaffolds/         官方脚手架原样配置
└── <slug>/                需求交付物，目录名 YYYYMMDD-kebab-case
    └── 01-prd.md / 01-wireframe.md / 01-interaction.md / 02-tech-design.md / 03-dev-log.md / 04-*.md / 05-record.md
```

- **需求交付物固定放 `docs/<slug>/`**，这是流水线的硬约定（`product-pipeline` / `prd` / `archive` skill 都按这个路径找文件），不要挪进子目录。
- **常设文档放 `guides/`**，改完要同步更新引用它的 skills / agents / README。
- **参考资料放 `reference/`**，官方脚手架配置保持原样，便于升级时对照。
- 每道门禁通过后即可往 `INDEX.md` 追加一条，中文记录，不覆盖旧条目。
