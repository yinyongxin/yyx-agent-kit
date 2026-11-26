# 管理端数据表格（Table）— 测试报告（阶段 4，缺陷修复复测）

结论：**通过**（首轮「不通过」的 7 个缺陷全部修复并独立复测通过）

执行：共 43 条，通过 43，失败 0，跳过 0；通过率 100%。
本轮实际复测：自动化基线（typecheck/lint）+ 静态核对 + 缺陷相关 7 条用例（TC-F2-03/04/10、TC-F6-02/03、TC-A11Y-01、TC-F4-03）+ D-03 搜索回第一页补测 + 首轮跳过的 TC-F4-07、TC-F5-03。其余用例首轮已通过且对应代码路径未再改动，保留原通过结论，不重复执行。

环境：分支 `main`，提交 `3a3c339`（工作树含 DataTable 修复）；Node v24.22.3、pnpm 11.9.0、Vite 8.3.8、React 19.3.1、`@mantine/core` 9.8.1、`@tabler/icons-react` 3.52.0。
自动化在 `templates/base` 执行，均设 `CI=true`、`npm_config_store_dir=D:\pnpm-store`、`npm_config_minimumReleaseAge=0`。
浏览器：ego-browser v2.2.1，TaskSpace 13/14（均已 finish）；目标 `http://localhost:47174/access/users`，端口已有服务，探活 HTTP 200 后复用，未另起服务。

## 1. 自动化与静态核对（复测）

| 用例 | 结果 | 实际 | 证据 |
| --- | --- | --- | --- |
| TC-S01 | 通过 | 13 个组件文件 + 新增 `README.md` 均在（`git status` 显示目录为新增） | 文件枚举；`components/DataTable/README.md` |
| TC-S02 | 通过 | `index.tsx` 仍只有 `export` 语句，无逻辑 | 文件读取 |
| TC-S03 | 通过 | 组件文件名与 `export const` 名一致且 PascalCase；hook `useDataTable` 小驼峰 | 文件读取 |
| TC-S04 | 通过 | 仅 `UsersContent.tsx` 被改；`UsersPage.tsx` 未改，仍为 `PageShell` 壳 | git status/diff |
| TC-S05 | 通过 | `routeTree.gen.ts` 未被手改；路由可达 | git status + 浏览器 |
| TC-S06 | 通过（静态） | loading/error/empty/success 分支仍互斥；空态新增 `onEmptyAction` 按钮；loading/error 无页面入口，未实测 | `useDataTable.ts`、`DataTableContent.tsx` |
| TC-S07 | 通过 | `pnpm --filter @starter/admin typecheck` → `tsc --noEmit` 无输出，`TYPECHECK_EXIT=0` | 命令输出 |
| TC-S08 | 通过 | `pnpm lint` → `LINT_EXIT=0`；9 条 warning 均为既有 `react(only-export-components)`，无 error | 命令输出 |

> 全量 `pnpm build` 未跑：本机 Rolldown OOM 属已记录的环境限制，不作代码缺陷或阻塞依据。

## 2. 缺陷修复复测明细

证据路径：`C:/Users/admin/AppData/Local/Temp/1/opencode/qa-admin-table-retest-20261126/{retest-no-match,retest-small,retest-empty}.png`。

