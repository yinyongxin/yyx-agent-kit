import { ScrollArea, type ScrollAreaProps } from "@mantine/core";

/**
 * 管理端统一滚动容器：Mantine 自定义滚动条是覆盖层、不占布局宽度，
 * 不会像原生滚动条那样在出现/消失时把页面顶得跳动。
 * 强制使用自定义滚动条，调用方不能切回 native。
 */
export const AdminScrollArea = (props: ScrollAreaProps) => <ScrollArea {...props} />;
