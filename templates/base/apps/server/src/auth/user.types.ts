/** 全局身份用户（由我们定义，官方认证包只认这个形状）。
 *
 * 多对多改造后 User 不再持有 tenantId；角色信息也不在这里——
 * 当前租户的角色由 TenantMembershipGuard 按 UserRole + Role.tenantId 查询，避免跨租户混淆。
 */
export interface User {
  id: string;
  email: string | null;
  displayName: string | null;
  status: string;
  /** 当前 Bearer JWT 对应的服务端会话 id（JwtAuth 注入） */
  sessionId?: string;
}
