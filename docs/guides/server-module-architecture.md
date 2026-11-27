# Server 模块与接口规范

> 适用范围：`templates/base/apps/server`。
> 目标：新增业务模块时，不需要再讨论「文件放哪」；接口、DTO、错误、契约都有唯一写法。

## 1. 目录模板

```text
apps/server/
├── src/
│   ├── main.ts                 # 启动：dotenv → NestFactory → 全局管道/前缀 → Swagger → listen
│   ├── app.module.ts           # 根模块：装配基础设施模块、注册全局 middleware
│   ├── app.controller.ts       # 仅 health 等应用级端点
│   ├── app.service.ts
│   ├── swagger.ts              # buildOpenApiDocument（main 与导出脚本共用）
│   ├── dto/                    # 跨模块共享 DTO（目前只有 health）
│   ├── common/                 # 跨模块共享的 Nest 构件（无业务语义）
│   │   ├── decorators/
│   │   ├── filters/
│   │   ├── guards/
│   │   ├── interceptors/
│   │   ├── middleware/
│   │   └── pipes/
│   ├── prisma/                 # 数据访问基础设施
│   │   ├── prisma.module.ts
│   │   ├── prisma.service.ts
│   │   └── README.md
│   ├── auth/                   # 领域模块：认证与授权
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts  # /api/auth/*
│   │   ├── me.controller.ts    # /api/me/*（当前用户资源）
│   │   ├── credentials.service.ts
│   │   ├── dto/
│   │   ├── guards/
│   │   ├── middleware/
│   │   ├── decorators/
│   │   ├── providers/
│   │   └── README.md
│   └── <feature>/              # 业务模块（users / orders / ...）
│       ├── <feature>.module.ts
│       ├── <feature>.controller.ts
│       ├── <feature>.service.ts
│       ├── dto/
│       │   ├── create-<feature>.dto.ts
│       │   ├── update-<feature>.dto.ts
│       │   ├── query-<feature>.dto.ts
│       │   └── <feature>-response.dto.ts
│       ├── repositories/
│       └── README.md
├── prisma/                     # schema + models + migrations + seed
├── scripts/                    # 一次性脚本（export-openapi.ts 等）
├── test/                       # 接口/DB 验收脚本
└── README.md
```

规则：

- **一个业务领域一个模块目录**，目录名用复数 kebab-case（`users/`、`audit-logs/`）。存量 `auth/`、`tenancy/` 为单数，保留不改。
- **一个模块可以有多个 controller**，按路由前缀/资源划分（Nest 一个 controller 只能绑一个 `@Controller()` 前缀）。例如 `auth/` 下：`auth.controller.ts` 管 `/auth/*`（登录动作），`me.controller.ts` 管 `/me/*`（当前用户资源）。不要为了「一模块一 controller」把不同前缀硬塞进同一个类。
- `/me/*` 属于「当前用户」资源：暂放 `auth/`（与身份强相关）；出现独立 `users/` 模块后，迁到 `users/me.controller.ts`。
- **类型/工具文件**：少量（≤3 个）时用 `*.types.ts` / `*.util.ts` 放模块根；同类文件超过 3 个、或需要跨模块复用时，再建 `types/` / `utils/`。不要为 1–2 个文件提前建目录。
- **已定义的构件目录**（`dto/`、`repositories/`、`providers/`、`guards/`、`middleware/`、`decorators/`、`interceptors/`）只要有 1 个文件就按目录放置，与上面的「阈值」规则不同。
- **每个目录必须有 `README.md`**（职责 / 文件索引 / 关联 / 同步要求）。
- `src/generated/`（Prisma Client）是生成物，禁止手改、不提交。
- `dist/` 是构建产物，不提交。

## 2. 构件放置

