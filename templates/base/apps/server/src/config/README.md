# config — 配置与启动校验

## 职责

统一管理环境变量：启动时校验、按命名空间暴露、模块内通过 `ConfigService` 读取。禁止在业务代码里直接读 `process.env`。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `config.module.ts` | `AppConfigModule`：`ConfigModule.forRoot({ isGlobal, load, validate })` |
| `configuration.ts` | 命名空间配置：`app` / `database` / `auth` / `dev`（开发导航页端口推导） |
| `env.validation.ts` | 启动时用 class-validator 校验 env（DATABASE_URL 必填、生产必须 JWT_SECRET 等） |

## 使用方式

```ts
constructor(private readonly config: ConfigService) {}

const port = this.config.getOrThrow<number>("app.port");
const dbUrl = this.config.getOrThrow<string>("database.url");
```

- 业务模块不要 import `ConfigModule`（`isGlobal: true`）。
- 新增配置项：在 `configuration.ts` 加字段，并在 `env.validation.ts` 加校验。
- 脚本（`prisma7.config.ts` / `seed.ts` / `scripts/*`）在 Nest 容器外，继续用 dotenv。

## 同步要求

- 新增/改名环境变量时，同步 `.env.example`、`docs/guides/credentials.md` 与本文件。
