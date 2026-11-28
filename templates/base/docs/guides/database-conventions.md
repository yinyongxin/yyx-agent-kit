# 数据库表结构规范

> 适用于 `templates/base` 及所有生成项目。模型定义在 `apps/server/prisma/models/*.prisma`。
> 校验命令：`pnpm schema:check`（已并入 `pnpm build`）。

## 1. 字段标准

### 业务实体表 / 字典表

```prisma
model Order {
  id        String   @id @default(uuid()) @db.Uuid
  // ...业务字段
  createdAt DateTime @default(now()) @db.Timestamptz(3)
  updatedAt DateTime @default(now()) @updatedAt @db.Timestamptz(3)
  // 可选：需要回收站/审计时再加
  // deletedAt DateTime? @db.Timestamptz(3)
}
```

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| `id` | `String @id @default(uuid()) @db.Uuid` | 统一 UUID 主键，不用自增 int |
| `createdAt` | `DateTime @default(now())` | 创建时间，库和 Prisma 都有默认值 |
| `updatedAt` | `DateTime @default(now()) @updatedAt` | 更新时间，Prisma 写入时自动维护 |
| `deletedAt` | `DateTime?` | **仅按需添加**，见第 4 节 |

时间字段一律 `@db.Timestamptz(3)`（带时区，存 UTC）。不要用裸 `DateTime`（PostgreSQL 会映射成不带时区的 `timestamp`）。

### 追加型表（只增不改）

审计日志这类 append-only 表只保留 `createdAt`，不要求 `updatedAt`：

```prisma
model AuditLog {
  id        String   @id @default(uuid()) @db.Uuid
  // ...业务字段
  createdAt DateTime @default(now()) @db.Timestamptz(3)
}
```

- `pnpm schema:check` 用白名单 `APPEND_ONLY_MODELS` 放行（当前只有 `AuditLog`）
- 数据库层用 RLS 禁止 UPDATE / DELETE（不建 policy 即拒绝），保证不可篡改
- 不要用这种表存需要原地更新的业务数据

### 关联表（多对多中间表）

```prisma
model UserRole {
  userId String @db.Uuid
  roleId String @db.Uuid
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  role   Role   @relation(fields: [roleId], references: [id], onDelete: Cascade)

  @@id([userId, roleId])
  @@map("user_roles")
}
```

- **不加 `id`**：联合主键就是业务唯一键，加代理主键只会多一个没人用的列和唯一索引
- 不要求 `updatedAt`；需要审计时加 `createdAt`（示例里的 `UserTenant.joinedAt` 就是这种语义）
- 必须有 `@@id([...])`，防止重复关联

### 1:1 扩展表

用主表主键作自然主键，不另加 `id`：

```prisma
model PlatformAdmin {
  userId    String   @id @db.Uuid
  createdAt DateTime @default(now()) @db.Timestamptz(3)
  updatedAt DateTime @default(now()) @updatedAt @db.Timestamptz(3)
}
```

## 2. 命名

- 模型字段用 camelCase，表名用 `@@map("snake_case")`
- 时间字段只允许 `createdAt` / `updatedAt` / `deletedAt`；**禁止** `createAt` / `updateAt` / `deleteAt`
- 布尔字段用 `isXxx` / `hasXxx`（如 `isSystem`），不要用 `xxxFlag`

## 3. `updatedAt` 的边界

- Prisma 的 `@updatedAt` 只在**通过 Prisma 写入**时生效；`psql`、脚本、其他服务直接改库不会更新
- `@default(now())` 保证绕过 Prisma 插入时也有值
- 如果要求数据库层面的强一致，加 trigger；否则在文档/评审中明确「数据变更必须走 Prisma」

## 4. 软删除（`deletedAt`）

**默认不加**。只有明确需要「回收站 / 可恢复 / 审计」的实体才加，并且必须同时满足：

1. 所有查询过滤 `deletedAt: null`（在 Repository 层统一处理，不靠每个调用方自觉）
2. 唯一索引改成 **partial unique index**，否则删除后无法重建同名
3. 记录 `deletedBy`（谁删的），必要时提供恢复接口
4. 不要用 `deletedAt` 代替业务状态：停用/禁用继续用 `status`（如 `Tenant.status`、`User.status`），两者语义不同

