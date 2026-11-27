# auth — 登录页

## 职责

管理端登录入口，调用 `POST /api/auth/sign-in`，把 token 存入 `lib/auth`。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `LoginPage.tsx` | 页面入口 |
| `LoginContent.tsx` | 表单与登录逻辑 |
| `index.ts` | 统一导出 |

## 关联

- 路由：`src/routes/login.tsx`
- 登录态：`src/lib/auth.ts`
- 客户端：`src/lib/api-client.ts`（401 自动跳回本页）

## 同步要求

- 改登录端点/字段时同步 `LoginContent` 与 `@starter/api/generated`。
- 退出登录调用 `authStore.clear()` 后跳 `/login`。
