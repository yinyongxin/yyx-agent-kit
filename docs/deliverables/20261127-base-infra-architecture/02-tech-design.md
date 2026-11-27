# base 模板基建架构设计（权限 / 日志 / 监控 / 配置 / 客户管理）

> 大需求，本文件是架构总览 + 分阶段拆解；每个阶段的详细 PRD/技术方案在实施前另立 slug。

## 1. 背景与目标

**背景**：`templates/base` 是 CLI 生成项目的基建模板，希望不管谁来用（电商、工具平台、内容站…）生成的业务项目都能「开箱接一套一致的基础能力」：系统日志、监控、配置、用户权限、客户管理。

**现状问题**（基于现有代码审查）：
1. `User` 与 `Tenant` 是一对多（`user.tenantId`），一人无法属于多个租户
2. `Permission` 是全局表（`code` 全局唯一），不同业务的权限码会冲突
3. 角色固定在租户内 `admin/member`，无法自定义/继承
4. 只有功能级 RBAC（`@Can()`），没有数据级权限（「只能看自己的订单」）
5. 日志/监控/配置/客户管理在 schema 里基本为空（只有 health 探活）

**一句话目标**：把 base 改造成「平台层 + 租户层 + 可插拔基建能力」的架构，通过 feature 开关适配不同业务场景。

## 2. 确认的四个核心决策

| 决策 | 结论 |
| --- | --- |
| 用户-租户关系 | **多对多 UserTenant**（每人每租户独立角色/状态） |
| 权限点层级 | **租户内定义 + module 分组**（TenantPermission，租户间不冲突） |
| 数据级权限 | **底座 ABAC + scope 助手**（业务表加 ownerId/departmentId 接入） |
| 基建交付 | **按需 feature 开关**（CLI 生成时选，只迁移启用模块） |

## 3. 分层架构

```
平台层（Platform）
  └─ PlatformAdmin / Tenant 管理 / 全局配置
       │
租户层（Tenant）── 一个客户 / 企业 / 店铺
  ├─ UserTenant（用户-租户关联，带该租户内状态与角色）
  ├─ TenantPermission（租户内权限点，module 分组）
  ├─ Role（租户内自定义角色，可继承）
  ├─ Customer / CustomerContact（客户管理）
  ├─ Setting（租户级配置）
  └─ AuditLog（操作日志）
       │
业务层（由使用方扩展）
  └─ Order / Product / Ticket …（带 ownerId/departmentId 接入数据权限）
```

## 4. 数据模型（核心表）

### 4.1 身份与租户

- `Tenant`（已有，扩展）：slug / name / status / **settings JSON**（租户级开关）
- `User`（改造）：去掉 `tenantId`，保留 authSubject / email / displayName / status
- `UserTenant`（新增）：userId + tenantId + status + joinedAt，多对多关联
- `PlatformAdmin`（新增）：userId + level（super/ops），平台运营方

### 4.2 权限（RBAC + ABAC）

- `TenantPermission`（替代全局 Permission）：tenantId + code + module + name；`@@unique([tenantId, module, code])`
- `Role`（改造）：tenantId + code + name + **parentId**（自关联，角色继承）+ isSystem
- `UserRole`（保留）：userId + roleId，但 roleId 必属用户所在租户
- `RolePermission`（保留）
- **ABAC policy 接口**：`can(user, action, resource?)` + `scope(query, user)`，业务实现 policy，底座装配
- 业务表接入约定：带 `ownerId` / `departmentId` 字段（可选），scope 助手据此过滤

### 4.3 通用基建能力

- `AuditLog`：tenantId + actorId + action + target + metadata JSON + createdAt；`@Audit()` 装饰器自动记录
- `Setting`：tenantId + key + value JSON，租户级配置，底座提供缓存读写
- `Customer` / `CustomerContact`：tenantId + 通用字段 + metadata JSON（业务自定义属性）
- `Notification`：tenantId + userId + type + payload JSON + readAt
- 监控：health（已有）+ metrics 端点（Prometheus 风格），不建表

## 5. Feature 开关设计

CLI 生成时：
```
yyx-new my-shop --features=auth,rbac,audit,config,customer,notification
yyx-new my-tools --features=auth,tenant,setting
```

- 每个 feature 对应：一组 Prisma model 文件（`prisma/models/<feature>.prisma`）+ 一个 NestJS module + seed 片段
- 底座默认开 `auth,tenant,rbac`（最小骨架），其余按需
- feature 组合的迁移：CLI 按选择组装 schema 主文件的 enum + models 目录，生成初始迁移

## 6. 分阶段实施计划

| 阶段 | slug | 内容 | 依赖 |
| --- | --- | --- | --- |
| P0 | `base-infra-identity` | User/Tenant 多对多改造 + UserTenant + 迁移策略 | 无 |
| P1 | `base-infra-rbac` | TenantPermission + Role 继承 + policy 接口改造 | P0 |
| P2 | `base-infra-abac` | ABAC policy + scope 助手 + 业务表接入约定 | P1 |
| P3 | `base-infra-audit` | AuditLog + @Audit 装饰器 | P0 |
| P4 | `base-infra-config` | Setting 表 + 缓存读写 | P0 |
| P5 | `base-infra-customer` | Customer / CustomerContact | P0 |
| P6 | `base-infra-notification` | Notification + 渠道策略 | P0 |
| P7 | `base-infra-cli-features` | CLI feature 开关 + 迁移组装 | P0~P6 |

每阶段按五阶段流水线（PRD 三件套 → 技术方案 → 开发 → QA → 归档）独立推进。

## 7. 风险与取舍

- **P0 是多对多改造，影响面最大**：现有 User/Tenant 一对多已落地 seed 和 policy，改造要同步这些；且 prisma migrate 从一对一到多对多需要数据迁移（老数据的 tenantId 迁移到 UserTenant）
- **ABAC 的 scope 助手要兼顾 Prisma extension 的 tenantId 注入**：两套过滤叠加，避免互相覆盖
- **feature 开关的组合测试**：CLI 生成不同组合都要能 build/health，需脚本化验证
- **不要把基建做成「大而全」**：metadata JSON + 精简核心表是关键，避免为了适配所有业务把表设计得过于复杂

## 8. 已确认决策（进入 P0 前）

| 问题 | 结论 |
| --- | --- |
| Tenant 与 Customer 关系 | **分开**——Tenant 是使用系统的甲方账号/企业（电商场景=店铺），Customer 是甲方服务的终端客户（电商场景=买家）。适配性最强 |
| 平台管理员身份 | **User + 平台角色标记**——平台管理员也是 User，用 `PlatformAdmin` 表（userId + level）标记，共用一套认证，不建独立登录 |
| 现有 seed 数据迁移 | **重建库**——base 是模板、无真实用户数据，P0 改造直接重写初始迁移 + seed，不写数据迁移脚本 |

### 对数据模型的影响

- `Customer` 独立成表（tenantId + 通用字段 + metadata JSON），不与 Tenant 合并
- `PlatformAdmin`（userId + level: super/ops + createdAt）作为平台层表，全局表不注入 tenantId
- P0 可以直接删旧迁移重建，不必兼容一对多旧数据
