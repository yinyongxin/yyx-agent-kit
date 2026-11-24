/** 业务用户模型（由我们定义，官方认证包只认这个形状）。 */
export interface User {
  id: string;
  tenantId: string;
  email: string | null;
  displayName: string | null;
  status: string;
  /** 角色 code 列表，如 ["admin"] / ["member"]，供 @nestjs/authorization 的 policy 使用 */
  roles: Array<{ role: { code: string } }>;
}
