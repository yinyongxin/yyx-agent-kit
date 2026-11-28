import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Center, Loader } from "@mantine/core";
import {
  meControllerTenants,
  type TenantSummaryDto,
} from "@starter/api/generated";
import { getApiErrorMessage } from "./api-error";
import { TenantPermissionsProvider } from "./permissions";

const STORAGE_KEY = "starter.admin.tenantId";

type TenantState = {
  tenants: TenantSummaryDto[];
  tenantId: string | null;
  setTenantId: (id: string) => void;
  loading: boolean;
  error: string | null;
};

const DEFAULTS: TenantState = {
  tenants: [],
  tenantId: null,
  setTenantId: () => undefined,
  loading: false,
  error: null,
};

const TenantContext = createContext<TenantState>(DEFAULTS);

/**
 * 全局当前租户：导航、角色页共用。
 * 默认取上次选择（localStorage）→ slug=default → 第一个租户。
 */
export const TenantProvider = ({ children }: { children: ReactNode }) => {
  const [tenants, setTenants] = useState<TenantSummaryDto[]>([]);
  const [tenantId, setTenantIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void meControllerTenants()
      .then((res) => {
        if (!alive) return;
        if (res.error || !res.data) {
          setError(getApiErrorMessage(res.error, "加载租户列表失败"));
          return;
        }
        setTenants(res.data);
        const saved =
          typeof window === "undefined"
            ? null
            : window.localStorage.getItem(STORAGE_KEY);
        const preferred =
          res.data.find((tenant) => tenant.id === saved) ??
          res.data.find((tenant) => tenant.slug === "default") ??
          res.data[0];
        setTenantIdState(preferred?.id ?? null);
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setError(err instanceof Error ? err.message : "加载租户列表失败");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => {
      alive = false;
    };
  }, []);

  const setTenantId = useCallback((id: string) => {
    setTenantIdState(id);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, id);
    }
  }, []);

  const value = useMemo(
    () => ({ tenants, tenantId, setTenantId, loading, error }),
    [tenants, tenantId, setTenantId, loading, error],
  );

  return (
    <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
  );
};

export const useTenant = () => useContext(TenantContext);

/**
 * 等租户列表加载完，再为当前租户挂权限 Provider。
 * 无租户时不挂：usePermissions 默认拒绝，导航只显示通用菜单。
 */
export const GlobalTenantPermissions = ({
  children,
}: {
  children: ReactNode;
}) => {
  const { tenantId, loading } = useTenant();
  if (loading) {
    return (
      <Center h="100vh">
        <Loader size="sm" />
      </Center>
    );
  }
  if (!tenantId) return <>{children}</>;
  return (
    <TenantPermissionsProvider tenantId={tenantId}>
      {children}
    </TenantPermissionsProvider>
  );
};
