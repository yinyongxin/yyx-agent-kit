import { useCallback, useRef, useState } from "react";
import { IconBan, IconCheck, IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  PasswordInput,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  usersControllerCreate,
  usersControllerList,
  usersControllerRemove,
  usersControllerUpdate,
  type UserResponseDto,
} from "@starter/api/generated";
import {
  DataTableBatchBar,
  DataTableCardList,
  DataTableContent,
  DataTableFilterBar,
  DataTablePagination,
  DataTableProvider,
  DataTableTable,
  DataTableToolbar,
  dataTableLabels,
  paginationLabels as pageLabels,
  selectField,
  useDataTable,
  type ColumnDef,
  type DataTableApi,
  type DataTableBatchAction,
  type DataTableLabels,
  type QueryContext,
} from "@/components/DataTable";
import { useMe } from "@/lib/me";

type UserStatus = "active" | "disabled";

type UserRow = {
  key: string;
  id: string;
  email: string;
  displayName: string;
  status: UserStatus;
  tenantCount: number;
  createdAt: string;
};

type UserForm = {
  email: string;
  displayName: string;
  password: string;
  status: UserStatus;
};

const STATUS_OPTIONS = [
  { value: "active", label: "正常" },
  { value: "disabled", label: "已禁用" },
];

const toRow = (user: UserResponseDto): UserRow => ({
  key: user.id,
  id: user.id,
  email: user.email ?? "-",
  displayName: user.displayName ?? "",
  status: user.status as UserStatus,
  tenantCount: user.tenantCount,
  createdAt: new Date(user.createdAt).toLocaleString(),
});

const labels: DataTableLabels = {
  ...dataTableLabels,
  searchPlaceholder: "搜索邮箱 / 显示名",
  search: "搜索",
  moreFilters: "更多筛选",
  applyFilters: "应用筛选",
  cancelFilters: "取消",
  clearFilter: (label) => `清除${label}筛选`,
  emptyTitle: "暂无用户",
  emptyDescription: "创建第一个用户后即可在此管理",
  create: "新建用户",
  confirmDelete: (n) => `确定删除选中的 ${n} 个用户？会同时移除其租户成员关系。`,
  confirmEnable: (n) => `确定启用选中的 ${n} 个用户？`,
  confirmDisable: (n) => `确定禁用选中的 ${n} 个用户？禁用后无法登录。`,
};

const filterFields = [
  selectField({
    key: "status",
    label: "状态",
    allLabel: "全部状态",
    options: STATUS_OPTIONS,
  }),
];

const emptyForm: UserForm = {
  email: "",
  displayName: "",
  password: "",
  status: "active",
};

