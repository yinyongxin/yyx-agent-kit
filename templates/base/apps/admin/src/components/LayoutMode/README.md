# components/LayoutMode — 导航菜单模式状态

## 职责

把 AdminLayout 持有的「四种导航菜单模式」状态以纯 Context 暴露给子元素，让 `UserMenu` 的面板能切换模式，而不必把 `mode` / `setMode` 一层层传进四个菜单组件。Provider 不渲染 DOM。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `LayoutModeContext.tsx` | 纯 Provider + `useOptionalLayoutMode` |
| `types.ts` | `AdminLayoutMode` / `LAYOUT_MODES` / Context 类型 |
| `index.tsx` | barrel，只 re-export |

## 关联

- 状态源在 `components/AdminLayout/AdminLayout.tsx`，默认 `nested`。
- `components/UserMenu` 用 `useOptionalLayoutMode()` 读取：有 Provider 才显示「导航菜单模式」子菜单，没有则不显示。
- 四种模式对应的组件：`NavbarNested` / `DoubleNavbar` / `HeaderMenu` / `HeaderMegaMenu`。

## 同步要求

新增或改名模式时同步 `LAYOUT_MODES`、AdminLayout 的分支判断和本 README；模式文案只在本文件维护。
