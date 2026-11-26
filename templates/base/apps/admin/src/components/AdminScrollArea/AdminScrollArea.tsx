import { ScrollArea, type ScrollAreaProps } from "@mantine/core";

/**
 * 管理端统一滚动容器：始终预留滚动条空间（type="always"）并给内容让位（offsetScrollbars），
 * 避免内容增减时原生滚动条出现/消失导致页面横向跳动。
 * 配置强制生效，调用方不能覆盖成 native/auto。
 */
export const AdminScrollArea = (props: ScrollAreaProps) => (
  <ScrollArea {...props} type="always" offsetScrollbars />
);
