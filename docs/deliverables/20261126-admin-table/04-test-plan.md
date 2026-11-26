# 管理端数据表格（Table）— 测试计划（阶段 4）

依据：`01-prd.md`（F1–F6 验收标准、Q1–Q4 结论、第 10/11 节）、`02-tech-design.md`（影响面与 T1–T6）、`03-dev-log.md`（实际改动）、`skills/flows/qa-regression/SKILL.md`、`docs/guides/conventions.md` 第 7 节。

## 1. 测试范围与策略

- 实际改动：`apps/admin/src/components/DataTable/`（新增 13 文件）、`features/access/users/UsersContent.tsx`（占位 → 列表）；`UsersPage.tsx`、路由、`routeTree.gen.ts`、其它三页、client/portal/server 不在改动内。
- 本期无数据库/后端接口，静态数据由前端 `useState` 提供；不检查迁移与落库，写操作只校验前端状态（数据、总数、选中集合、状态标签）。
- 执行方式：自动化（admin typecheck、全仓 lint）→ 静态结构核对（13 文件/barrel/命名/改动边界）→ ego-browser 页面验证（`/access/users` 47174）。
- 预置数据：`UsersContent.makeUsers()` 生成 25 行，`id=u-001…u-025`，邮箱 `user1…user25@example.com`，`index % 5 === 0` 为禁用（共 5 条：user1/user6/user11/user16/user21），`index % 4 === 0` 为管理员。
- 说明：PRD F2-AC1/F2-AC2 的「5 条数据、其中 2 条禁用」是 Given 示例，实际样板数据为 25 条/5 条禁用；用例按「过滤结果只含目标集合、总数同步」这一验收意图判定，并把数据差异单列记录。
- F6 的 loading/error 态没有页面入口注入（静态数据默认 success），只能通过代码走查 + 命令验证确认分支存在；浏览器中无法触发的用例标注为「静态核对」而不是判通过。

## 2. 静态与自动化用例

| 编号 | 关联 AC | 前置 | 步骤 | 预期 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| TC-S01 | F1–F6 结构 | 工作树含新增目录 | 列出 `apps/admin/src/components/DataTable/`，与技术方案第 7 节的 13 个文件逐一比对 | `index.tsx`/`DataTable.tsx`/`DataTableFilterBar.tsx`/`DataTableContent.tsx`/`DataTableTable.tsx`/`DataTableCardList.tsx`/`DataTablePagination.tsx`/`DataTableToolbar.tsx`/`useDataTable.ts`/`functions.ts`/`filter-fields.ts`/`types.ts`/`labels.ts` 齐全 | P0 |
| TC-S02 | conventions §7 | 同上 | 逐行读 `index.tsx` | 只有 `export` 语句，无 JSX/业务逻辑/状态 | P0 |
| TC-S03 | conventions §7 | 同上 | 核对目录内每个 `.tsx` 文件名与 `export const` 名 | 全部 PascalCase，文件名 = 组件名；hook 为 `useDataTable` 小驼峰 `use` 前缀 | P0 |
| TC-S04 | T5 边界 | git 工作树 | `git status --short` + `git diff -- UsersContent.tsx` | 仅 `UsersContent.tsx` 被修改且内容为列定义/筛选配置/静态数据；`UsersPage.tsx` 未改 | P0 |
| TC-S05 | 生成物约束 | git 工作树 | `git status --short` 过滤 `routeTree.gen.ts` | 生成物未被手改 | P0 |
| TC-S06 | F6-AC1/F6-AC3 | 源码可读 | 走查 `useDataTable.ts`、`DataTableContent.tsx`、`labels.ts` | `state` 可注入 loading/error；loading 渲染 5 行 Skeleton；error 渲染红色 Alert + 重试按钮；四态互斥 | P0 |
| TC-S07 | T6 基线 | 依赖已安装 | `pnpm --filter @starter/admin typecheck` | exit 0，无类型错误 | P0 |
| TC-S08 | T6 基线 | 依赖已安装 | `pnpm lint` | exit 0；仅 Fast Refresh warning（barrel 导出非组件，项目既有模式） | P0 |

## 3. 功能用例（浏览器可执行部分）

公共前置：dev server `http://localhost:47174/access/users` 已启动，页面首屏加载完成（除特别说明外，均从首屏 25 行/第 1 页开始；各用例结束后点「重置」或刷新页面恢复）。

