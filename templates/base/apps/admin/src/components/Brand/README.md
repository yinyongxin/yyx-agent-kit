# components/Brand — 管理端统一 Logo

## 职责

三种导航共用的品牌标识，点击回工作台（默认页）。`compact` 只显示图标（双栏 60px 图标栏），默认显示图标 + 名称。图标是 CSS 渐变方块 + 名称首字母，不依赖图片资源。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `Brand.tsx` | 组件实现 |
| `Brand.module.css` | 图标与名称样式 |
| `types.ts` | `BrandProps` |
| `index.tsx` | barrel，只 re-export |

## 关联

- 使用处：`NavbarNested` 头部（完整）、`DoubleNavbar` 图标栏顶部（compact）、`HeaderMegaMenu` 左侧（完整）。
- 顶栏的菜单是绝对居中的，换 Logo 不影响菜单位置。
- 接入真实项目时改 `name` 或替换 `.mark` 的样式，无需改三个导航组件。

## 同步要求

改 Logo 外观只动本目录；新增形态先加 `BrandProps` 再同步使用处与本 README。