| 原缺陷 | 等级 | 关联用例 | 复测结果 | 复测实际 |
| --- | --- | --- | --- | --- |
| D-01 无匹配不进空态 | P1 | TC-F2-03、TC-F2-04、TC-F6-03 | **已修复并复测通过** | `zzz-not-found` / 300 字符 / `user3`+「禁用」均显示「暂无用户数据」空态、`共 0 条`、0 行、无空白表格；搜索词保留。`useDataTable` 已用 `allRows` 判空 |
| D-02 重置后 Select 残留 | P2 | TC-F2-10 | **已修复并复测通过** | 选「禁用」→ 点「重置」→ `statusValue=""`、输入框回到占位「状态」、数据 25 条、第 1 页。`FilterBar` 用 `!= null` 判定 |
| D-03 搜索不回第一页 | P2 | 补测（搜索回第一页） | **已修复并复测通过** | 第 2 页搜索 `user3` → `currentPage=1`；清空搜索 → 仍 `currentPage=1`，不再跳回旧页。`setKeyword` 已指向 `updateKeyword` |
| D-04 排序表头不可聚焦 | P2 | TC-A11Y-01 | **已修复并复测通过** | 排序控件由隐藏 Checkbox 改为 `BUTTON[aria-label="按邮箱排序"]`，`display:inline-flex`；`focus()` 后焦点为该按钮，按 Enter 即升序（chevron-up、首行 `用户 1`），键盘可操作 |
| D-05 小视口 ActionBar 遮挡分页 | P2 | TC-F4-03 | **已修复并复测通过** | 1280×675 视口勾选 1 行后点击分页「2」成功，`currentPage=2`、首行 `用户 11`、ActionBar 仍「已选 1 项」；未再出现指针事件被拦截。`Stack` 选中时 `pb=80` |
| D-06 空态缺「新建用户」 | P2 | TC-F6-02、TC-F2-03 | **已修复并复测通过** | 删空 25 条后空态含「新建用户」按钮（页面共 2 个：工具栏 + 空态内）；无匹配搜索截图同样可见空态内按钮。Context/Props 已加 `onEmptyAction`，`UsersContent` 已传入占位回调 |
| D-07 新增目录缺 README | P3 | 静态核对 | **已修复并复测通过** | `components/DataTable/README.md` 含职责 / 文件索引（13 文件）/ 关联 / 同步要求四段，与约定一致 |

## 3. 全量用例执行明细

