# auth/providers

## 职责

认证相关的可注入 provider（非 Controller / Service / Repository）。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `jwt-auth.provider.ts` | Bearer JWT 凭证 provider，按 `sub` 从业务库加载用户 |

## 注意事项

- provider 在构造函数里 `registry.registerProvider(this)` 自注册，不需要额外模块配置。
- 生产把 `accessToken.key` 放进密钥管理，并注册实际用到的 store。
