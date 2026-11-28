import { useCallback, useEffect, useRef, useState } from "react";
import { IconEdit, IconPlus, IconTrash } from "@tabler/icons-react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  MultiSelect,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  tenantPermissionsControllerList,
  rolesControllerCreate,
  rolesControllerList,
  rolesControllerRemove,
  rolesControllerUpdate,
  type RoleResponseDto,
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
  selectField,
  useDataTable,
  type ColumnDef,
  type DataTableApi,
  type DataTableLabels,
  type QueryContext,
} from "@/components/DataTable";

type RoleKind = "system" | "custom";

type RoleRow = {
  key: string;
  id: string;
  code: string;
  name: string;
  description: string;
  isSystem: boolean;
  kind: RoleKind;
  permissionCodes: string[];
  permissionCount: number;
  userCount: number;
  updatedAt: string;
};

type RoleForm = {
  code: string;
  name: string;
  description: string;
  permissionCodes: string[];
};

const toRow = (role: RoleResponseDto): RoleRow => ({
  key: role.id,
  id: role.id,
  code: role.code,
  name: role.name,
  description: role.description ?? "",
  isSystem: role.isSystem,
  kind: role.isSystem ? "system" : "custom",
  permissionCodes: role.permissionCodes,
  permissionCount: role.permissionCount,
  userCount: role.userCount,
  updatedAt: new Date(role.updatedAt).toLocaleString(),
});

const KIND_OPTIONS = [
  { value: "system", label: "内置" },
  { value: "custom", label: "自定义" },
];

const labels: DataTableLabels = {
  ...dataTableLabels,
  searchPlaceholder: "搜索角色名称 / code",
  search: "搜索",
  moreFilters: "更多筛选",
  applyFilters: "应用筛选",
  cancelFilters: "取消",
  clearFilter: (label) => `清除${label}筛选`,
  emptyTitle: "暂无角色",
  emptyDescription: "创建自定义角色后即可在此分配权限",
  create: "新建角色",
  confirmDelete: (n) => `确定删除选中的 ${n} 个角色？有成员使用时会被拒绝。`,
  confirmEnable: (n) => `确定启用选中的 ${n} 个角色？`,
  confirmDisable: (n) => `确定停用选中的 ${n} 个角色？`,
};

const filterFields = [
  selectField({
    key: "kind",
    label: "类型",
    allLabel: "全部类型",
    options: KIND_OPTIONS,
  }),
];

const emptyForm: RoleForm = {
  code: "",
  name: "",
  description: "",
  permissionCodes: [],
};

export const RolesTable = ({ tenantId }: { tenantId: string }) => {
  const apiRef = useRef<DataTableApi<RoleRow> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [permissionOptions, setPermissionOptions] = useState<
    { value: string; label: string }[]
  >([]);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<RoleRow | null>(null);
  const [form, setForm] = useState<RoleForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void tenantPermissionsControllerList({ path: { tenantId } }).then((res) => {
      if (!alive || res.error || !res.data) return;
      setPermissionOptions(
        res.data.map((permission) => ({
          value: permission.code,
          label: `${permission.name}（${permission.code}）`,
        })),
      );
    });
    return () => {
      alive = false;
    };
  }, [tenantId]);

  const openCreate = () => {
    setForm(emptyForm);
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (row: RoleRow) => {
    setForm({
      code: row.code,
      name: row.name,
      description: row.description,
      permissionCodes: row.permissionCodes,
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
        const res = await rolesControllerCreate({
          path: { tenantId },
          body: {
            code: form.code.trim(),
            name: form.name.trim(),
            ...(form.description.trim() ? { description: form.description.trim() } : {}),
            permissionCodes: form.permissionCodes,
          },
        });
        if (res.error || !res.data) {
          setActionError(getApiErrorMessage(res.error, "创建失败：code 可能已存在"));
          return;
        }
        apiRef.current?.applyMutation({ row: toRow(res.data), mode: "create" });
      } else if (editing) {
        const res = await rolesControllerUpdate({
          path: { tenantId, roleId: editing.id },
          body: {
            name: form.name.trim(),
            description: form.description.trim(),
            permissionCodes: form.permissionCodes,
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

  const remove = async (row: RoleRow) => {
    if (!window.confirm(`确认删除角色「${row.name}」？`)) return;
    setActionError(null);
    try {
      const res = await rolesControllerRemove({
        path: { tenantId, roleId: row.id },
      });
      if (res.error) {
        setActionError(getApiErrorMessage(res.error, "删除失败：角色仍有成员使用"));
        return;
      }
      apiRef.current?.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: ColumnDef<RoleRow>[] = [
    { key: "name", title: "角色名称", width: 200 },
    { key: "code", title: "code", width: 180 },
    {
      key: "kind",
      title: "类型",
      width: 90,
      render: (row) => (
        <Badge color={row.isSystem ? "blue" : "gray"} variant="light">
          {row.isSystem ? "内置" : "自定义"}
        </Badge>
      ),
    },
    { key: "permissionCount", title: "权限数", width: 90 },
    { key: "userCount", title: "成员数", width: 90 },
    { key: "updatedAt", title: "更新时间", width: 170 },
    {
      key: "key",
      title: "操作",
      width: 110,
      render: (row) =>
        row.isSystem ? (
          <Tooltip label="内置角色由 seed 维护，不可修改">
            <Text size="sm" c="dimmed">
              —
            </Text>
          </Tooltip>
        ) : (
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
        ),
    },
  ];

  // 必须稳定引用：内联函数会让 reload 每次渲染变化，触发无限请求
  const queryOptions = useCallback(
    async (ctx: QueryContext<RoleRow>) => {
      const api = apiRef.current;
      api?.setLoading(true);
      setActionError(null);
      try {
        const res = await rolesControllerList({
          path: { tenantId },
          query: {
            page: ctx.page,
            pageSize: ctx.pageSize,
            ...(ctx.keyword ? { keyword: ctx.keyword } : {}),
            ...(ctx.filters.kind ? { kind: ctx.filters.kind as RoleKind } : {}),
          },
        });
        if (res.error) {
          api?.setError(getApiErrorMessage(res.error, "加载角色失败"));
          return;
        }
        api?.setData((res.data?.items ?? []).map(toRow));
        api?.setTotal(res.data?.total ?? 0);
      } catch (err) {
        api?.setError(err instanceof Error ? err.message : "加载失败");
      } finally {
        api?.setLoading(false);
      }
    },
    [tenantId],
  );

  const table = useDataTable<RoleRow>({
    getRowKey: (row) => row.key,
    keywordFields: ["name", "code"],
    columns,
    filterFields,
    labels,
    paginationLabels: pageLabels,
    initialFilters: { kind: null },
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
        title={creating ? "新建角色" : "编辑角色"}
        size="lg"
      >
        <Stack gap="md">
          <TextInput
            label="code"
            required={creating}
            disabled={Boolean(editing)}
            description="小写字母开头，可含数字、-、_；创建后不可修改"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.currentTarget.value })}
          />
          <TextInput
            label="角色名称"
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
          <MultiSelect
            label="权限点"
            data={permissionOptions}
            value={form.permissionCodes}
            onChange={(value) => setForm({ ...form, permissionCodes: value })}
            searchable
            description="可多选；保存时整体替换该角色的权限"
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
