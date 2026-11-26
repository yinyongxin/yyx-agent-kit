import { IconBan, IconCheck, IconPlus, IconTrash } from "@tabler/icons-react";
import {
  ActionBar,
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Modal,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import {
  DataTable,
  DataTableCardList,
  DataTableContent,
  DataTableFilterBar,
  DataTablePagination,
  DataTableTable,
  DataTableToolbar,
  dataTableLabels as labels,
  paginationLabels as pageLabels,
  statusField,
  useDataTable,
  type ColumnDef,
} from "@/components/DataTable";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "disabled";
  createdAt: string;
};

type BatchAction = "delete" | "enable" | "disable";

/** 静态示例数据；接入后端后改为 api 层提供 */
const makeUsers = (): UserRow[] =>
  Array.from({ length: 25 }, (_, index) => ({
    id: `u-${String(index + 1).padStart(3, "0")}`,
    name: `用户 ${index + 1}`,
    email: `user${index + 1}@example.com`,
    role: index % 4 === 0 ? "admin" : "member",
    status: index % 5 === 0 ? "disabled" : "active",
    createdAt: `2026-11-${String((index % 24) + 1).padStart(2, "0")}`,
  }));

const columns: ColumnDef<UserRow>[] = [
  {
    key: "name",
    title: "用户",
    width: 200,
    render: (row) => (
      <Group gap="xs" wrap="nowrap">
        <Avatar size="sm" color="blue" radius="xl">
          {row.name.slice(-1)}
        </Avatar>
        <Text size="sm" fw={500}>
          {row.name}
        </Text>
      </Group>
    ),
  },
  { key: "email", title: "邮箱", width: 240, sortable: true },
  {
    key: "role",
    title: "角色",
    width: 120,
    render: (row) => (
      <Badge color={row.role === "admin" ? "blue" : "gray"} variant="light">
        {row.role === "admin" ? "管理员" : "普通成员"}
      </Badge>
    ),
  },
  {
    key: "status",
    title: "状态",
    width: 100,
    sortable: true,
    render: (row) => (
      <Badge color={row.status === "active" ? "green" : "gray"} variant="light">
        {row.status === "active" ? "正常" : "禁用"}
      </Badge>
    ),
  },
  { key: "createdAt", title: "创建时间", width: 140, sortable: true },
  {
    key: "id",
    title: "操作",
    width: 120,
    render: () => (
      <Group gap={4} wrap="nowrap">
        <Button variant="subtle" size="compact-sm">
          编辑
        </Button>
        <Button variant="subtle" size="compact-sm" color="red">
          删除
        </Button>
      </Group>
    ),
  },
];

const filterFields = [
  statusField({ label: "状态", allLabel: "全部", active: "正常", disabled: "禁用" }),
];

/** 用户管理列表页内容：只给列定义 + 筛选配置 + 数据，四态由 DataTable 底座处理 */
export const UsersContent = () => {
  const [users, setUsers] = useState<UserRow[]>(makeUsers);
  const [action, setAction] = useState<BatchAction | null>(null);

  const list = useDataTable({
    data: users,
    getRowKey: (row: UserRow) => row.id,
    keywordFields: ["name", "email"],
    initialFilters: { status: null },
  });

  const confirmMessage =
    action === "delete"
      ? labels.confirmDelete(list.selected.size)
      : action === "enable"
        ? labels.confirmEnable(list.selected.size)
        : action === "disable"
          ? labels.confirmDisable(list.selected.size)
          : "";

  const applyBatch = () => {
    const chosen = new Set(list.selected);
    if (action === "delete") {
      setUsers((prev) => prev.filter((row) => !chosen.has(row.id)));
    } else if (action === "enable" || action === "disable") {
      const status = action === "enable" ? "active" : "disabled";
      setUsers((prev) =>
        prev.map((row) => (chosen.has(row.id) ? { ...row, status } : row)),
      );
    }
    list.clearSelection();
    setAction(null);
  };

  return (
    <Stack gap="md" pb={list.selected.size > 0 ? 80 : 0}>
      <DataTable
        list={list}
        columns={columns}
        filterFields={filterFields}
        labels={labels}
        paginationLabels={pageLabels}
        getRowKey={(row: UserRow) => row.id}
        onEmptyAction={() => undefined}
      >
        <DataTableToolbar>
          <Button leftSection={<IconPlus size={16} />}>{labels.create}</Button>
        </DataTableToolbar>
        <DataTableFilterBar />
        <DataTableContent>
          <Box visibleFrom="sm">
            <DataTableTable />
          </Box>
          <DataTableCardList />
        </DataTableContent>
        <DataTablePagination />
      </DataTable>

      <ActionBar
        opened={list.selected.size > 0}
        onClose={list.clearSelection}
        aria-label="批量操作"
      >
        <Group gap="xs">
          <Text size="sm">{labels.selectedCount(list.selected.size)}</Text>
          <Button
            size="xs"
            color="red"
            leftSection={<IconTrash size={14} />}
            onClick={() => setAction("delete")}
          >
            {labels.batchDelete}
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconCheck size={14} />}
            onClick={() => setAction("enable")}
          >
            {labels.batchEnable}
          </Button>
          <Button
            size="xs"
            variant="light"
            leftSection={<IconBan size={14} />}
            onClick={() => setAction("disable")}
          >
            {labels.batchDisable}
          </Button>
        </Group>
      </ActionBar>

      <Modal
        opened={action !== null}
        onClose={() => setAction(null)}
        title="确认操作"
        centered
      >
        <Text size="sm">{confirmMessage}</Text>
        <Group justify="flex-end" mt="lg">
          <Button variant="subtle" onClick={() => setAction(null)}>
            取消
          </Button>
          <Button color={action === "delete" ? "red" : "blue"} onClick={applyBatch}>
            确认
          </Button>
        </Group>
      </Modal>
    </Stack>
  );
};
