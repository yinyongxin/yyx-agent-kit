# 管理端数据表格（Table）— 开发日志（阶段 3）

## 任务完成情况

| 编号 | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| T1 | 纯逻辑层 | `components/DataTable/{functions,filter-fields,types}.ts` | 四态判定 / 过滤 / 排序 / 分页推导 / 选中切换 / 筛选芯片，纯函数 |
| T2 | 状态 hook | `components/DataTable/useDataTable.ts` | 四态 + 分页 + 选中统一结果，`selected` 为 `Set<string\|number>`，泛型靠 `getRowKey` 推断 |
| T3 | 组合组件 | `DataTable.tsx` + FilterBar / Content / Pagination / Toolbar + `index.tsx` barrel | Context 打通，原子可独立使用 |
| T4 | 双视图 | `DataTableTable.tsx` / `DataTableCardList.tsx` | 桌面 Table（sticky + 行选择）+ 移动卡片，CSS 断点切换 |
| T5 | 用户页样板 | `features/access/users/UsersContent.tsx` | 占位替换为真实列表，列定义 + 筛选配置 + 25 条静态数据驱动 |
| T6 | 验证 | — | 见下 |

## 阶段 3 抓到并修复的问题

1. **9 个类型错误**（typecheck 捕获）：未使用解构、`children` 函数泛型不兼容、Context 缺 `setPage`/`setPageSize`、`ReactNode` 误从 `@mantine/core` 导入、`Button compact` prop 不存在、`ActionBar visible` prop 不存在。
   - `ActionBar` 按官网一手文档改用 `opened` + `onClose`；按钮紧凑尺寸用 `size="compact-sm"`（非 `compact` prop）。
2. **列宽挤压**：首版 `minWidth=760` 让「状态」标题换行、后序列被截断；改为 `minWidth=980` + 列头 `whiteSpace: nowrap`，full_page snapshot 确认 7 列 + 操作按钮 + 分页全部完整。

## 验证结果

| 验证 | 结果 |
| --- | --- |
| `pnpm --filter @starter/admin typecheck` | 通过（修复 9 个错误后） |
| `pnpm lint` | 通过（exit 0；仅 Fast Refresh 的 warning，barrel 导出非组件属项目标准模式，非错误） |
| ego-browser（space 10）首屏 | `/access/users` 渲染标题、工具栏（新建用户）、筛选栏（搜索/状态/重置）、7 列数据表、分页 1/2/3、`共 25 条` |
| 搜索 | 输入 `user3` → 只显示 `user3@example.com`，`user2` 消失 |
| 排序 | 点「邮箱」列头 → 升序 `user1, user10, user11, user12…` |
| 分页 | 点第 2 页 → 首行由「用户 1」变为「用户 11」 |
| 行选择 + ActionBar | 勾选行 → 底部 ActionBar 出现「已选 1 项 / 批量删除」 |
| 批量删除确认 | 点「批量删除」→ Modal 显示「确定删除选中的 1 个用户？」 |

截图：`D:/opencode-poc/ego-admin/datatable-{users,selected,fixed,modal}.png`（临时目录，不入库）。

## 环境观察（非缺陷）

- 本机内存紧张，全量 `pnpm build` 曾在 Rolldown 阶段 OOM；本阶段用 `typecheck` + `lint` + 浏览器 dev 验证覆盖，未跑全量 build（已多次记录的环境限制）。
- 浏览器验证中 `text=2` 曾匹配到 28 个元素（日期 / 用户 2 / 分页 2），改用 DOM 精确匹配 `button` 文本后通过——定位策略问题，非代码缺陷。

## 遗留

- 用户/角色/租户/权限其余三页仍为占位，后续照搬本模式（PRD Q1 非目标）。
- 批量操作目前改静态 `useState` 数据，接真实 API 时 `queryOptions(page, size)` 注入点已预留。
- 竖屏窄视口的移动卡片视图未在浏览器实测（ego 默认桌面视口）；代码用 `hiddenFrom="sm"` / `visibleFrom="sm"` 断点控制。
