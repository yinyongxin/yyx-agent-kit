import { ScrollArea, type ScrollAreaProps } from "@mantine/core";

/**
 * 管理端统一滚动容器：Mantine 自定义滚动条是覆盖层，设 offsetScrollbars=false
 * 让它不占布局宽度，也不会在出现/消失时把页面顶得跳动。
 * 调用方传入的 offsetScrollbars 优先，可按需开启。
 */
export const AdminScrollArea = (props: ScrollAreaProps) => (
  <ScrollArea offsetScrollbars={false} {...props} />
);
