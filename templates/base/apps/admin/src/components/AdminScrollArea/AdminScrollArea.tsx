import { ScrollArea, type ScrollAreaProps } from "@mantine/core";

/**
 * 管理端统一滚动容器：Mantine 自定义滚动条是覆盖层，不占布局宽度，
 * 不会出现原生滚动条出现/消失导致的跳动；offsetScrollbars 给内容让位，防止被滚动条压住。
 * 强制使用自定义滚动条，调用方不能切回 native。
 */
export const AdminScrollArea = (props: ScrollAreaProps) => (
  <ScrollArea {...props} offsetScrollbars />
);
