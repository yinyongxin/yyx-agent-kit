import { IconBan, IconCheck, IconPlus, IconTrash } from "@tabler/icons-react";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Group,
  Stack,
  Text,
} from "@mantine/core";
import { useState } from "react";
import {
  DataTable,
  DataTableBatchBar,
  DataTableCardList,
  DataTableContent,
  DataTableFilterBar,
  DataTablePagination,
  DataTableTable,
  DataTableToolbar,
  dataTableLabels,
  paginationLabels as pageLabels,
  selectField,
  useDataTable,
  type ColumnDef,
  type DataTableBatchAction,
  type DataTableLabels,
} from "@/components/DataTable";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "admin" | "member";
  status: "active" | "disabled";
  createdAt: string;
};

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
  selectField({
    key: "status",
    label: "状态",
    allLabel: "全部",
    options: [
      { label: "正常", value: "active" },
      { label: "禁用", value: "disabled" },
    ],
  }),
];

/** 业务页注入自己的文案：底座的 dataTableLabels 只提供中性默认值 */
const labels: DataTableLabels = {
  ...dataTableLabels,
  searchPlaceholder: "搜索用户…",
  emptyTitle: "暂无用户数据",
  emptyDescription: "创建第一个用户后即可在此管理。",
  create: "新建用户",
  confirmDelete: (n) => `确定删除选中的 ${n} 个用户？此操作不可撤销。`,
  confirmEnable: (n) => `确定启用选中的 ${n} 个用户？`,
  confirmDisable: (n) => `确定停用选中的 ${n} 个用户？停用后无法登录。`,
};

/** 用户管理列表页内容：只给列定义 + 筛选配置 + 数据，四态由 DataTable 底座处理 */
export const UsersContent = () => {
  const [users, setUsers] = useState<UserRow[]>(makeUsers);

  const list = useDataTable({
    data: users,
    getRowKey: (row: UserRow) => row.id,
    keywordFields: ["name", "email"],
    initialFilters: { status: null },
  });

  /** 批量动作：选中态、确认弹窗与清空由底座处理，这里只写真正的数据变更 */
  const batchActions: DataTableBatchAction[] = [
    {
      key: "delete",
      label: labels.batchDelete,
      icon: <IconTrash size={14} />,
      color: "red",
      confirm: labels.confirmDelete,
      run: (keys) => setUsers((prev) => prev.filter((row) => !keys.includes(row.id))),
    },
    {
      key: "enable",
      label: labels.batchEnable,
      icon: <IconCheck size={14} />,
      confirm: labels.confirmEnable,
      run: (keys) =>
        setUsers((prev) =>
          prev.map((row) => (keys.includes(row.id) ? { ...row, status: "active" } : row)),
        ),
    },
    {
      key: "disable",
      label: labels.batchDisable,
      icon: <IconBan size={14} />,
      confirm: labels.confirmDisable,
      run: (keys) =>
        setUsers((prev) =>
          prev.map((row) => (keys.includes(row.id) ? { ...row, status: "disabled" } : row)),
        ),
    },
  ];

  return (
    <Stack gap="md" pb={list.selected.size > 0 ? 80 : 0}>
      <DataTable
        list={list}
        columns={columns}
        filterFields={filterFields}
        labels={labels}
        paginationLabels={pageLabels}
        getRowKey={(row: UserRow) => row.id}
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

      <DataTableBatchBar actions={batchActions} />
    </Stack>
  );
};
