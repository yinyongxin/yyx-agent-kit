# auth/decorators

## 职责

认证/授权相关的参数与元数据装饰器。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `membership.decorator.ts` | `@CurrentMembership()` 注入 guard 挂载的成员信息；`@MinRole("admin")` 声明最低角色 |

## 注意事项

- `Membership` 类型定义在 `../membership.types.ts`，不要在本目录重复声明。