/** 用户管理：服务端模式，搜索/筛选/分页走后端 */
export const UsersContent = () => {
  const { me } = useMe();
  const canWrite = me?.platformAdminLevel === "super";
  const apiRef = useRef<DataTableApi<UserRow> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm(emptyForm);
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (row: UserRow) => {
    setForm({
      email: row.email,
      displayName: row.displayName,
      password: "",
      status: row.status,
    });
    setEditing(row);
    setCreating(false);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = async () => {
    setSaving(true);
    setActionError(null);
    try {
      if (creating) {
        const res = await usersControllerCreate({
          body: {
            email: form.email,
            ...(form.displayName ? { displayName: form.displayName } : {}),
            password: form.password,
          },
        });
        if (res.error || !res.data) {
          setActionError("创建失败：邮箱可能已存在，或密码不符合要求（至少 8 位）");
          return;
        }
        apiRef.current?.applyMutation({ row: toRow(res.data), mode: "create" });
      } else if (editing) {
        const res = await usersControllerUpdate({
          path: { id: editing.id },
          body: {
            email: form.email,
            displayName: form.displayName,
            status: form.status,
            ...(form.password ? { password: form.password } : {}),
          },
        });
        if (res.error || !res.data) {
          setActionError("更新失败：邮箱可能已被占用");
          return;
        }
        apiRef.current?.applyMutation({
          row: toRow(res.data),
          mode: "edit",
          previous: editing,
        });
      }
      closeModal();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: UserRow) => {
    if (!window.confirm(`确认删除用户「${row.displayName || row.email}」？`)) return;
    setActionError(null);
    try {
      const res = await usersControllerRemove({ path: { id: row.id } });
      if (res.error) {
        setActionError("删除失败：不能删除当前登录用户");
        return;
      }
      apiRef.current?.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: ColumnDef<UserRow>[] = [
    {
      key: "displayName",
      title: "用户",
      width: 220,
      render: (row) => (
        <Group gap="xs" wrap="nowrap">
          <Avatar size="sm" color="blue" radius="xl">
            {(row.displayName || row.email).slice(0, 1).toUpperCase()}
          </Avatar>
          <Text size="sm" fw={500}>
            {row.displayName || "未命名"}
          </Text>
        </Group>
      ),
    },
    { key: "email", title: "邮箱", width: 240 },
    {
      key: "status",
      title: "状态",
      width: 100,
      render: (row) => (
        <Badge color={row.status === "active" ? "green" : "gray"} variant="light">
          {row.status === "active" ? "正常" : "已禁用"}
        </Badge>
      ),
    },
    { key: "tenantCount", title: "租户数", width: 90 },
    { key: "createdAt", title: "创建时间", width: 170 },
    {
      key: "key",
      title: "操作",
      width: 110,
      hidden: !canWrite,
      render: (row) =>
        canWrite ? (
          <Group gap={4} wrap="nowrap">
            <Tooltip label="编辑">
              <ActionIcon variant="subtle" onClick={() => openEdit(row)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="删除">
              <ActionIcon variant="subtle" color="red" onClick={() => void remove(row)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        ) : (
          <Text size="sm" c="dimmed">—</Text>
        ),
    },
  ];

  // 必须稳定引用：内联函数会让 reload 每次渲染变化，触发无限请求
  const queryOptions = useCallback(async (ctx: QueryContext<UserRow>) => {
    const api = apiRef.current;
    api?.setLoading(true);
    setActionError(null);
    try {
      const res = await usersControllerList({
        query: {
          page: ctx.page,
          pageSize: ctx.pageSize,
          ...(ctx.keyword ? { keyword: ctx.keyword } : {}),
          ...(ctx.filters.status
            ? { status: ctx.filters.status as UserStatus }
            : {}),
        },
      });
      if (res.error) {
        api?.setError("加载用户失败");
        return;
      }
      api?.setData((res.data?.items ?? []).map(toRow));
      api?.setTotal(res.data?.total ?? 0);
    } catch (err) {
      api?.setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      api?.setLoading(false);
    }
  }, []);

  const table = useDataTable<UserRow>({
    getRowKey: (row) => row.key,
    selectable: canWrite,
    keywordFields: ["email", "displayName"],
    columns,
    filterFields,
    labels,
    paginationLabels: pageLabels,
    initialFilters: { status: null },
    queryOptions,
  });

  apiRef.current = table;

  /** 批量操作：逐条调用后端（模板不额外提供批量接口） */
  const batchUpdateStatus = async (keys: string[], status: UserStatus) => {
    setActionError(null);
    const results = await Promise.all(
      keys.map((id) => usersControllerUpdate({ path: { id }, body: { status } })),
    );
    if (results.some((res) => res.error)) {
      setActionError("部分用户更新失败");
    }
    table.clearSelection();
    table.reload();
  };

  const batchRemove = async (keys: string[]) => {
    setActionError(null);
    const results = await Promise.all(
      keys.map((id) => usersControllerRemove({ path: { id } })),
    );
    if (results.some((res) => res.error)) {
      setActionError("部分用户删除失败（可能包含当前登录用户）");
    }
    table.clearSelection();
    table.reload();
  };

  const batchActions: DataTableBatchAction[] = [
    {
      key: "delete",
      label: labels.batchDelete,
      icon: <IconTrash size={14} />,
      color: "red",
      confirm: labels.confirmDelete,
      run: (keys) => void batchRemove(keys.map(String)),
    },
    {
      key: "enable",
      label: labels.batchEnable,
      icon: <IconCheck size={14} />,
      confirm: labels.confirmEnable,
      run: (keys) => void batchUpdateStatus(keys.map(String), "active"),
    },
    {
      key: "disable",
      label: labels.batchDisable,
      icon: <IconBan size={14} />,
      confirm: labels.confirmDisable,
      run: (keys) => void batchUpdateStatus(keys.map(String), "disabled"),
    },
  ];

  return (
    <Stack gap="md" pb={table.selected.size > 0 ? 80 : 0}>
      {actionError && <Alert color="red">{actionError}</Alert>}

      <DataTableProvider table={table}>
        <DataTableFilterBar />
        <DataTableToolbar>
          {canWrite && (
            <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
              {labels.create}
            </Button>
          )}
        </DataTableToolbar>
        <DataTableContent>
          <DataTableTable />
          <DataTableCardList />
        </DataTableContent>
        <DataTablePagination />
      </DataTableProvider>

      {canWrite && <DataTableBatchBar table={table} actions={batchActions} />}

      <Modal
        opened={creating || Boolean(editing)}
        onClose={closeModal}
        title={creating ? "新建用户" : "编辑用户"}
      >
        <Stack gap="md">
          <TextInput
            label="邮箱"
            required={creating}
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.currentTarget.value })}
          />
          <TextInput
            label="显示名"
            autoComplete="name"
            value={form.displayName}
            onChange={(e) => setForm({ ...form, displayName: e.currentTarget.value })}
          />
          <PasswordInput
            label={creating ? "初始密码" : "重置密码（留空不修改）"}
            required={creating}
            autoComplete="new-password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.currentTarget.value })}
          />
          {editing && (
            <Select
              label="状态"
              data={STATUS_OPTIONS}
              value={form.status}
              onChange={(value) =>
                setForm({ ...form, status: (value as UserStatus) ?? "active" })
              }
            />
          )}
          <Group justify="flex-end">
            <Button variant="default" onClick={closeModal}>
              取消
            </Button>
            <Button onClick={() => void save()} loading={saving}>
              保存
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Stack>
  );
};
