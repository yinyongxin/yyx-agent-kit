import { IconEdit, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { ActionIcon, Badge, Button, Group, Loader, Modal, Select, Stack, TextInput, Tooltip } from "@mantine/core";
import { useCallback, useEffect, useState } from "react";
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
  type DataTableLabels,
} from "@/components/DataTable";

type TenantRow = {
  id: string;
  name: string;
  slug: string;
  status: "active" | "suspended";
  createdAt: string;
};

type TenantForm = { name: string; slug: string; status: TenantRow["status"] };

const PAGE_SIZE = 100; // 拉全量，前端分页；租户量过大时应改用服务端分页

const STATUS_OPTIONS = [
  { value: "active", label: "正常" },
  { value: "suspended", label: "已停用" },
];

const toRow = (tenant: TenantResponseDto): TenantRow => ({
  id: tenant.id,
  name: tenant.name,
  slug: tenant.slug,
  status: tenant.status as TenantRow["status"],
  createdAt: new Date(tenant.createdAt).toLocaleString(),
});

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

export const TenantsContent = () => {
  const [rows, setRows] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TenantRow | null>(null);
  const [form, setForm] = useState<TenantForm>({ name: "", slug: "", status: "active" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const all: TenantRow[] = [];
      for (let page = 1; page <= 50; page += 1) {
        const res = await tenantsControllerList({
          query: { page, pageSize: PAGE_SIZE },
        });
        if (res.error) {
          setError("加载租户失败");
          break;
        }
        const items = res.data?.items ?? [];
        all.push(...items.map(toRow));
        if (all.length >= (res.data?.total ?? 0) || items.length === 0) break;
      }
      setRows(all);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm({ name: "", slug: "", status: "active" });
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (row: TenantRow) => {
    setForm({ name: row.name, slug: row.slug, status: row.status });
    setEditing(row);
    setCreating(false);
  };

  const closeModal = () => {
    setCreating(false);
    setEditing(null);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        const res = await tenantsControllerCreate({
          body: { name: form.name, slug: form.slug },
        });
        if (res.error) {
          setError("创建失败：slug 可能已存在");
          return;
        }
      } else if (editing) {
        const res = await tenantsControllerUpdate({
          path: { id: editing.id },
          body: { name: form.name, status: form.status },
        });
        if (res.error) {
          setError("更新失败");
          return;
        }
      }
      closeModal();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: TenantRow) => {
    if (!window.confirm(`确认删除租户「${row.name}」？有成员/订阅时会被拒绝。`)) {
      return;
    }
    setError(null);
    try {
      const res = await tenantsControllerRemove({ path: { id: row.id } });
      if (res.error) {
        setError("删除失败：租户仍有成员或订阅");
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
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

  const table = useDataTable<TenantRow>({
    data: rows,
    getRowKey: (row) => row.id,
    keywordFields: ["name", "slug"],
    columns,
    filterFields,
    labels,
    paginationLabels: pageLabels,
    initialFilters: { status: null },
    state: loading ? "loading" : "success",
  });

  return (
    <Stack gap="md">
      {error && <div style={{ color: "var(--mantine-color-red-6)" }}>{error}</div>}

      {loading && rows.length === 0 ? (
        <Group justify="center" py="xl">
          <Loader />
        </Group>
      ) : (
        <DataTableProvider table={table}>
          <DataTableFilterBar />
          <DataTableToolbar>
            <Group gap="xs">
              <Button
                variant="light"
                leftSection={<IconRefresh size={16} />}
                onClick={() => void load()}
              >
                刷新
              </Button>
              <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
                {labels.create}
              </Button>
            </Group>
          </DataTableToolbar>
          <DataTableContent>
            <DataTableTable />
            <DataTableCardList />
          </DataTableContent>
          <DataTablePagination />
        </DataTableProvider>
      )}

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
          {editing && (
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
