/** 管理端三种导航菜单模式 */
export type AdminLayoutMode = "nested" | "double" | "header-mega-menu";

export interface LayoutModeOption {
  value: AdminLayoutMode;
  label: string;
}

export const LAYOUT_MODES: LayoutModeOption[] = [
  { value: "nested", label: "嵌套侧栏" },
  { value: "double", label: "双栏侧栏" },
  { value: "header-mega-menu", label: "顶部大菜单" },
];

export interface LayoutModeContextValue {
  mode: AdminLayoutMode;
  setMode: (mode: AdminLayoutMode) => void;
}
