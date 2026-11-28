import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { meControllerMe, type MeResponseDto } from "@starter/api/generated";
import { authStore } from "./auth";
import { getApiErrorMessage } from "./api-error";

type MeState = {
  me: MeResponseDto | null;
  loading: boolean;
  error: string | null;
};

const MeContext = createContext<MeState>({
  me: null,
  loading: true,
  error: null,
});

/** 当前登录用户资料（/me），用于平台级页面门禁 */
export const MeProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<MeState>({
    me: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!authStore.isAuthenticated()) {
      setState({ me: null, loading: false, error: null });
      return;
    }

    let alive = true;
    void meControllerMe()
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
  }, []);

  return <MeContext.Provider value={state}>{children}</MeContext.Provider>;
};

export const useMe = () => useContext(MeContext);