| 构件 | 放哪 | 说明 |
| --- | --- | --- |
| Controller | `<feature>/<feature>.controller.ts` | 只做参数校验、路由转发；不写业务逻辑、不写 `res.json()` |
| Provider / Service | `<feature>/<feature>.service.ts` | 业务逻辑；依赖 Repository / Prisma |
| Module | `<feature>/<feature>.module.ts` | 声明 controller / providers / exports；根模块只 `imports` |
| Repository | `<feature>/repositories/` | 数据访问；方法签名接收 `tx: Prisma.TransactionClient`（由 Controller 的 `@TenantTx()` 传入），全局表用 `prisma.scoped` |
| Middleware | 全局：`common/middleware/`；局部：`<feature>/middleware/` | 只做请求预处理（解析上下文、写 header），不做授权判断 |
| Exception Filter | 全局：`common/filters/`；局部：`<feature>/filters/` | 统一错误响应格式；业务错误抛 `HttpException` 子类 |
| Pipe | 全局：`common/pipes/`；局部：`<feature>/pipes/` | 转换/校验；全局 `ValidationPipe` 已在 `main.ts` 注册 |
| Guard | 全局：`common/guards/`；局部：`<feature>/guards/` | 认证/授权；租户路由必须挂 `TenantMembershipGuard` |
| Interceptor | 全局：`common/interceptors/`；局部：`<feature>/interceptors/` | 横切逻辑（响应包装、日志、事务）；租户路由必须挂 `TenantTransactionInterceptor` |
| 自定义装饰器 | 全局：`common/decorators/`；局部：`<feature>/decorators/` | 只做元数据/参数提取；业务语义装饰器放模块内 |
| DTO（入参/出参） | `<feature>/dto/` | 跨模块复用的放 `src/dto/` |
| 常量/类型（跨端） | `packages/shared` | 前后端共用的路由、常量、类型 |
| 常量/类型（仅后端） | `<feature>/*.types.ts` | 不跨端复用的领域类型 |

原则：**能放模块内就不放全局**。全局构件必须与业务无关，且被多个模块使用。

### 2.1 注册方式

| 构件 | 全局生效 | 局部生效 |
| --- | --- | --- |
| Middleware | `AppModule.configure()` 里 `consumer.apply(X).forRoutes(...)` | 模块的 `configure()`；或只对特定路由 `forRoutes` |
| Exception Filter | `app.useGlobalFilters(new X())` 或 `APP_FILTER` provider | `@UseFilters(X)`（控制器/方法） |
| Pipe | `app.useGlobalPipes(new ValidationPipe(...))`（已在 `main.ts`） | `@UsePipes(X)`；参数级 `@Param("id", ParseUUIDPipe)` |
| Guard | `APP_GUARD` provider（官方认证/授权包已全局注册） | `@UseGuards(X)`（控制器/方法） |
| Interceptor | `app.useGlobalInterceptors` 或 `APP_INTERCEPTOR` | `@UseInterceptors(X)`（控制器/方法） |
| 自定义装饰器 | 无需注册 | 参数装饰器由 Nest 解析；元数据装饰器由 `Reflector` 读取 |

注意：

- 全局构件的注册点只在 `main.ts`（`useGlobal*`）或 `app.module.ts`（`APP_*` provider），不要散落到各模块。
- 管道顺序：全局 `ValidationPipe` 先跑；参数级 pipe 只做类型转换（如 `ParseUUIDPipe`）。
- 守卫顺序：全局认证 → 全局授权 → 路由级守卫；`tenantId` 由 `TenantMembershipGuard` 校验，不要再用 `ParseUUIDPipe` 期待 400。

### 2.2 配置

- 统一用 `@nestjs/config`（`src/config/`）：`AppConfigModule` 里 `ConfigModule.forRoot({ isGlobal: true, load, validate })`。
- 业务代码通过 `ConfigService.get/getOrThrow` 读取命名空间配置（`app` / `database` / `auth`），**禁止直接读 `process.env`**。
- 启动时校验：`env.validation.ts` 用 class-validator 检查必填/格式（如 `DATABASE_URL` 必填、生产必须 `JWT_SECRET`），缺失直接启动失败。
- 新增配置项：先在 `configuration.ts` 加字段，再在 `env.validation.ts` 加校验，并同步 `.env.example`。
- Prisma CLI / seed / scripts 在 Nest 容器外，继续用 dotenv，不能注入 `ConfigService`。

## 3. 接口设计规范

### 3.1 路由

- 统一前缀 `/api`（`API_PREFIX`，来自 `@starter/shared`）。
- 资源用**复数 + kebab-case**：`/api/users`、`/api/audit-logs`。
- **资源分两级**：
  - **平台级** `/api/tenants`、`/api/platform/*`：只允许 `PlatformAdminGuard`（平台管理员）。
  - **租户级** `/api/t/:tenantId/...`：必须挂 `TenantMembershipGuard` + `TenantTransactionInterceptor`。
  - 租户**本身**的 CRUD 属于平台级，不要写进 `/t/:tenantId/...`。
