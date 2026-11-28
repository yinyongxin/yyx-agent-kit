import { SetMetadata } from "@nestjs/common";
import type { TracedRequest } from "../logging/trace.middleware";

export const AUDIT_OPTIONS = "audit:options";

/**
 * 审计动作声明：加在 Controller 方法上，AuditInterceptor 会在成功/失败后各写一条记录。
 *
 * 只用于「关键写操作」：租户/成员/角色变更、登录、改密、权限调整。
 * 普通查询不要加，否则审计表会被噪音淹没。
 */
export interface AuditOptions {
  /** 动作名：模块.动词，如 tenant.create / auth.sign_in */
  action: string;
  /** 资源类型：tenant / session / user / role */
  resource: string;
  /** 从返回值 / 路由参数推导资源 id；默认取 data.id，其次 params.id */
  resourceId?: (data: unknown, req: TracedRequest) => string | null | undefined;
  /** 是否把返回值写入 after（默认 true；返回 token / 密钥的方法设为 false） */
  recordResult?: boolean;
  /** 固定说明（失败时仍会写 error.message） */
  summary?: string;
}

export const Audit = (options: AuditOptions) => SetMetadata(AUDIT_OPTIONS, options);
