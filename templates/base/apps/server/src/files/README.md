# files

## 职责

租户文件上传、列表、下载、删除。元数据存 PostgreSQL（`files`，RLS 隔离），内容通过 `FileStorage` 接口保存，默认本地磁盘。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `files.module.ts` | 模块装配；绑定 `FILE_STORAGE` → `LocalFileStorage` |
| `files.controller.ts` | `/t/:tenantId/files` 列表 / 上传 / 下载 / 删除 |
| `files.service.ts` | 校验（大小、类型、空文件）、生成 storage key、校验和、存储回收 |
| `files.types.ts` | `UploadFile`：multer memory storage 的最小形状 |
| `dto/` | 查询与响应 DTO |
| `repositories/files.repository.ts` | Prisma 分页、类型筛选、按租户查询 |
| `storage/` | 存储抽象与本地磁盘驱动 |

## 接口

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/t/:tenantId/files` | `file:read` | 分页 + 文件名搜索 + `category=image/document/other` |
| POST | `/t/:tenantId/files` | `file:write` | multipart，字段名 `file`；30 次/分钟 |
| GET | `/t/:tenantId/files/:id/content` | `file:read` | 下载；强制 `attachment` + `nosniff` |
| DELETE | `/t/:tenantId/files/:id` | `file:write` | 删除元数据与存储内容 |

## 约束

- 所有查询走 `@TenantTx()`，`files` 已启用 RLS；不要用 `prisma.scoped` 查该表
- storage key 只由服务端生成（`tenantId/年/月/uuid`），不拼接用户文件名
- 默认允许图片、PDF、文本、Office、ZIP；拒绝 HTML / SVG，避免存储型 XSS
- 单文件上限由 `FILES_MAX_SIZE_MB` 控制（默认 20），目录由 `FILES_DIR` 控制
- 上传元数据失败时会回收刚写入的内容；删除时存储清理失败只记 warn，不阻塞接口

## 同步要求

- 新增 MIME 类型：同步 `files.service.ts` 的 `ALLOWED_MIME_TYPES` 与管理端上传 `accept`
- 新增分类：同步 `dto/query-files.dto.ts`、`repositories/files.repository.ts` 与管理端筛选项
- 改接口 / DTO 后运行 `pnpm api:generate`，并更新 `test/files-e2e.mjs`
