# auth/sessions

## 职责

官方 `@nestjs/authentication` 的 `SessionStore` 实现（PostgreSQL）。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `prisma-session.store.ts` | `PrismaSessionStore`：会话 CRUD、滑动更新、按用户清理 |

## 说明

- `SessionRecord.id` 是 SessionService 生成的 SHA-256（不是 uuid）
- `metadata` 存 IP / User-Agent，供 `/me/sessions` 展示
- `touchSession` 使用条件更新，避免把已删除会话写回
- 构造函数里 `AuthenticationStorage.registerSource({ sessions: this })`
- 数据表：`user_sessions`（迁移 `20261128134845_user_sessions`）
