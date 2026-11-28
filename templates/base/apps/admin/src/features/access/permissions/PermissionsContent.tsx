import { useCallback, useRef, useState } from "react";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  permissionsControllerCreate,
  permissionsControllerList,
  permissionsControllerRemove,
  permissionsControllerUpdate,
  type PermissionResponseDto,
} from "@starter/api/generated";
import { getApiErrorMessage } from "@/lib/api-error";
import {
  DataTableCardList,
  DataTableContent,
  DataTableFilterBar,
  DataTablePagination,
  DataTableProvider,
  DataTableTable,
  DataTableToolbar,
  dataTableLabels,
  paginationLabels as pageLabels,
  useDataTable,
  type ColumnDef,
  type DataTableApi,
  type DataTableLabels,
  type QueryContext,
} from "@/components/DataTable";

type PermissionRow = {
  key: string;
  id: string;
  code: string;
  name: string;
  description: string;
  group: string;
  roleCount: number;
  updatedAt: string;
};

type PermissionForm = {
  code: string;
  name: string;
  description: string;
};

const toRow = (permission: PermissionResponseDto): PermissionRow => ({
  key: permission.id,
  id: permission.id,
  code: permission.code,
  name: permission.name,
  description: permission.description ?? "",
  group: permission.code.split(":")[0] ?? permission.code,
  roleCount: permission.roleCount,
  updatedAt: new Date(permission.updatedAt).toLocaleString(),
});

const labels: DataTableLabels = {
  ...dataTableLabels,
  searchPlaceholder: "搜索名称 / code",
  search: "搜索",
  moreFilters: "更多筛选",
  applyFilters: "应用筛选",
  cancelFilters: "取消",
  clearFilter: (label) => `清除${label}筛选`,
  emptyTitle: "暂无权限点",
  emptyDescription: "权限点全局定义，创建后可在角色中分配",
  create: "新建权限点",
  confirmDelete: (n) => `确定删除选中的 ${n} 个权限点？被角色引用时会被拒绝。`,
  confirmEnable: (n) => `确定启用选中的 ${n} 个权限点？`,
  confirmDisable: (n) => `确定停用选中的 ${n} 个权限点？`,
};

const emptyForm: PermissionForm = {
  code: "",
  name: "",
  description: "",
};

/** 权限点管理：全局定义，服务端 DataTable */
export const PermissionsContent = () => {
  const apiRef = useRef<DataTableApi<PermissionRow> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<PermissionRow | null>(null);
  const [form, setForm] = useState<PermissionForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm(emptyForm);
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (row: PermissionRow) => {
    setForm({ code: row.code, name: row.name, description: row.description });
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
        const res = await permissionsControllerCreate({
          body: {
            code: form.code.trim(),
            name: form.name.trim(),
            ...(form.description.trim() ? { description: form.description.trim() } : {}),
          },
        });
        if (res.error || !res.data) {
          setActionError(getApiErrorMessage(res.error, "创建失败：code 可能已存在"));
          return;
        }
        apiRef.current?.applyMutation({ row: toRow(res.data), mode: "create" });
      } else if (editing) {
        const res = await permissionsControllerUpdate({
          path: { id: editing.id },
          body: {
            name: form.name.trim(),
            description: form.description.trim(),
          },
        });
        if (res.error || !res.data) {
          setActionError(getApiErrorMessage(res.error, "更新失败"));
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

  const remove = async (row: PermissionRow) => {
    if (!window.confirm(`确认删除权限点「${row.name}」？`)) return;
    setActionError(null);
    try {
      const res = await permissionsControllerRemove({ path: { id: row.id } });
      if (res.error) {
        setActionError(getApiErrorMessage(res.error, "删除失败：权限点仍被角色引用"));
        return;
      }
      apiRef.current?.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: ColumnDef<PermissionRow>[] = [
    { key: "name", title: "名称", width: 180 },
    { key: "code", title: "code", width: 220 },
    {
      key: "group",
      title: "分组",
      width: 110,
      render: (row) => (
        <Badge variant="light" color="gray">
          {row.group}
        </Badge>
      ),
    },
    {
      key: "description",
      title: "描述",
      width: 260,
      render: (row) =>
        row.description ? (
          <Text size="sm" c="dimmed" lineClamp={1}>
            {row.description}
          </Text>
        ) : (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ),
    },
    { key: "roleCount", title: "角色数", width: 90 },
    { key: "updatedAt", title: "更新时间", width: 170 },
    {
      key: "key",
      title: "操作",
      width: 110,
      render: (row) => (
        <Group gap={4} wrap="nowrap">
          <Tooltip label="编辑">
            <ActionIcon variant="subtle" onClick={() => openEdit(row)}>
              <IconEdit size={16} />
            </ActionIcon>
          </Tooltip>
          {row.roleCount > 0 ? (
            <Tooltip label={`被 ${row.roleCount} 个角色引用，不能删除`}>
              <ActionIcon variant="subtle" color="red" disabled>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          ) : (
            <Tooltip label="删除">
              <ActionIcon variant="subtle" color="red" onClick={() => void remove(row)}>
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          )}
        </Group>
      ),
    },
  ];

  // 必须稳定引用：内联函数会让 reload 每次渲染变化，触发无限请求
  const queryOptions = useCallback(async (ctx: QueryContext<PermissionRow>) => {
    const api = apiRef.current;
    api?.setLoading(true);
    setActionError(null);
    try {
      const res = await permissionsControllerList({
        query: {
          page: ctx.page,
          pageSize: ctx.pageSize,
          ...(ctx.keyword ? { keyword: ctx.keyword } : {}),
        },
      });
      if (res.error) {
        api?.setError(getApiErrorMessage(res.error, "加载权限点失败"));
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

  const table = useDataTable<PermissionRow>({
    getRowKey: (row) => row.key,
    keywordFields: ["name", "code"],
    columns,
    filterFields: [],
    labels,
    paginationLabels: pageLabels,
    queryOptions,
  });

  apiRef.current = table;

  return (
    <Stack gap="md">
      {actionError && <Alert color="red">{actionError}</Alert>}

      <DataTableProvider table={table}>
        <DataTableFilterBar />
        <DataTableToolbar>
          <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
            {labels.create}
          </Button>
        </DataTableToolbar>
        <DataTableContent>
          <DataTableTable />
          <DataTableCardList />
        </DataTableContent>
        <DataTablePagination />
      </DataTableProvider>

      <Modal
        opened={creating || Boolean(editing)}
        onClose={closeModal}
        title={creating ? "新建权限点" : "编辑权限点"}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="code"
            required={creating}
            disabled={Boolean(editing)}
            description="resource:action 形式，如 order:approve；创建后不可修改"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.currentTarget.value })}
          />
          <TextInput
            label="名称"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
          />
          <Textarea
            label="描述"
            autosize
            minRows={2}
            maxRows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.currentTarget.value })}
          />
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
