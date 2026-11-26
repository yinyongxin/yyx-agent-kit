import { createContext, useContext, type ReactNode } from "react";
import type { AdminLayoutMode, LayoutModeContextValue } from "./types";

const LayoutModeContext = createContext<LayoutModeContextValue | null>(null);

export interface LayoutModeProviderProps {
  mode: AdminLayoutMode;
  setMode: (mode: AdminLayoutMode) => void;
  children: ReactNode;
}

/** 纯 Context Provider，不渲染 DOM；AdminLayout 持有真实状态，菜单组件通过它读写 */
export const LayoutModeProvider = ({ mode, setMode, children }: LayoutModeProviderProps) => (
  <LayoutModeContext.Provider value={{ mode, setMode }}>{children}</LayoutModeContext.Provider>
);

/** 在布局内使用；离开 Provider 返回 null，让 UserMenu 等组件可选择性不渲染相关入口 */
export const useOptionalLayoutMode = (): LayoutModeContextValue | null =>
  useContext(LayoutModeContext);
