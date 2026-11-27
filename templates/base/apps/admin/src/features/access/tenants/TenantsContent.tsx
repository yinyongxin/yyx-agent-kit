import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Group,
  Modal,
  Pagination,
  Select,
  Stack,
  Table,
  Text,
  TextInput,
  Tooltip,
} from "@mantine/core";
import { IconEdit, IconPlus, IconRefresh, IconTrash } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import {
  tenantsControllerCreate,
  tenantsControllerList,
  tenantsControllerRemove,
  tenantsControllerUpdate,
  type TenantResponseDto,
} from "@starter/api/generated";

const PAGE_SIZE = 10;
type TenantStatus = "active" | "suspended";

const STATUS_OPTIONS = [
  { value: "active", label: "正常" },
  { value: "suspended", label: "已停用" },
];

type TenantForm = { name: string; slug: string; status: TenantStatus };

export const TenantsContent = () => {
  const [items, setItems] = useState<TenantResponseDto[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<TenantResponseDto | null>(null);
  const [form, setForm] = useState<TenantForm>({ name: "", slug: "", status: "active" });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await tenantsControllerList({
        query: {
          page,
          pageSize: PAGE_SIZE,
          ...(status ? { status: status as TenantStatus } : {}),
          ...(keyword ? { keyword } : {}),
        },
      });
      if (res.error) {
        setError("加载租户失败");
        return;
      }
      setItems(res.data?.items ?? []);
      setTotal(res.data?.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [page, status, keyword]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setForm({ name: "", slug: "", status: "active" });
    setCreating(true);
    setEditing(null);
  };

  const openEdit = (tenant: TenantResponseDto) => {
    setForm({
      name: tenant.name,
      slug: tenant.slug,
      status: tenant.status as TenantStatus,
    });
    setEditing(tenant);
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

  const remove = async (tenant: TenantResponseDto) => {
    if (!window.confirm(`确认删除租户「${tenant.name}」？有成员/订阅时会被拒绝。`)) {
      return;
    }
    setError(null);
    try {
      const res = await tenantsControllerRemove({ path: { id: tenant.id } });
      if (res.error) {
        setError("删除失败：租户仍有成员或订阅");
        return;
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  return (
    <Stack gap="md">
      <Group justify="space-between">
        <Group>
          <TextInput
            placeholder="搜索 name / slug"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.currentTarget.value);
              setPage(1);
            }}
          />
          <Select
            placeholder="状态"
            clearable
            data={STATUS_OPTIONS}
            value={status}
            onChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          />
          <Button
            variant="light"
            leftSection={<IconRefresh size={16} />}
            onClick={() => void load()}
            loading={loading}
          >
            刷新
          </Button>
        </Group>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          新建租户
        </Button>
      </Group>

      {error && <Alert color="red">{error}</Alert>}

      <Table highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>名称</Table.Th>
            <Table.Th>slug</Table.Th>
            <Table.Th>状态</Table.Th>
            <Table.Th>创建时间</Table.Th>
            <Table.Th>操作</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {items.map((tenant) => (
            <Table.Tr key={tenant.id}>
              <Table.Td>{tenant.name}</Table.Td>
              <Table.Td>{tenant.slug}</Table.Td>
              <Table.Td>
                <Badge color={tenant.status === "active" ? "green" : "gray"}>
                  {tenant.status === "active" ? "正常" : "已停用"}
                </Badge>
              </Table.Td>
              <Table.Td>{new Date(tenant.createdAt).toLocaleString()}</Table.Td>
              <Table.Td>
                <Group gap="xs">
                  <Tooltip label="编辑">
                    <ActionIcon variant="subtle" onClick={() => openEdit(tenant)}>
                      <IconEdit size={16} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="删除">
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => void remove(tenant)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Table.Td>
            </Table.Tr>
          ))}
          {items.length === 0 && !loading && (
            <Table.Tr>
              <Table.Td colSpan={5}>
                <Text c="dimmed" ta="center">
                  暂无租户
                </Text>
              </Table.Td>
            </Table.Tr>
          )}
        </Table.Tbody>
      </Table>

      <Group justify="space-between">
        <Text size="sm" c="dimmed">
          共 {total} 个租户
        </Text>
        <Pagination
          value={page}
          onChange={setPage}
          total={Math.max(1, Math.ceil(total / PAGE_SIZE))}
        />
      </Group>

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
                setForm({ ...form, status: (value as TenantStatus) ?? "active" })
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
