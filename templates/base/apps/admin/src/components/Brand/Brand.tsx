import { Link } from "@tanstack/react-router";
import classes from "./Brand.module.css";
import type { BrandProps } from "./types";

/** 管理端统一 Logo：点回首页。compact 形态用于双栏图标栏，完整形态用于嵌套侧栏与顶栏 */
export const Brand = ({ compact = false, name = "starter" }: BrandProps) => (
  <Link to="/" className={classes.root} aria-label={`${name} 首页`}>
    <span className={classes.mark}>{name.slice(0, 1).toUpperCase()}</span>
    {!compact && <span className={classes.name}>{name}</span>}
  </Link>
);
