import { IconEdit, IconPlus, IconTrash, IconUsers } from "@tabler/icons-react";
import { ActionIcon, Alert, Badge, Button, Group, Modal, Select, Stack, TextInput, Tooltip } from "@mantine/core";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  tenantsControllerCreate,
  tenantsControllerList,
  tenantsControllerRemove,
  tenantsControllerUpdate,
  type TenantResponseDto,
} from "@starter/api/generated";
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

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  createdAt: string;
};

type TenantForm = {
  name: string;
  slug: string;
  status: TenantRow["status"];
  initialAdminEmail: string;
};

const toRow = (tenant: TenantResponseDto): TenantRow => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  status: tenant.status as TenantRow["status"],
  createdAt: new Date(tenant.createdAt).toLocaleString(),
});

const STATUS_OPTIONS = [
  { value: "active", label: "正常" },
  { value: "suspended", label: "已停用" },
];

const labels: DataTableLabels = {
  ...dataTableLabels,
  searchPlaceholder: "搜索租户 name / slug…",
  search: "搜索",
  moreFilters: "更多筛选",
  applyFilters: "应用筛选",
  cancelFilters: "取消",
  clearFilter: (label) => `清除${label}筛选`,
  emptyTitle: "暂无租户",
  emptyDescription: "创建第一个租户后即可在此管理。",
  create: "新建租户",
  confirmDelete: (n) => `确定删除选中的 ${n} 个租户？有成员/订阅时会被拒绝。`,
};

const filterFields = [
  selectField({
    key: "status",
    label: "状态",
    allLabel: "全部",
    options: STATUS_OPTIONS,
  }),
];

/**
 * 租户列表：服务端模式。
 * 搜索/筛选/排序/分页变化都会触发 queryOptions，重新请求后端（搜索=刷新，不做前端过滤）。
 */
export const TenantsContent = () => {
  const navigate = useNavigate();
  const apiRef = useRef<DataTableApi<TenantRow> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TenantRow | null>(null);
  const [form, setForm] = useState<TenantForm>({
    name: "",
    slug: "",
    status: "active",
    initialAdminEmail: "",
  });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setForm({
      name: "",
      slug: "",
      status: "active",
      initialAdminEmail: "",
    });
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (row: TenantRow) => {
    setForm({ name: row.name, slug: row.slug, status: row.status, initialAdminEmail: "" });
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
        const res = await tenantsControllerCreate({
          body: {
            name: form.name,
            slug: form.slug,
            ...(form.initialAdminEmail.trim()
              ? { initialAdminEmail: form.initialAdminEmail.trim() }
              : {}),
          },
        });
        if (res.error || !res.data) {
          setActionError("创建失败：slug 可能已存在，或初始管理员邮箱无效");
          return;
        }
        apiRef.current?.applyMutation({ row: toRow(res.data), mode: "create" });
      } else if (editing) {
        const res = await tenantsControllerUpdate({
          path: { id: editing.id },
          body: { name: form.name, status: form.status },
        });
        if (res.error || !res.data) {
          setActionError("更新失败");
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

  const remove = async (row: TenantRow) => {
    if (!window.confirm(`确认删除租户「${row.name}」？有成员/订阅时会被拒绝。`)) {
      return;
    }
    setActionError(null);
    try {
      const res = await tenantsControllerRemove({ path: { id: row.id } });
      if (res.error) {
        setActionError("删除失败：租户仍有成员或订阅");
        return;
      }
      apiRef.current?.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "删除失败");
    }
  };

  const columns: ColumnDef<TenantRow>[] = [
    { key: "name", title: "名称", width: 200, sortable: true },
    { key: "slug", title: "slug", width: 200, sortable: true },
    {
      key: "status",
      title: "状态",
      width: 100,
      sortable: true,
      render: (row) => (
        <Badge color={row.status === "active" ? "green" : "gray"} variant="light">
          {row.status === "active" ? "正常" : "已停用"}
        </Badge>
      ),
    },
    { key: "createdAt", title: "创建时间", width: 180, sortable: true },
    {
      key: "id",
      title: "操作",
      width: 110,
      render: (row) => (
        <Group gap={4} wrap="nowrap">
          <Tooltip label="成员">
            <ActionIcon
              variant="subtle"
              onClick={() =>
                navigate({
                  to: "/access/tenant-members/$tenantId",
                  params: { tenantId: row.id },
                })
              }
            >
              <IconUsers size={16} />
            </ActionIcon>
          </Tooltip>
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

  // 必须稳定引用：内联函数会让 reload 每次渲染变化，触发 effect 无限请求
  const queryOptions = useCallback(async (ctx: QueryContext<TenantRow>) => {
    const api = apiRef.current;
    api?.setLoading(true);
    try {
      const res = await tenantsControllerList({
        query: {
          page: ctx.page,
          pageSize: ctx.pageSize,
          ...(ctx.keyword ? { keyword: ctx.keyword } : {}),
          ...(ctx.filters.status
            ? { status: ctx.filters.status as TenantRow["status"] }
            : {}),
        },
      });
      if (res.error) {
        api?.setError("加载租户失败");
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

  const table = useDataTable<TenantRow>({
    getRowKey: (row) => row.id,
    keywordFields: ["name", "slug"],
    columns,
    filterFields,
    labels,
    paginationLabels: pageLabels,
    initialFilters: { status: null },
    queryOptions,
  });

  // 首次 queryOptions 在 mount effect 中执行，渲染时已能拿到实例
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
        title={creating ? "新建租户" : "编辑租户"}
      >
        <Stack gap="md">
          <TextInput
            label="名称"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.currentTarget.value })}
          />
          <TextInput
            label="slug"
            value={form.slug}
            disabled={Boolean(editing)}
            description="小写字母、数字、-，创建后不可修改"
            onChange={(e) => setForm({ ...form, slug: e.currentTarget.value })}
          />
          {creating && (
            <TextInput
              label="初始管理员邮箱（可选）"
              type="email"
              value={form.initialAdminEmail}
              description="填写已存在用户邮箱：创建后自动加入租户并授予管理员角色"
              onChange={(e) =>
                setForm({ ...form, initialAdminEmail: e.currentTarget.value })
              }
            />
          )}          {editing && (
            <Select
              label="状态"
              data={STATUS_OPTIONS}
              value={form.status}
              onChange={(value) =>
                setForm({ ...form, status: (value as TenantRow["status"]) ?? "active" })
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
