import { IconChevronRight, type TablerIcon } from "@tabler/icons-react";
import { Box, Collapse, Group, ThemeIcon, UnstyledButton } from "@mantine/core";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import classes from "./NavbarLinksGroup.module.css";

interface LinksGroupProps {
  icon: TablerIcon;
  label: string;
  initiallyOpened?: boolean;
  links: { label: string; link: string }[];
}

interface NavbarLeafProps {
  icon: TablerIcon;
  label: string;
  to: string;
}

// 一级叶子节点：不折叠，直接跳路由
export const NavbarLeaf = ({ icon: Icon, label, to }: NavbarLeafProps) => (
  <Link
    to={to}
    className={classes.control}
    style={{ textDecoration: "none" }}
    activeProps={{ className: classes.linkActive }}
    activeOptions={{ exact: to === "/" }}
  >
    <Group justify="space-between" gap={0}>
      <Box style={{ display: "flex", alignItems: "center" }}>
        <ThemeIcon variant="light" size={30}>
          <Icon size={18} />
        </ThemeIcon>
        <Box ml="md">{label}</Box>
      </Box>
    </Group>
  </Link>
);

// 基于 ui.mantine.dev 官方 LinksGroup：分组可折叠，子链接改用 TanStack Link
export const LinksGroup = ({
  icon: Icon,
  label,
  initiallyOpened,
  links,
}: LinksGroupProps) => {
  const [opened, setOpened] = useState(initiallyOpened ?? false);
  const items = links.map((link) => (
    <Link
      to={link.link}
      className={classes.link}
      key={link.label}
      activeProps={{ className: classes.linkActive }}
    >
      {link.label}
    </Link>
  ));

  return (
    <>
      <UnstyledButton onClick={() => setOpened((o) => !o)} className={classes.control}>
        <Group justify="space-between" gap={0}>
          <Box style={{ display: "flex", alignItems: "center" }}>
            <ThemeIcon variant="light" size={30}>
              <Icon size={18} />
            </ThemeIcon>
            <Box ml="md">{label}</Box>
          </Box>
          <IconChevronRight
            className={classes.chevron}
            stroke={1.5}
            size={16}
            style={{ transform: opened ? "rotate(-90deg)" : "none" }}
          />
        </Group>
      </UnstyledButton>
      <Collapse expanded={opened}>{items}</Collapse>
    </>
  );
};
