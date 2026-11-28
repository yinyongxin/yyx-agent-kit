import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconBan,
  IconCheck,
  IconEdit,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import {
  ActionIcon,
  Alert,
  Avatar,
  Badge,
  Button,
  Group,
  Modal,
  MultiSelect,
  Select,
  Stack,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import {
  platformTenantMembersControllerAdd,
  platformTenantMembersControllerList,
  platformTenantMembersControllerRemove,
  platformTenantMembersControllerUpdate,
  platformTenantRolesControllerOptions,
  rolesControllerOptions,
  tenantMembersControllerAdd,
  tenantMembersControllerList,
  tenantMembersControllerRemove,
  tenantMembersControllerUpdate,
  type MemberResponseDto,
  type RoleDto,
} from "@starter/api/generated";
import { authStore } from "@/lib/auth";
import { getApiErrorMessage } from "@/lib/api-error";
import { useMe } from "@/lib/me";
import { usePermissions } from "@/lib/permissions";
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

type MemberStatus = "active" | "suspended";

type MemberRow = {
  key: string;
  userId: string;
  email: string;
  displayName: string;
  userStatus: "active" | "disabled";
  status: MemberStatus;
  roles: RoleDto[];
  joinedAt: string;
};

type MemberForm = {
  email: string;
  roleCodes: string[];
  status: MemberStatus;
};

const STATUS_OPTIONS = [
  { value: "active", label: "正常" },
  { value: "suspended", label: "已停用" },
];

const toRow = (member: MemberResponseDto): MemberRow => ({
  key: member.userId,
  userId: member.userId,
  email: member.email ?? "-",
  displayName: member.displayName ?? "",
  userStatus: member.userStatus as MemberRow["userStatus"],
  status: member.status as MemberStatus,
  roles: member.roles,
  joinedAt: new Date(member.joinedAt).toLocaleString(),
});

const labels: DataTableLabels = {
  ...dataTableLabels,
  searchPlaceholder: "搜索邮箱 / 显示名",
  search: "搜索",
  moreFilters: "更多筛选",
  applyFilters: "应用筛选",
  cancelFilters: "取消",
  clearFilter: (label) => `清除${label}筛选`,
  emptyTitle: "暂无成员",
  emptyDescription: "把已存在的用户添加到该租户后即可在此管理",
  create: "添加成员",
  confirmDelete: (n) => `确定移除选中的 ${n} 个成员？会同时移除其在当前租户的角色。`,
  confirmEnable: (n) => `确定恢复选中的 ${n} 个成员？`,
  confirmDisable: (n) => `确定停用选中的 ${n} 个成员？停用后无法访问该租户。`,
};

const filterFields = [
  selectField({
    key: "status",
    label: "成员状态",
    allLabel: "全部状态",
    options: STATUS_OPTIONS,
  }),
];

/** 租户成员管理：服务端 DataTable + 添加/编辑/停用/移除 */
export const TenantMembersContent = ({
  tenantId,
  mode = "tenant",
}: {
  tenantId: string;
  /** platform：平台管理员跨租户管理，走 /tenants/:id/members，不依赖租户成员身份 */
  mode?: "tenant" | "platform";
}) => {
  const apiRef = useRef<DataTableApi<MemberRow> | null>(null);
  const { can } = usePermissions();
  const { me } = useMe();
  const canWrite =
    mode === "platform"
      ? me?.platformAdminLevel === "super"
      : can("user:write");
  const [actionError, setActionError] = useState<string | null>(null);
  const [roleOptions, setRoleOptions] = useState<{ value: string; label: string }[]>([]);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<MemberRow | null>(null);
  const [form, setForm] = useState<MemberForm>({
    email: "",
    roleCodes: [],
    status: "active",
  });
  const [saving, setSaving] = useState(false);

  const selfEmail = authStore.getEmail()?.toLowerCase() ?? "";
  const isSelf = (row: MemberRow) => Boolean(selfEmail) && row.email.toLowerCase() === selfEmail;

  useEffect(() => {
    let alive = true;
    const request =
      mode === "platform"
        ? platformTenantRolesControllerOptions({ path: { tenantId } })
        : rolesControllerOptions({ path: { tenantId } });
    void request.then((res) => {
      if (!alive || res.error || !res.data) return;
      setRoleOptions(res.data.map((role) => ({ value: role.code, label: role.name })));
    });
    return () => {
      alive = false;
    };
  }, [tenantId, mode]);

  const defaultRoleCodes = () => {
    if (roleOptions.some((option) => option.value === "member")) return ["member"];
    const first = roleOptions[0]?.value;
    return first ? [first] : [];
  };

  const openCreate = () => {
    setForm({ email: "", roleCodes: defaultRoleCodes(), status: "active" });
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (row: MemberRow) => {
    setForm({
      email: row.email,
      roleCodes: row.roles.map((role) => role.code),
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
    if (form.roleCodes.length === 0) {
      setActionError("请至少选择一个角色");
      return;
    }
    setSaving(true);
    setActionError(null);
    try {
      if (creating) {
        const body = {
          email: form.email.trim(),
          roleCodes: form.roleCodes,
        };
        const res =
          mode === "platform"
            ? await platformTenantMembersControllerAdd({
                path: { tenantId },
                body,
              })
            : await tenantMembersControllerAdd({
                path: { tenantId },
                body,
              });
        if (res.error || !res.data) {
          setActionError(
            getApiErrorMessage(
              res.error,
              "添加失败：请确认账号已由平台管理员在「用户管理」中创建",
            ),
          );
          return;
        }
        apiRef.current?.applyMutation({ row: toRow(res.data), mode: "create" });
      } else if (editing) {
        const body = {
          roleCodes: form.roleCodes,
          status: form.status,
        };
        const res =
          mode === "platform"
            ? await platformTenantMembersControllerUpdate({
                path: { tenantId, userId: editing.userId },
                body,
              })
            : await tenantMembersControllerUpdate({
                path: { tenantId, userId: editing.userId },
                body,
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

  const remove = async (row: MemberRow) => {
    if (!window.confirm(`确认移除成员「${row.displayName || row.email}」？`)) return;
    setActionError(null);
    try {
      const res =
        mode === "platform"
          ? await platformTenantMembersControllerRemove({
              path: { tenantId, userId: row.userId },
            })
          : await tenantMembersControllerRemove({
              path: { tenantId, userId: row.userId },
            });
      if (res.error) {
        setActionError(getApiErrorMessage(res.error, "移除失败"));
        return;
      }
      apiRef.current?.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "移除失败");
    }
  };

  const columns: ColumnDef<MemberRow>[] = [
    {
      key: "displayName",
      title: "成员",
      width: 220,
      render: (row) => (
        <Group gap="xs" wrap="nowrap">
          <Avatar size="sm" color="blue" radius="xl">
            {(row.displayName || row.email).slice(0, 1).toUpperCase()}
          </Avatar>
          <Text size="sm" fw={500}>
            {row.displayName || "未命名"}
          </Text>
          {isSelf(row) && (
            <Badge size="xs" variant="light">
              我
            </Badge>
          )}
        </Group>
      ),
    },
    { key: "email", title: "邮箱", width: 240 },
    {
      key: "roles",
      title: "角色",
      width: 180,
      render: (row) =>
        row.roles.length === 0 ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : (
          <Group gap={4} wrap="wrap">
            {row.roles.map((role) => (
              <Badge
                key={role.id}
                size="sm"
                variant="light"
                color={role.code === "admin" ? "blue" : "gray"}
              >
                {role.name}
              </Badge>
            ))}
          </Group>
        ),
    },
    {
      key: "status",
      title: "状态",
      width: 100,
      render: (row) => (
        <Badge color={row.status === "active" ? "green" : "gray"} variant="light">
          {row.status === "active" ? "正常" : "已停用"}
        </Badge>
      ),
    },
    { key: "joinedAt", title: "加入时间", width: 170 },
    {
      key: "key",
      title: "操作",
      width: 110,
      hidden: !canWrite,
      render: (row) =>
        isSelf(row) || !canWrite ? (
          <Text size="sm" c="dimmed">
            —
          </Text>
        ) : (
          <Group gap={4} wrap="nowrap">
            <Tooltip label="编辑">
              <ActionIcon variant="subtle" onClick={() => openEdit(row)}>
                <IconEdit size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="移除">
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
    async (ctx: QueryContext<MemberRow>) => {
      const api = apiRef.current;
      api?.setLoading(true);
      setActionError(null);
      try {
        const res =
          mode === "platform"
            ? await platformTenantMembersControllerList({
                path: { tenantId },
                query: {
                  page: ctx.page,
                  pageSize: ctx.pageSize,
                  ...(ctx.keyword ? { keyword: ctx.keyword } : {}),
                  ...(ctx.filters.status
                    ? { status: ctx.filters.status as MemberStatus }
                    : {}),
                },
              })
            : await tenantMembersControllerList({
                path: { tenantId },
                query: {
                  page: ctx.page,
                  pageSize: ctx.pageSize,
                  ...(ctx.keyword ? { keyword: ctx.keyword } : {}),
                  ...(ctx.filters.status
                    ? { status: ctx.filters.status as MemberStatus }
                    : {}),
                },
              });
        if (res.error) {
          api?.setError(getApiErrorMessage(res.error, "加载成员失败"));
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
    [tenantId, mode],
  );

  const table = useDataTable<MemberRow>({
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

  const batchUpdateStatus = async (keys: string[], status: MemberStatus) => {
    setActionError(null);
    const results = await Promise.all(
      keys.map((userId) =>
        mode === "platform"
          ? platformTenantMembersControllerUpdate({
              path: { tenantId, userId },
              body: { status },
            })
          : tenantMembersControllerUpdate({
              path: { tenantId, userId },
              body: { status },
            }),
      ),
    );
    if (results.some((res) => res.error)) {
      setActionError("部分成员更新失败（不能操作自己）");
    }
    table.clearSelection();
    table.reload();
  };

  const batchRemove = async (keys: string[]) => {
    setActionError(null);
    const results = await Promise.all(
      keys.map((userId) =>
        mode === "platform"
          ? platformTenantMembersControllerRemove({ path: { tenantId, userId } })
          : tenantMembersControllerRemove({ path: { tenantId, userId } }),
      ),
    );
    if (results.some((res) => res.error)) {
      setActionError("部分成员移除失败（不能移除自己）");
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
      run: (keys) => void batchUpdateStatus(keys.map(String), "suspended"),
    },
  ];

  return (
    <Stack gap="md" pb={canWrite && table.selected.size > 0 ? 80 : 0}>
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
        title={creating ? "添加成员" : "编辑成员"}
      >
        <Stack gap="md">
          <TextInput
            label="邮箱"
            required={creating}
            disabled={Boolean(editing)}
            description={creating ? "按邮箱添加已存在的用户，账号需先由平台管理员创建" : undefined}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.currentTarget.value })}
          />
          <MultiSelect
            label="角色"
            required
            data={roleOptions}
            value={form.roleCodes}
            onChange={(value) => setForm({ ...form, roleCodes: value })}
            description="可多选；角色由当前租户维护"
          />
          {editing && (
            <Select
              label="成员状态"
              data={STATUS_OPTIONS}
              value={form.status}
              onChange={(value) =>
                setForm({ ...form, status: (value as MemberStatus) ?? "active" })
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
