import type { ReactNode } from "react";

export interface PageShellProps {
  /** 页面标题（h2） */
  title: string;
  /** 标题下的说明文字，可选 */
  description?: string;
  /** 标题栏右侧的操作区（按钮等） */
  actions?: ReactNode;
  /** 页面主体内容 */
  children: ReactNode;
}
