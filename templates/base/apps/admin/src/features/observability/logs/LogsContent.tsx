import { useCallback, useEffect, useRef, useState } from "react";
import {
  IconFileSearch,
  IconSearch,
} from "@tabler/icons-react";
import {
  ActionIcon,
  Alert,
  Badge,
  Code,
  Divider,
  Drawer,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Table,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  logsControllerList,
  logsControllerStats,
  logsControllerTrace,
  type LogEntryDto,
} from "@starter/api/generated";
import {
  LOG_LEVELS,
  LOG_RANGES,
  type LogLevel,
  type LogRange,
} from "@starter/shared";
import {
  LEVEL_COLOR,
  LEVEL_OPTIONS,
  RANGE_OPTIONS,
} from "../constants";
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
  type FilterValue,
  type QueryContext,
} from "@/components/DataTable";


type LogRow = {
  key: string;
  timestamp: string;
  level: string;
  method: string;
  path: string;
  statusCode: string;
  responseTime: string;
  traceId: string;
  raw: Record<string, unknown>;
};

const asRange = (value: FilterValue | undefined, fallback: LogRange = "15m"): LogRange =>
  LOG_RANGES.includes(value as LogRange) ? (value as LogRange) : fallback;

const asLevel = (value: FilterValue | undefined): LogLevel | undefined =>
  LOG_LEVELS.includes(value as LogLevel) ? (value as LogLevel) : undefined;

const toRow = (entry: LogEntryDto): LogRow => ({
  key: `${entry.timestamp}-${entry.requestId ?? entry.traceId ?? Math.random()}`,
  timestamp: new Date(entry.timestamp).toLocaleString(),
  level: entry.level,
  method: entry.method ?? "",
  path: entry.path ?? entry.message ?? "",
  statusCode: entry.statusCode === undefined ? "" : String(entry.statusCode),
  responseTime: entry.responseTime === undefined ? "" : `${entry.responseTime} ms`,
  traceId: entry.traceId ?? "",
  raw: entry.raw,
});

const labels: DataTableLabels = {
  ...dataTableLabels,
  searchPlaceholder: "搜索路径或关键词，如 /api/tenants、error",
  search: "搜索",
  moreFilters: "更多筛选",
  applyFilters: "应用筛选",
  cancelFilters: "取消",
  clearFilter: (label) => `清除${label}筛选`,
  emptyTitle: "暂无日志",
  emptyDescription: "确认应用已产生日志，并已启动 observability（Loki + Alloy）",
  create: "新建",
};

const filterFields = [
  selectField({
    key: "range",
    label: "时间范围",
    allLabel: "近 15 分钟",
    options: RANGE_OPTIONS,
  }),
  selectField({
    key: "level",
    label: "级别",
    allLabel: "全部级别",
    options: LEVEL_OPTIONS,
  }),
];

/**
 * 平台日志检索页。
 *
 * 数据来自 Loki（应用 stdout / 文件 → Alloy → Loki），不是业务库。
 * 搜索与筛选全部走后端（Loki 查询），前端只负责展示与详情抽屉。
 */