- 非资源动作才用动词：`POST /api/auth/sign-in`、`POST /api/users/:id/disable`。
- 关联资源用嵌套：`/api/users/:id/roles`。
- **路由常量**：新增接口先在 `packages/shared` 的 `API_ROUTES` 加常量，controller 与 api 层引用，不要各写一份字符串。
- 租户路由的参数名**必须叫 `tenantId`**：`TenantMembershipGuard` 只读 `req.params.tenantId`，写成 `:id` 会静默 404。

### 3.2 方法与状态码

| 操作 | 方法 | 成功状态码 |
| --- | --- | --- |
| 列表查询 | GET | 200 |
| 单条查询 | GET | 200 |
| 创建 | POST | 201 |
| 全量更新 | PUT | 200 |
| 局部更新 | PATCH | 200 |
| 删除 | DELETE | 204 |
| 登录/签发 | POST | 201 |

错误状态码：400 参数错误、401 未认证、403 权限不足、404 不存在、409 冲突、422 业务规则不满足、500 未预期。

> DELETE 默认返回 200；要按上表返回 204，需显式 `@HttpCode(204)` + `@ApiNoContentResponse()`。

> 删除有依赖的资源（如租户仍有成员/订阅）返回 **409**，不要级联删业务数据；停用用 `PATCH status`。

### 3.3 错误响应

- 禁止在 Controller 里 `res.status().json()`；统一抛 `HttpException` 子类。
- 响应体固定形状：`{ statusCode, message, error? }`；业务错误可加 `errorCode` 字符串供前端判断。
- 未知异常由全局异常过滤器兜底，不把堆栈返回给客户端。

### 3.4 列表查询

- 分页参数：`page`（从 1 开始）、`pageSize`（默认 20，上限 100）。
- 响应：`{ items: T[], total: number, page: number, pageSize: number }`。
- 筛选/排序字段必须白名单，禁止把 query 直接透传给 Prisma。
- 排序参数：`sortBy` + `order`（`asc` / `desc`），字段映射到允许列。

列表响应用具体类（不要泛型，运行时会被擦除）：

```ts
export class TenantListResponseDto {
  @ApiProperty({ type: [TenantResponseDto] }) items!: TenantResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
```

### 3.5 认证与授权标注

- 公开端点：`@Public()`（health、sign-in）。
- 需要登录：默认全局认证 guard；方法/类上再加 `@Can.Anyone()` 明确授权要求。
- 需要特定权限：`@Can(Policy, "ability")`。
- 租户路由：`@UseGuards(TenantMembershipGuard)` + `@UseInterceptors(TenantTransactionInterceptor)`。
- Swagger：需要登录的 controller 加 `@ApiBearerAuth()`；公开端点不要加。
- 错误响应也要声明（至少 401；租户路由补 403/404），用共享的 `ErrorResponseDto`，否则生成的错误类型是 `unknown`。

### 3.6 OpenAPI 契约

- 每个 controller：`@ApiTags("领域")`；每个方法：`@ApiOperation({ summary })`。
- **每个成功响应必须声明 `@ApiOkResponse` / `@ApiCreatedResponse` 的 `type`**，否则生成的前端类型是 `unknown`。
- 路径参数必须出现在 handler 签名里（如 `@Param("tenantId")`），否则 Swagger 不会生成 path 参数，生成客户端无法传参。
- 改完接口后运行 `pnpm api:generate`；生成物禁止手改。`openapi.json` **提交入库**（契约 diff），`src/generated/` **不提交**；clean clone / CI 先 `pnpm api:generate` 再 typecheck。

## 4. DTO 规范

### 4.1 入参

- Body：`create-<feature>.dto.ts` / `update-<feature>.dto.ts`（更新用 `PartialType`）。
- Query：`query-<feature>.dto.ts`，需要类型转换的字段加 `@Type(() => Number)`。
- Param：简单 id 用 `@Param("id", ParseUUIDPipe)`；但 `tenantId` 由 `TenantMembershipGuard` 校验（非法/非成员统一 404），**不要加 ParseUUIDPipe 期待 400**；复杂参数用 DTO。
- 校验：`class-validator` + 全局 `ValidationPipe({ whitelist: true, transform: true })`；禁止在 controller 里手写 if 校验。
- Swagger：每个字段 `@ApiProperty` / `@ApiPropertyOptional`，带 `example` 与约束（`enum`、`format`、`minimum`）。