| 编号 | 结果 | 实际（本轮复测或首轮保留） | 证据 |
| --- | --- | --- | --- |
| TC-S01–S08 | 全部通过 | 13 文件 + README 齐全；barrel/命名/改动边界/生成物未改；typecheck、lint exit 0 | 第 1 节 |
| TC-F1-01 | 通过（首轮） | 表头 7 格（选择＋6 列），列序正确 | 首轮 E1 |
| TC-F1-02 | 通过（首轮） | `th` computed `position:sticky`，滚动容器 `scrollTop=300` 后表头保持可见 | 首轮 E7 |
| TC-F1-03 | 通过（首轮） | 442px 下表格包裹层 `display:none`、卡片 `display:grid`，无横向溢出 | 首轮 E7 |
| TC-F2-01 | 通过（首轮） | `user3` → 1 行、`共 1 条` | 首轮 E2 |
| TC-F2-02 | 通过（首轮） | `用户 1` → 11 条 | 首轮 E2 |
| TC-F2-03 | **通过（本轮复测）** | 无匹配 → 空态 + 新建用户按钮，`共 0 条`，0 行 | retest-no-match.png |
| TC-F2-04 | **通过（本轮复测）** | 300 字符 → 空态 + 新建用户按钮，未崩溃 | 本轮 round-01 |
| TC-F2-05 | 通过（首轮） | 脚本/SQL 特殊字符按字面量过滤，0 行、无注入 | 首轮 E2 |
| TC-F2-06 | 通过（首轮） | 前后空格 trim 后命中 1 行 | 首轮 E2 |
| TC-F2-07 | 通过（首轮） | 大小写不敏感命中 1 行 | 首轮 E2 |
| TC-F2-08 | 通过（首轮） | 禁用 → 5 行、`共 5 条` | 首轮 E3 |
| TC-F2-09 | 通过（首轮） | `user1`+禁用 → 3 行，组合生效 | 首轮 E3 |
| TC-F2-10 | **通过（本轮复测）** | 重置后状态输入值空、回占位「状态」，25 条、第 1 页 | 本轮 round-01 |
| TC-F3-01 | 通过（首轮；本轮补键盘升序） | 三态 asc/desc/默认与图标同步；本轮 Enter 触发升序 | 首轮 E3 + 本轮 round-01 |
| TC-F3-02 | 通过（首轮） | 创建时间三态日期顺序正确 | 首轮 E8 |
| TC-F3-03 | 通过（首轮） | 同时仅一列有排序箭头 | 首轮 E8 |
| TC-F3-04 | 通过（首轮） | 排序回第 1 页 | 首轮 E4 |
| TC-F4-01 | 通过（首轮） | 全选 10 行/取消，ActionBar 同步 | 首轮 E5 |
| TC-F4-02 | 通过（首轮） | 部分选中 `indeterminate=true` | 首轮 E5 |
| TC-F4-03 | **通过（本轮复测）** | 1280×675 勾选后翻页成功，选中跨页保留 | retest-small.png |
| TC-F4-04 | 通过（首轮；本轮复测确认弹窗） | 确认文案「确定删除选中的 25 个用户？…」正确，确认后数据更新 | 首轮 E5 + 本轮 round-02 |
| TC-F4-05 | 通过（首轮，部分） | 批量启用已实测；停用同分支未单独执行 | 首轮 E5 |
| TC-F4-06 | 通过（首轮） | 连续两次确认只删一次（23 条） | 首轮 E8 |
| TC-F4-07 | **通过（本轮补测）** | 第 2 页全选 10 行删除 → `共 15 条`、当前页 2、5 行、无空白页/死按钮 | 本轮 remaining |
| TC-F5-01 | 通过（首轮） | 25 条/3 页，第 2、3 页数据正确 | 首轮 E4 |
| TC-F5-02 | 通过（首轮） | 每页 20→2 页，50→1 页 | 首轮 E4 |
| TC-F5-03 | **通过（本轮补测）** | 第 3 页切每页 20 → 回第 1 页、20 行 | 本轮 remaining |
| TC-F5-04 | 通过（首轮） | 11 条 → 2 页 | 首轮 E8 |
| TC-F5-05 | 通过（首轮，极端边界） | 删空后 1 页、无死按钮；未覆盖剩余 1–10 条中间态 | 首轮 E6 |
| TC-F6-02 | **通过（本轮复测）** | 删空 25 条 → 空态 + 新建用户按钮 | retest-empty.png |
| TC-F6-03 | **通过（本轮复测）** | 组合过滤无匹配 → 空态，不再空白表格 | 本轮 round-01 |
| TC-F6-04 | 通过（含静态） | 四态互斥有代码保证；浏览器数据/空态互斥 | 第 1 节 |
| TC-A11Y-01 | **通过（本轮复测）** | 排序表头 `BUTTON` 可聚焦，Enter 触发排序；其余控件 aria-label 齐全 | 本轮 round-01 |
| TC-A11Y-02 | 通过（首轮） | 状态有文本、H5 视图列标题保留 | 首轮 E7 |
| TC-A11Y-03 | 通过（首轮） | Modal Escape 可关闭 | 首轮 E8 |

## 4. 回归结论与残留风险

- **修复正确性与副作用**：D-01~D-06 的改动集中在 `useDataTable.ts`、`DataTableFilterBar.tsx`、`DataTableTable.tsx`、`DataTableContent.tsx`、`DataTable.tsx`、`UsersContent.tsx`；复测未发现新回归——排序三态、筛选组合、分页边界、批量删除确认与清空选中、双视图、Modal 行为均保持通过。
- **回归范围**：覆盖首轮缺陷复测 7 条 + 原跳过 2 条 + 自动化基线 + 静态结构/文档核对；核心主干（搜索→筛选→排序→选择→批量→分页→删空）再次可用。
- **残留缺陷**：0 个。7 个缺陷状态均为「已修复并复测通过」，无升级为「需产品/技术决策」的项。
- **阻塞项**：无。
- **残留风险（非缺陷）**：全量 `pnpm build` 受本机 Rolldown OOM 限制未跑；loading/error 态无页面注入入口，仍为静态确认；批量「停用」与「剩余 1–10 条」中间页边界未单独执行；接真实 API 时须补测请求失败/重试路径。
