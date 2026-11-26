# components/UserMenu — 菜单用户信息组件

## 职责

放在四种菜单里的用户信息入口：显示头像、姓名（侧栏/抽屉还显示邮箱），点击展开面板，提供导航菜单模式切换、主题设置、系统设置、退出登录。模板阶段用示例用户与禁用态退出项，接认证后由调用方注入真实数据与回调。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `UserMenu.tsx` | 组件实现：三种形态 + Mantine Menu 面板 |
| `UserMenu.module.css` | 三种入口形态的布局样式 |
| `types.ts` | `UserMenuProps` / `UserInfo` / `UserMenuVariant` |
| `index.tsx` | barrel，只 re-export |

## 关联

- 四种形态对应四种菜单：`sidebar` → `NavbarNested`（整行含邮箱）；`icon` → `DoubleNavbar`（只显示头像，放一级图标菜单下方）；`header` → `HeaderMenu` / `HeaderMegaMenu`（紧凑含姓名）；`drawer` → 两种顶部菜单的移动端抽屉。
- 主题设置用 Mantine 官方 `useMantineColorScheme` 的 `setColorScheme`（官网 Color schemes），支持浅色/深色/跟随系统；值存 localStorage，Provider 默认 light。
- 导航菜单模式通过 `components/LayoutMode` 的 `useOptionalLayoutMode()` 读取并切换四种模式；不在 Provider 内时不显示该项（组件可独立复用）。
- 设置项跳 `/settings`（`settingsTo` 可覆盖）；退出登录需要 `onLogout` 回调，未接认证时禁用并显示「待接入」。
- 接入认证后：由 `apps/server` 的 `@nestjs/authentication` 提供用户，调用方传 `user` 与 `onLogout`。

## 同步要求

- 新增面板项通过 `extraItems` 注入，不在组件里 import 业务模块。
- 新增形态先加 `UserMenuVariant` 再补 CSS，并同步四种菜单的放置位置。
- 不 import i18n；文案直接写在组件里，后续需要多语言再统一抽取。