| 编号 | 关联 AC | 前置 | 步骤 | 预期 | 优先级 |
| --- | --- | --- | --- | --- | --- |
| TC-F1-01 | F1-AC1 | 首屏 | 查看表头与列 | 表头 7 列（选择/用户/邮箱/角色/状态/创建时间/操作），列名与列定义一致；`Table` 设置 `stickyHeader` | P0 |
| TC-F1-02 | F1-AC1 | 首屏 | 在表格容器内向下滚动，观察表头位置 | 表头保持可见（sticky），行在 `ScrollContainer` 内滚动 | P0 |
| TC-F1-03 | F1-AC1/响应式 | 首屏 | 缩窄视口至 < sm 断点 | 表格隐藏、移动卡片视图显示；宽视口反之；筛选栏换行不溢出 | P1 |
| TC-F2-01 | F2-AC1 | 首屏 | 搜索框输入 `user3` | 只显示 `user3@example.com`/`用户 3` 一行；`共 1 条`；分页变 1 页 | P0 |
| TC-F2-02 | F2-AC1 边界 | 首屏 | 输入 `用户 1`（含空格前缀的部分匹配） | 命中姓名含该片段的行；总数同步 | P1 |
| TC-F2-03 | F2-AC1/F6-AC2 | 首屏 | 输入完全不存在的关键词 `zzz-not-found` | 显示空态「暂无用户数据」，不显示空白表格/表格行；搜索词仍保留在输入框 | P0 |
| TC-F2-04 | F2-AC1 超长 | 首屏 | 输入 300 字符关键词 | 不崩溃、不溢出，结果为空态；总数 0 | P2 |
| TC-F2-05 | F2-AC1 特殊字符 | 首屏 | 输入 `<script>alert(1)</script>` 与 `' OR 1=1 --` | 均按字面量过滤，无匹配行、无脚本执行、无全量泄漏 | P1 |
| TC-F2-06 | F2-AC1 边界 | 输入框有值 | 输入 `  user3  `（前后空格） | `trim` 后命中 `user3` 一行 | P2 |
| TC-F2-07 | F2-AC1 边界 | 首屏 | 输入 `USER3@EXAMPLE.COM` | 大小写不敏感，命中 `user3` 一行 | P2 |
| TC-F2-08 | F2-AC2 | 首屏 | 状态 Select 选「禁用」 | 仅显示 5 条禁用用户（user1/6/11/16/21），`共 5 条`；选「全部」恢复 25 条 | P0 |
| TC-F2-09 | F2-AC2 组合 | 首屏 | 搜索 `user1` 后再选状态「禁用」 | 组合过滤后只剩 user1/user11/user16 三行，总数 3；两个条件同时生效 | P0 |
| TC-F2-10 | F2-AC2 重置 | 处于第 3 页且有搜索词/筛选 | 点「重置」 | 搜索词清空、状态回「全部」、回到第 1 页、总数 25 | P0 |
| TC-F3-01 | F3-AC1 | 首屏 | 依次点击「邮箱」列头三次 | 第一次升序（`user1,user10,user11,…`）、第二次降序、第三次恢复默认（`用户 1` 在首行）；图标依次 Up/Down/无排序箭头；同一时刻仅一列有排序图标 | P0 |
| TC-F3-02 | F3-AC1 | 首屏 | 点击「创建时间」列头两次 | 日期按 `YYYY-MM-DD` 正确升/降序，第三次恢复默认 | P1 |
| TC-F3-03 | F3-AC1 | 邮箱已排序 | 再点击「状态」列头 | 邮箱的排序图标清除，仅状态列处于排序态 | P1 |
| TC-F3-04 | F3-AC1/排序叠加 | 处于第 3 页 | 点「邮箱」列头排序 | 页码回到第 1 页，排序在过滤后的数据上生效 | P1 |
| TC-F4-01 | F4-AC1 | 首屏 10 行 | 点击表头全选 Checkbox，再点一次 | 第一次 10 行全部高亮、ActionBar 显示「已选 10 项」；第二次全部取消、ActionBar 消失 | P0 |
| TC-F4-02 | F4-AC1 | 首屏 | 勾选 1 行后查看表头 Checkbox | 表头为 indeterminate（部分选中）态 | P1 |
| TC-F4-03 | F4-AC1 | 第 1 页选中 1 行 | 翻到第 2 页查看 ActionBar 与选中态 | 选中集合跨页保留（ActionBar 仍显示「已选 1 项」）；在第 2 页全选不影响第 1 页选中 | P2 |
| TC-F4-04 | F4-AC2 | 勾选 2 行 | 点「批量删除」读取 Modal 文案 → 点「取消」→ 再点「批量删除」→ 点「确认」 | 文案为「确定删除选中的 2 个用户？此操作不可撤销。」；取消后数据不变；确认后 2 行移除、总数 23、ActionBar 消失 | P0 |
| TC-F4-05 | F4-AC2 | 勾选禁用行 | 点「批量启用」→ 确认；再勾选启用行点「批量停用」→ 确认 | 确认文案正确；Badge 文本由「禁用」变「正常」/反之；批量操作后选中清空 | P1 |
| TC-F4-06 | F4-AC2 重复提交 | 勾选 2 行，Modal 打开 | 快速连续点「确认」 | 只删除一次（总数 23，不是 21），无报错 | P2 |
| TC-F4-07 | F4-AC2 边界 | 第 2 页全选 10 行 | 批量删除确认 | 删除后页码/数据落在有效范围，无空白页或死按钮 | P1 |
| TC-F5-01 | F5-AC1 | 首屏 | 查看分页区，点第 2 页、第 3 页 | 显示「共 25 条」、3 页；第 2 页为 `用户 11`–`用户 20`，第 3 页为 `用户 21`–`用户 25` | P0 |
| TC-F5-02 | F5-AC1 | 首屏 | 每页条数切到 20，再切到 50 | 20 → 2 页且第 1 页 20 行；50 → 1 页且 25 行；总数始终 25 | P0 |
| TC-F5-03 | F5-AC1 | 处于第 3 页 | 每页条数切到 20 | 回到第 1 页 | P1 |
| TC-F5-04 | F5-AC1 边界 | 搜索 `user1`（11 行） | 查看分页 | 共 11 条、2 页，第 2 页显示剩余 1 行；无第 3 页按钮 | P1 |
| TC-F5-05 | F5-AC1 边界 | 删除至剩余 ≤ 10 行 | 查看分页 | 页数收敛为 1，无空白页/死按钮 | P2 |
| TC-F6-02 | F6-AC2 | 删除全部 25 行 | 查看内容区 | 显示 EmptyState「暂无用户数据」，无 Skeleton、无表格行 | P1 |
| TC-F6-03 | F6-AC2/技术设计 §8 | 首屏 | 搜索无匹配词 | 期望进入空态（技术设计 §8 明确「搜索无匹配 → emptyWhen 判空进空态」）；不显示空白表格 | P0 |
| TC-F6-04 | F6 状态互斥 | 任意状态 | 观察内容区 | 同一时刻只显示一种：加载 / 空 / 错误 / 数据；可在静态核对中确认分支互斥 | P1 |
| TC-A11Y-01 | 非功能/无障碍 | 首屏 | Tab 键遍历搜索框、状态筛选、排序表头、行/表头 Checkbox；读 aria-label | 各控件有可读名称；焦点可见；排序与选择可用键盘触发 | P1 |
| TC-A11Y-02 | 无障碍 | 首屏 | 检查状态 Badge 与排序图标 | 状态不仅靠颜色区分（有「正常/禁用」文本）；排序图标有对应 aria-label 与 Up/Down 语义 | P2 |
| TC-A11Y-03 | Modal 无障碍 | Modal 打开 | 按 Escape / 点遮罩 | Modal 关闭，焦点回到触发按钮（Mantine 默认行为） | P2 |