export const LogsContent = () => {
  const apiRef = useRef<DataTableApi<LogRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, number> | null>(null);

  const [detail, setDetail] = useState<LogRow | null>(null);
  const [trace, setTrace] = useState<LogEntryDto[] | null>(null);
  const [traceLoading, setTraceLoading] = useState(false);

  const openDetail = async (row: LogRow) => {
    setDetail(row);
    setTrace(null);
    if (!row.traceId) return;

    setTraceLoading(true);
    try {
      const res = await logsControllerTrace({ path: { traceId: row.traceId } });
      if (res.data) setTrace(res.data);
    } catch {
      setTrace(null);
    } finally {
      setTraceLoading(false);
    }
  };

  const columns: ColumnDef<LogRow>[] = [
    { key: "timestamp", title: "时间", width: 170 },
    {
      key: "level",
      title: "级别",
      width: 90,
      render: (row) => (
        <Badge color={LEVEL_COLOR[row.level] ?? "gray"} variant="light">
          {row.level}
        </Badge>
      ),
    },
    { key: "method", title: "方法", width: 70 },
    { key: "path", title: "路径 / 消息", width: 320 },
    { key: "statusCode", title: "状态", width: 70 },
    { key: "responseTime", title: "耗时", width: 80 },
    {
      key: "traceId",
      title: "traceId",
      width: 130,
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
          <ActionIcon variant="subtle" onClick={() => void openDetail(row)}>
            <IconFileSearch size={16} />
          </ActionIcon>
        </Tooltip>
      ),
    },
  ];

  // 必须稳定引用：内联函数会让 reload 每次渲染变化，触发无限请求
  const queryOptions = useCallback(async (ctx: QueryContext<LogRow>) => {
    const api = apiRef.current;
    api?.setLoading(true);
    setError(null);
    try {
      const res = await logsControllerList({
        query: {
          page: ctx.page,
          pageSize: ctx.pageSize,
          range: asRange(ctx.filters.range),
          ...(asLevel(ctx.filters.level) ? { level: asLevel(ctx.filters.level)! } : {}),
          ...(ctx.keyword ? { keyword: ctx.keyword } : {}),
        },
      });
      if (res.error) {
        api?.setError("加载日志失败");
        setError("加载日志失败：确认 Loki / Alloy 已启动（docker compose --profile observability up -d）");
        return;
      }
      api?.setData((res.data?.items ?? []).map(toRow));
      // total 由 stats 请求设置（Loki 无精确分页总数，stats 的 count_over_time 更准）
    } catch (err) {
      api?.setError(err instanceof Error ? err.message : "加载失败");
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      api?.setLoading(false);
    }
  }, []);

  const table = useDataTable<LogRow>({
    getRowKey: (row) => row.key,
    keywordFields: ["path"],
    columns,
    filterFields,
    labels,
    paginationLabels: pageLabels,
    initialFilters: { range: "15m", level: null },
    queryOptions,
  });

  apiRef.current = table;

  const range = asRange(table.filters.range);

  useEffect(() => {
    let cancelled = false;
    logsControllerStats({ query: { range } })
      .then((res) => {
        if (cancelled || !res.data) return;
        const map: Record<string, number> = {};
        res.data.levels.forEach((level, index) => {
          map[level] = res.data?.counts[index] ?? 0;
        });
        setStats(map);
        // 分页总数用 stats 的总条数，避免 Loki 无 count 时显示「共 11 条」
        apiRef.current?.setTotal(res.data.total);
      })
      .catch(() => {
        if (!cancelled) setStats(null);
      });
    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <Stack gap="md">
      {error && <Alert color="red">{error}</Alert>}

      <Group gap="xs">
        <Text size="sm" c="dimmed">
          窗口内：
        </Text>
        {stats ? (
          Object.keys(LEVEL_COLOR)
            .filter((level) => (stats[level] ?? 0) > 0)
            .map((level) => (
              <Badge key={level} color={LEVEL_COLOR[level]} variant="light">
                {level} {stats[level]}
              </Badge>
            ))
        ) : (
          <Text size="sm" c="dimmed">
            暂无统计
          </Text>
        )}
      </Group>

      <DataTableProvider table={table}>
        <DataTableFilterBar />
        <DataTableToolbar>
          <Text size="xs" c="dimmed">
            数据来自 Loki；筛选 / 搜索即刷新，traceId 可在详情里看到完整时间线
          </Text>
        </DataTableToolbar>
        <DataTableContent>
          <DataTableTable />
          <DataTableCardList />
        </DataTableContent>
        <DataTablePagination />
      </DataTableProvider>

      <LogDetailDrawer
        row={detail}
        trace={trace}
        traceLoading={traceLoading}
        onClose={() => setDetail(null)}
      />
    </Stack>
  );
};

interface LogDetailDrawerProps {
  row: LogRow | null;
  trace: LogEntryDto[] | null;
  traceLoading: boolean;
  onClose: () => void;
}

const LogDetailDrawer = ({ row, trace, traceLoading, onClose }: LogDetailDrawerProps) => (
  <Drawer
    opened={Boolean(row)}
    onClose={onClose}
    position="right"
    size="xl"
    title={
      <Group gap="xs">
        <IconSearch size={18} />
        <Text fw={600}>日志详情</Text>
      </Group>
    }
  >
    {row && (
      <Stack gap="md">
        <Group gap="xs" wrap="wrap">
          <Badge color={LEVEL_COLOR[row.level] ?? "gray"}>{row.level}</Badge>
          <Text size="sm">{row.timestamp}</Text>
          {row.statusCode && <Badge variant="outline">HTTP {row.statusCode}</Badge>}
          {row.responseTime && <Badge variant="outline">{row.responseTime}</Badge>}
        </Group>

        <Stack gap={2}>
          <Text size="xs" c="dimmed">
            traceId
          </Text>
          <Code block>{row.traceId || "-"}</Code>
        </Stack>

        <Divider label="完整日志（已脱敏）" labelPosition="left" />
        <ScrollArea h={260} type="auto">
          <Code block>{JSON.stringify(row.raw, null, 2)}</Code>
        </ScrollArea>

        <Divider label={`同 traceId 时间线${trace ? `（${trace.length} 条）` : ""}`} labelPosition="left" />
        {traceLoading && (
          <Group gap="xs">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">
              加载中…
            </Text>
          </Group>
        )}
        {!traceLoading && row.traceId && trace && trace.length === 0 && (
          <Text size="sm" c="dimmed">
            近 24 小时没有同 traceId 的其他日志
          </Text>
        )}
        {!traceLoading && !row.traceId && (
          <Text size="sm" c="dimmed">
            该日志没有 traceId（非 HTTP 请求日志）
          </Text>
        )}
        {trace && trace.length > 0 && (
          <Table striped withTableBorder highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th w={170}>时间</Table.Th>
                <Table.Th w={80}>级别</Table.Th>
                <Table.Th>消息</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {trace.map((entry, index) => (
                <Table.Tr key={`${entry.timestamp}-${index}`}>
                  <Table.Td>{new Date(entry.timestamp).toLocaleTimeString()}</Table.Td>
                  <Table.Td>
                    <Badge color={LEVEL_COLOR[entry.level] ?? "gray"} variant="light">
                      {entry.level}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    {entry.method ? `${entry.method} ${entry.path ?? ""}` : entry.message ?? ""}
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        )}
      </Stack>
    )}
  </Drawer>
);
