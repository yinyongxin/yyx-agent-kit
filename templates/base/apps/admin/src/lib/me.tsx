import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { meControllerGet, type MeResponseDto } from "@starter/api/generated";
import { authStore } from "./auth";
import { getApiErrorMessage } from "./api-error";

type MeState = {
  me: MeResponseDto | null;
  loading: boolean;
  error: string | null;
};

type MeContextValue = MeState & {
  /** 资料修改后重新拉取 /me */
  refresh: () => void;
};

const MeContext = createContext<MeContextValue>({
  me: null,
  loading: true,
  error: null,
  refresh: () => undefined,
});

/** 当前登录用户资料（/me），用于平台级页面门禁与个人中心 */
export const MeProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<MeState>({
    me: null,
    loading: true,
    error: null,
  });
  const [reloadKey, setReloadKey] = useState(0);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  useEffect(() => {
    if (!authStore.isAuthenticated()) {
      setState({ me: null, loading: false, error: null });
      return;
    }

    let alive = true;
    setState((prev) => ({ ...prev, loading: true }));
    void meControllerGet()
      .then((res) => {
        if (!alive) return;
        if (res.error || !res.data) {
          setState({
            me: null,
            loading: false,
            error: getApiErrorMessage(res.error, "加载用户信息失败"),
          });
          return;
        }
        setState({ me: res.data, loading: false, error: null });
      })
      .catch((err: unknown) => {
        if (!alive) return;
        setState({
          me: null,
          loading: false,
          error: err instanceof Error ? err.message : "加载用户信息失败",
        });
      });

    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const value = useMemo(() => ({ ...state, refresh }), [state, refresh]);

  return <MeContext.Provider value={value}>{children}</MeContext.Provider>;
};

export const useMe = () => useContext(MeContext);