```ts
export class CreateUserDto {
  @ApiProperty({ example: "user@example.com" })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8, maxLength: 128 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}
```

### 4.2 出参

- **禁止直接返回 Prisma 实体**（会泄露内部字段、耦合 schema）。
- 每个资源定义 `<feature>-response.dto.ts`，字段显式声明 + `@ApiProperty`。
- 列表定义具体的 `XxxListResponseDto`（`items` + 分页字段），不要用泛型包装——泛型在运行时被擦除，Swagger 无法生成 item schema。
- 敏感字段（passwordHash、token 内部字段）永不出现。
- Controller 的返回类型与 `@ApiOkResponse({ type })` 保持一致。

```ts
export class UserResponseDto {
  @ApiProperty({ format: "uuid" })
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: ["active", "disabled"] })
  status!: string;
}
```

### 4.3 映射

- Prisma 查询先 `select` 限定字段，再映射到 response DTO。
- 复杂映射放 Service（或 `<feature>.mapper.ts`），不要散落在 Controller。
- 出参 DTO 不依赖 Prisma 类型，避免 schema 变更直接泄漏到 API。

## 5. 模块骨架示例

`users` 模块：

```text
users/
├── users.module.ts
├── users.controller.ts
├── users.service.ts
├── dto/
│   ├── create-user.dto.ts
│   ├── update-user.dto.ts
│   ├── query-users.dto.ts
│   └── user-response.dto.ts
├── repositories/
│   └── users.repository.ts
└── README.md
```

```ts
// users.controller.ts
@ApiTags("users")
@ApiBearerAuth()
@Controller("t/:tenantId/users")
@UseGuards(TenantMembershipGuard)
@UseInterceptors(TenantTransactionInterceptor)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @ApiOperation({ summary: "租户内用户列表" })
  @ApiOkResponse({ type: UserListResponseDto })
  @Get()
  @Can.Anyone()
  list(
    @TenantTx() tx: Prisma.TransactionClient,
    @Param("tenantId") _tenantId: string,
    @Query() query: QueryUsersDto,
  ) {
    return this.users.list(tx, query);
  }

  @ApiOperation({ summary: "创建用户" })
  @ApiCreatedResponse({ type: UserResponseDto })
  @Post()
  @Can.Anyone()
  create(
    @TenantTx() tx: Prisma.TransactionClient,
    @Body() dto: CreateUserDto,
  ) {
    return this.users.create(tx, dto);
  }
}
```

## 6. 新增模块检查清单

- [ ] 目录名复数 kebab-case，模块内有 `README.md`
- [ ] Controller 只做校验/转发，业务在 Service
- [ ] 入参 DTO 有 class-validator + `@ApiProperty`
- [ ] 成功响应有 `@ApiOkResponse`/`@ApiCreatedResponse` 的 `type`
- [ ] 出参用 response DTO，不返回 Prisma 实体
- [ ] 租户路由挂了 `TenantMembershipGuard` + `TenantTransactionInterceptor`
- [ ] 租户表查询用 `@TenantTx()`，未用 `prisma.scoped`
- [ ] 错误抛 `HttpException` 子类，不手写 `res.json()`
- [ ] 公开端点标 `@Public()` 且不加 `@ApiBearerAuth`
- [ ] 运行 `pnpm api:generate`，生成物未手改
- [ ] 全量 `pnpm build` / `pnpm lint` / `test:e2e` 通过

## 7. 与当前代码的对应关系

- `auth/` 已按本规范拆出 `dto/`；`guards/`、`middleware/`、`decorators/`、`providers/` 仍平铺在模块根，后续新增文件按本规范放置，存量文件可渐进迁移。
- `tenancy/` 已有 `dto/`、`interceptors/`、`decorators/`，作为租户路由模板。
- `tenants/` 是**平台级租户 CRUD** 模板：`PlatformAdminGuard` + 分页/筛选 + slug 冲突 409 + 删除依赖检查 409。
- 全局异常过滤器、响应包装拦截器尚未引入；需要时放 `common/filters/`、`common/interceptors/`，并在 `app.module.ts` 注册。
