# components/AdminScrollArea — 管理端统一滚动容器

## 职责

admin 内**所有可滚动区域**统一用它，不用浏览器原生滚动条。Mantine 自定义滚动条是覆盖层、不占布局宽度，因此不会像原生滚动条那样在出现/消失时把页面顶得跳动；`offsetScrollbars` 给内容留出被滚动条覆盖的空间。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `AdminScrollArea.tsx` | 封装 Mantine `ScrollArea`，强制可预测滚动条配置 |
| `index.tsx` | barrel，只 re-export |

## 关联

- 基于 Mantine `ScrollArea`（https://mantine.dev/core/scroll-area/）：自定义滚动条为覆盖层、不占布局宽度；`offsetScrollbars` 给内容让位。
- 使用处：`AdminLayout` 主内容区、`NavbarNested` / `DoubleNavbar` 侧栏链接、`HeaderMenu` / `HeaderMegaMenu` 移动菜单、`DataTableTable` 横向表格。
- 约定见 `docs/guides/conventions.md` 第 6 节「前端样式与组件库」。

## 同步要求

新增可滚动区域必须用 `AdminScrollArea`，不要直接用原生 `overflow: auto` 或 `ScrollArea type="native"`；配置在组件里强制生效，不要在调用处覆盖。