### 已启用：Tenant

`Tenant.slug` 使用 Prisma 7 的 `partialIndexes` preview：

```prisma
generator client {
  previewFeatures = ["partialIndexes"]
}

model Tenant {
  slug      String    @unique(where: raw("\"deletedAt\" IS NULL"))
  deletedAt DateTime? @db.Timestamptz(3)
}
```

生成：

```sql
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug") WHERE ("deletedAt" IS NULL);
```

行为：

- 删除租户 = `update({ deletedAt: new Date() })`，不物理删除
- 列表/详情/成员守卫全部过滤 `deletedAt: null`；软删除后访问返回 404
- slug 可以复用（唯一索引只约束未删除行）
- `findUnique({ slug })` 仍能查到已删除行，**业务查询必须用 `findFirst({ where: { slug, deletedAt: null } })`**
- seed 按固定 id upsert，并 `update: { deletedAt: null }` 恢复默认租户

### 后续候选

- `User`：需要同时改登录查询与 seed，且目前没有用户删除接口，单独评估后再做
- 关联表、日志表、流水表通常**不需要**软删除

## 5. 索引与约束

- 每个租户表的 `tenantId` 必须有索引（`@@index([tenantId])`）
- 业务唯一键用 `@@unique([...])`，注意多租户下要带 `tenantId`
- 外键统一 `onDelete: Cascade`（关联表）或明确 `Restrict`，不要留默认行为不写
- 大表分页字段（如 `createdAt`）按需加组合索引

## 6. 迁移

| 场景 | 命令 |
| --- | --- |
| 改模型后生成迁移 | `pnpm --filter @starter/server db:migrate -- --name <语义名>` |
| 部署 / CI | `pnpm --filter @starter/server db:deploy` |
| 初始数据 | `pnpm --filter @starter/server db:seed` |
| 禁止 | `prisma db push`（仅一次性原型，禁止正式开发/生产） |

- 迁移文件必须 review SQL 后提交；已应用的迁移禁止手改
- 新增非空列要带默认值（如 `DEFAULT CURRENT_TIMESTAMP`），否则已有数据会失败
- 时间字段改类型时确认时区假设（当前统一按 UTC 转换）
- 非交互环境（AI/CI）遇到 `migrate dev` 的数据丢失警告会拒绝执行：用 `prisma migrate diff --from-config-datasource --to-schema prisma --script` 生成 SQL，手写迁移目录后 `migrate deploy`
- 软删除改用 partial unique index 时，迁移会先 `DROP INDEX` 再重建；确认没有重复的活跃值

## 7. 校验

`apps/server/scripts/check-schema.mjs` 会检查：

- 业务模型有 `id`（UUID）、`createdAt`、`updatedAt`
- 关联表有 `@@id(...)`，不强制时间戳
- 所有 `DateTime` 都是 `@db.Timestamptz(3)`
- `createdAt` 有 `@default(now())`，`updatedAt` 有 `@updatedAt`
- 没有 `createAt` / `updateAt` / `deleteAt` 之类的错误命名

执行：

```powershell
pnpm schema:check
```

新增模型如果不符合约定，`pnpm build` 会直接失败。

## 8. 当前模型清单（2026-11-28）

| 模型 | 类别 | id | createdAt | updatedAt |
| --- | --- | --- | --- | --- |
| Tenant / User / Role / Subscription | 业务实体 | UUID | ✅ | ✅ |
| Plan / Permission | 字典 | UUID | ✅ | ✅ |
| OAuthConnection | 业务实体 | UUID | ✅ | ✅ |
| PlatformAdmin | 1:1 扩展 | userId | ✅ | ✅ |
| UserSession | 服务端会话 | SHA-256（非 UUID，官方 SessionStore 约定） | ✅ | ✅ |
| UserTenant / UserRole / RolePermission | 关联表 | 联合主键 | joinedAt / — | — |

软删除：`Tenant.deletedAt` 已启用（slug 可复用）；`User` 暂未启用。
