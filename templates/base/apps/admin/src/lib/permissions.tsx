import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  tenantControllerMembership,
  type MembershipDto,
} from "@starter/api/generated";
import { getApiErrorMessage } from "./api-error";

type TenantPermissionsState = {
  tenantId: string;
  membership: MembershipDto | null;
  permissions: string[];
  loading: boolean;
  error: string | null;
  /** 权限判断：owner/admin 的 ["*"] 直接放行 */
  can: (permission: string) => boolean;
};

const DEFAULTS: TenantPermissionsState = {
  tenantId: "",
  membership: null,
  permissions: [],
  loading: false,
  error: null,
  can: () => false,
};

const TenantPermissionsContext = createContext<TenantPermissionsState | null>(
  null,
);

/**
 * 加载当前用户在指定租户下的 membership（角色 + 权限并集）。
 * 权限由后端按请求实时计算，前端只做展示层收口；真正拦截以后端 403 为准。
 */
export const TenantPermissionsProvider = ({
  tenantId,
  children,
}: {
  tenantId: string;
  children: ReactNode;
}) => {
  const [membership, setMembership] = useState<MembershipDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    setMembership(null);

    void tenantControllerMembership({ path: { tenantId } })
      .then((res) => {
        if (!alive) return;
        if (res.error || !res.data) {
          setError(getApiErrorMessage(res.error, "无法读取当前租户权限"));
          return;
        }
        setMembership(res.data);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "无法读取当前租户权限");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, [tenantId]);

  const permissions = useMemo(
    () => membership?.permissions ?? [],
    [membership],
  );
  const can = useCallback(
    (permission: string) =>
      permissions.includes("*") || permissions.includes(permission),
    [permissions],
  );

  const value = useMemo(
    () => ({ tenantId, membership, permissions, loading, error, can }),
    [tenantId, membership, permissions, loading, error, can],
  );

  return (
    <TenantPermissionsContext.Provider value={value}>
      {children}
    </TenantPermissionsContext.Provider>
  );
};

/** Provider 外默认拒绝；租户页面必须包在 TenantPermissionsProvider 内 */
export const usePermissions = (): TenantPermissionsState =>
  useContext(TenantPermissionsContext) ?? DEFAULTS;
