import { useCallback, useRef, useState } from "react";
import { IconFileSearch, IconRefresh } from "@tabler/icons-react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Code,
  Divider,
  Drawer,
  Group,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  auditControllerList,
  type AuditLogDto,
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

type AuditRow = {
  key: string;
  createdAt: string;
  action: string;
  resource: string;
  result: "success" | "failure";
  actor: string;
  tenantId: string;
  traceId: string;
  raw: AuditLogDto;
};

const RESULT_COLOR: Record<string, string> = {
  success: "green",
  failure: "red",
};

const RESULT_LABEL: Record<string, string> = {
  success: "成功",
  failure: "失败",
};

const toRow = (item: AuditLogDto): AuditRow => ({
  key: item.id,
  createdAt: new Date(item.createdAt).toLocaleString(),
  action: item.action,
  resource: item.resource,
  result: item.result,
  actor: item.actorLabel ?? item.actorUserId ?? "-",
  tenantId: item.tenantId ?? "",
  traceId: item.traceId ?? "",
  raw: item,
});

const labels: DataTableLabels = {
  ...dataTableLabels,
  searchPlaceholder: "搜索动作 / 资源 / 摘要 / 操作者，如 tenant、auth.sign_in",
  search: "搜索",
  moreFilters: "更多筛选",
  applyFilters: "应用筛选",
  cancelFilters: "取消",
  clearFilter: (label) => `清除${label}筛选`,
  emptyTitle: "暂无审计记录",
  emptyDescription: "关键写操作与登录会自动写入审计日志",
  create: "刷新",
};

const filterFields = [
  selectField({
    key: "result",
    label: "结果",
    allLabel: "全部结果",
    options: [
      { value: "success", label: "成功" },
      { value: "failure", label: "失败" },
    ],
  }),
];

/**
 * 审计日志页（append-only，只读）。
 *
 * 与「日志」页区别：这里查 PostgreSQL audit_logs，保留时间长、只记录关键写操作；
 * 请求级排障日志在 Loki。
 */
export const AuditLogsContent = () => {
  const apiRef = useRef<DataTableApi<AuditRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<AuditRow | null>(null);

  const openDetail = (row: AuditRow) => setDetail(row);

  const columns: ColumnDef<AuditRow>[] = [
    { key: "createdAt", title: "时间", width: 170 },
    { key: "action", title: "动作", width: 150 },
    { key: "resource", title: "资源", width: 100 },
    {
      key: "result",
      title: "结果",
      width: 90,
      render: (row) => (
        <Badge color={RESULT_COLOR[row.result] ?? "gray"} variant="light">
          {RESULT_LABEL[row.result] ?? row.result}
        </Badge>
      ),
    },
    { key: "actor", title: "操作者", width: 200 },
    {
      key: "tenantId",
      title: "租户",
      width: 130,
      render: (row) =>
        row.tenantId ? (
          <Tooltip label={row.tenantId}>
            <Code>{row.tenantId.slice(0, 8)}</Code>
          </Tooltip>
        ) : (
          <Text size="xs" c="dimmed">
            平台
          </Text>
        ),
    },
    {
      key: "traceId",
      title: "traceId",
      width: 110,
      render: (row) =>
        row.traceId ? (
          <Tooltip label={row.traceId}>
            <Code>{row.traceId.slice(0, 8)}</Code>
          </Tooltip>
        ) : (
          <Text size="xs" c="dimmed">
            -
          </Text>
        ),
    },
    {
      key: "key",
      title: "操作",
      width: 70,
      render: (row) => (
        <Tooltip label="查看详情">
          <ActionIcon variant="subtle" onClick={() => openDetail(row)}>
            <IconFileSearch size={16} />
          </ActionIcon>
        </Tooltip>
      ),
    },
  ];

  // 必须稳定引用：内联函数会让 reload 每次渲染变化，触发无限请求
  const queryOptions = useCallback(async (ctx: QueryContext<AuditRow>) => {
    const api = apiRef.current;
    api?.setLoading(true);
    setError(null);
    try {
      const res = await auditControllerList({
        query: {
          page: ctx.page,
          pageSize: ctx.pageSize,
          ...(ctx.keyword ? { keyword: ctx.keyword } : {}),
          ...(ctx.filters.result
            ? { result: ctx.filters.result as "success" | "failure" }
            : {}),
        },
      });
      if (res.error) {
        api?.setError("加载审计日志失败");
        setError("加载审计日志失败");
        return;
      }
      api?.setData((res.data?.items ?? []).map(toRow));
      api?.setTotal(res.data?.total ?? 0);
    } catch (err) {
      api?.setError(err instanceof Error ? err.message : "加载失败");
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      api?.setLoading(false);
    }
  }, []);

  const table = useDataTable<AuditRow>({
    getRowKey: (row) => row.key,
    keywordFields: ["action", "resource", "actor"],
    columns,
    filterFields,
    labels,
    paginationLabels: pageLabels,
    initialFilters: { result: null },
    queryOptions,
  });

  apiRef.current = table;

  return (
    <Stack gap="md">
      {error && <Alert color="red">{error}</Alert>}

      <DataTableProvider table={table}>
        <DataTableFilterBar />
        <DataTableToolbar>
          <Group gap="xs">
            <Button
              variant="default"
              leftSection={<IconRefresh size={16} />}
              onClick={() => table.reload()}
            >
              刷新
            </Button>
            <Text size="xs" c="dimmed">
              append-only；写入后不可修改或删除
            </Text>
          </Group>
        </DataTableToolbar>
        <DataTableContent>
          <DataTableTable />
          <DataTableCardList />
        </DataTableContent>
        <DataTablePagination />
      </DataTableProvider>

      <AuditDetailDrawer row={detail} onClose={() => setDetail(null)} />
    </Stack>
  );
};