## 4. 回归范围

- 直接相关：`/access/users` 全部列表交互；`DataTable` 新增组件在 `UsersContent` 中的组合；barrel 导入路径 `@/components/DataTable`。
- 影响面核对：`UsersPage.tsx`（页面壳）、`routes/access/users.tsx` 路由、`routeTree.gen.ts` 生成物、`PageShell`、其它三个占位页不受影响（git 改动面 + 抽查页面可达）。
- 上次缺陷复测：阶段 3 修复的 9 个类型错误（`typecheck`）、列宽挤压（`minWidth=980` + `nowrap` 后 7 列与操作/分页完整）、`ActionBar opened` 与 `size="compact-sm"`。
- 不做：真实 API/数据库、鉴权与越权（本期静态数据、PRD 非目标）、全量 `pnpm build`（本机 Rolldown OOM 的环境问题，非代码缺陷）。

## 5. 缺陷修复复测补记（阶段 4 复测）

首轮判定为「不通过」（D-01~D-07）。修复后复测结论为「通过」，用例编号、AC 映射与预期保持不变，无需改用例；执行结果见 `04-test-report.md`。

| 原缺陷 | 关联用例 | 复测结论 |
| --- | --- | --- |
| D-01（P1） | TC-F2-03、TC-F2-04、TC-F6-03 | 已修复并复测通过 |
| D-02（P2） | TC-F2-10 | 已修复并复测通过 |
| D-03（P2） | 补测「搜索回第一页」 | 已修复并复测通过 |
| D-04（P2） | TC-A11Y-01 | 已修复并复测通过 |
| D-05（P2） | TC-F4-03 | 已修复并复测通过 |
| D-06（P2） | TC-F6-02、TC-F2-03 | 已修复并复测通过 |
| D-07（P3） | 静态核对（新增 `README.md`） | 已修复并复测通过 |

首轮跳过的 TC-F4-07（第 2 页全选删除后的页码边界）与 TC-F5-03（第 3 页切换每页条数回第一页）在本轮补测通过；43 条用例全部通过，无失败、无跳过。
