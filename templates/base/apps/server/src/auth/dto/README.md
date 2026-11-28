# auth/dto

## 职责

认证模块的入参与出参 DTO。入参带 class-validator 校验，出参显式声明字段（不直接返回 Prisma 实体）。

## 文件索引

| 文件 | 作用 |
| --- | --- |
| `sign-in.dto.ts` | `SignInDto`（邮箱/密码）+ `SignInResponseDto`（accessToken/tokenType） |
| `membership.dto.ts` | `MembershipDto`：我在某租户下的成员信息与权限并集 |

## 注意事项

- `/me` 的 `MeResponseDto` / `TenantSummaryDto` 已迁到 `users/dto/`

- 出参 DTO 只放对外字段，密码哈希、内部状态等一律不出现。
- 每个字段加 `@ApiProperty`，保证 `pnpm api:generate` 能生成准确的前端类型。
