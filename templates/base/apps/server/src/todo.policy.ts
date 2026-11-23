import { Policy, type PolicyBefore } from "@nestjs/authorization";
import type { User } from "./auth/user";

/**
 * 示例 policy：演示 @nestjs/authorization 的官方写法。
 * - before()：admin 通过所有检查（官方推荐，避免在每条 ability 重复写 admin 判断）
 * - 普通登录用户可查看/新增待办
 *
 * 真实业务按此模式给 knowledge / replay / billing 等模块写自己的 policy。
 */
@Policy()
export class TodoPolicy implements PolicyBefore<User> {
  before(user: User | null) {
    const roles = user?.roles.map((r: { role: { code: string } }) => r.role.code) ?? [];
    if (roles.includes("admin")) return true;
  }

  view(user: User | null) {
    return user !== null;
  }

  create(user: User | null) {
    return user !== null;
  }
}