interface AuditDetailDrawerProps {
  row: AuditRow | null;
  onClose: () => void;
}

const AuditDetailDrawer = ({ row, onClose }: AuditDetailDrawerProps) => {
  const item = row?.raw;

  return (
    <Drawer
      opened={Boolean(row)}
      onClose={onClose}
      position="right"
      size="xl"
      title={<Text fw={600}>审计详情</Text>}
    >
      {item && (
        <Stack gap="md">
          <Group gap="xs" wrap="wrap">
            <Badge color={RESULT_COLOR[item.result] ?? "gray"}>
              {RESULT_LABEL[item.result] ?? item.result}
            </Badge>
            <Code>{item.action}</Code>
            <Text size="sm">{new Date(item.createdAt).toLocaleString()}</Text>
          </Group>

          <Stack gap={4}>
            <Text size="xs" c="dimmed">
              操作者
            </Text>
            <Text size="sm">
              {item.actorLabel ?? "-"}
              {item.actorUserId ? ` · ${item.actorUserId}` : ""}
            </Text>
            <Text size="xs" c="dimmed">
              租户 / 资源
            </Text>
            <Text size="sm">
              {item.tenantId ?? "平台级"} · {item.resource}
              {item.resourceId ? ` · ${item.resourceId}` : ""}
            </Text>
            <Text size="xs" c="dimmed">
              traceId / IP
            </Text>
            <Text size="sm">
              {item.traceId ?? "-"} · {item.ip ?? "-"}
            </Text>
            {item.userAgent && (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {item.userAgent}
              </Text>
            )}
            {item.summary && (
              <>
                <Text size="xs" c="dimmed">
                  摘要
                </Text>
                <Text size="sm">{item.summary}</Text>
              </>
            )}
          </Stack>

          <Divider label="before" labelPosition="left" />
          <JsonBlock value={item.before} />

          <Divider label="after" labelPosition="left" />
          <JsonBlock value={item.after} />
        </Stack>
      )}
    </Drawer>
  );
};

const JsonBlock = ({ value }: { value: Record<string, unknown> | null | undefined }) => {
  if (!value) {
    return (
      <Text size="sm" c="dimmed">
        无
      </Text>
    );
  }
  return (
    <ScrollArea h={220} type="auto">
      <Code block>{JSON.stringify(value, null, 2)}</Code>
    </ScrollArea>
  );
};
