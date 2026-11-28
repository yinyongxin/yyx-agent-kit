import { useCallback, useRef, useState } from "react";
import {
  IconDownload,
  IconFile,
  IconFileSpreadsheet,
  IconFileText,
  IconFileZip,
  IconPhoto,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  FileButton,
  Group,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import {
  tenantFilesControllerContent,
  tenantFilesControllerList,
  tenantFilesControllerRemove,
  tenantFilesControllerUpload,
  type FileResponseDto,
} from "@starter/api/generated";
import { PERMISSIONS } from "@starter/shared";
import { Can } from "@/components/Permission";
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
import { getApiErrorMessage } from "@/lib/api-error";
import { usePermissions } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant";

type FileRow = FileResponseDto & { key: string; sizeLabel: string };

const CATEGORY_OPTIONS = [
  { value: "image", label: "图片" },
  { value: "document", label: "文档" },
  { value: "other", label: "其他" },
];

const filterFields = [
  selectField({
    key: "category",
    label: "类型",
    allLabel: "全部类型",
    options: CATEGORY_OPTIONS,
  }),
];

const labels: DataTableLabels = {
  ...dataTableLabels,
  searchPlaceholder: "搜索文件名",
  search: "搜索",
  moreFilters: "更多筛选",
  applyFilters: "应用筛选",
  cancelFilters: "取消",
  clearFilter: (label) => `清除${label}筛选`,
  emptyTitle: "暂无文件",
  emptyDescription: "上传第一个文件后即可在此管理",
  create: "上传文件",
  confirmDelete: (n) => `确定删除选中的 ${n} 个文件？删除后不可恢复。`,
};

const formatSize = (size: number): string => {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const fileIcon = (mimeType: string) => {
  if (mimeType.startsWith("image/")) return IconPhoto;
  if (mimeType === "application/pdf") return IconFileText;
  if (mimeType.includes("spreadsheet") || mimeType === "text/csv")
    return IconFileSpreadsheet;
  if (mimeType.includes("zip")) return IconFileZip;
  return IconFile;
};

const toRow = (file: FileResponseDto): FileRow => ({
  ...file,
  key: file.id,
  sizeLabel: formatSize(file.size),
});

/** 租户文件：服务端分页 / 搜索 / 类型筛选，上传下载均走鉴权接口 */
export const FilesContent = () => {
  const { tenantId } = useTenant();
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.fileWrite);
  const apiRef = useRef<DataTableApi<FileRow> | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const upload = async (file: File | null) => {
    if (!file || !tenantId) return;
    setUploading(true);
    setActionError(null);
    try {
      const res = await tenantFilesControllerUpload({
        path: { tenantId },
        body: { file },
      });
      if (res.error || !res.data) {
        setActionError(
          getApiErrorMessage(res.error, "上传失败：类型不支持或文件过大"),
        );
        return;
      }
      apiRef.current?.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const download = async (row: FileRow) => {
    if (!tenantId) return;
    setBusyId(row.id);
    setActionError(null);
    try {
      const res = await tenantFilesControllerContent({
        path: { tenantId, id: row.id },
        parseAs: "blob",
      });
      if (res.error || !res.data) {
        setActionError(getApiErrorMessage(res.error, "下载失败"));
        return;
      }
      const url = URL.createObjectURL(res.data as Blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = row.name;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "下载失败");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (row: FileRow) => {
    if (!tenantId) return;
    if (!window.confirm(`确认删除文件「${row.name}」？`)) return;
    setBusyId(row.id);
    setActionError(null);
    try {
      const res = await tenantFilesControllerRemove({
        path: { tenantId, id: row.id },
      });
      if (res.error) {
        setActionError(getApiErrorMessage(res.error, "删除失败"));
        return;
      }
      apiRef.current?.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setBusyId(null);
    }
  };

  const columns: ColumnDef<FileRow>[] = [
    {
      key: "name",
      title: "文件名",
      width: 320,
      render: (row) => {
        const Icon = fileIcon(row.mimeType);
        return (
          <Group gap="xs" wrap="nowrap">
            <Icon size={18} />
            <Text size="sm" fw={500} truncate>
              {row.name}
            </Text>
          </Group>
        );
      },
    },
    {
      key: "mimeType",
      title: "类型",
      width: 150,
      render: (row) => (
        <Badge variant="light" color="gray">
          {row.mimeType}
        </Badge>
      ),
    },
    { key: "sizeLabel", title: "大小", width: 100 },
    {
      key: "uploadedByName",
      title: "上传者",
      width: 140,
      render: (row) => row.uploadedByName ?? "-",
    },
    {
      key: "createdAt",
      title: "上传时间",
      width: 170,
      render: (row) => new Date(row.createdAt).toLocaleString(),
    },
    {
      key: "key",
      title: "操作",
      width: 100,
      render: (row) => (
        <Group gap={4} wrap="nowrap">
          <Tooltip label="下载">
            <ActionIcon
              variant="subtle"
              loading={busyId === row.id}
              onClick={() => void download(row)}
            >
              <IconDownload size={16} />
            </ActionIcon>
          </Tooltip>
          <Can permission={PERMISSIONS.fileWrite}>
            <Tooltip label="删除">
              <ActionIcon
                variant="subtle"
                color="red"
                onClick={() => void remove(row)}
              >
                <IconTrash size={16} />
              </ActionIcon>
            </Tooltip>
          </Can>
        </Group>
      ),
    },
  ];

  // 稳定引用：内联函数会让 reload 每次渲染变化，触发无限请求
  const queryOptions = useCallback(
    async (ctx: QueryContext<FileRow>) => {
      if (!tenantId) return;
      const api = apiRef.current;
      api?.setLoading(true);
      setActionError(null);
      try {
        const res = await tenantFilesControllerList({
          path: { tenantId },
          query: {
            page: ctx.page,
            pageSize: ctx.pageSize,
            ...(ctx.keyword ? { keyword: ctx.keyword } : {}),
            ...(ctx.filters.category
              ? {
                  category: ctx.filters.category as
                    | "image"
                    | "document"
                    | "other",
                }
              : {}),
          },
        });
        if (res.error) {
          api?.setError(getApiErrorMessage(res.error, "加载文件失败"));
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

  const table = useDataTable<FileRow>({
    getRowKey: (row) => row.key,
    selectable: canWrite,
    keywordFields: ["name"],
    columns,
    filterFields,
    labels,
    paginationLabels: pageLabels,
    initialFilters: { category: null },
    queryOptions,
  });

  apiRef.current = table;

  const batchRemove = async (keys: string[]) => {
    if (!tenantId) return;
    setActionError(null);
    const results = await Promise.all(
      keys.map((id) =>
        tenantFilesControllerRemove({ path: { tenantId, id } }),
      ),
    );
    if (results.some((res) => res.error)) {
      setActionError("部分文件删除失败");
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
  ];

  if (!tenantId) {
    return (
      <Alert color="yellow">请先选择租户，再管理文件。</Alert>
    );
  }

  return (
    <Stack gap="md" pb={table.selected.size > 0 ? 80 : 0}>
      {actionError && <Alert color="red">{actionError}</Alert>}

      <DataTableProvider table={table}>
        <DataTableFilterBar />
        <DataTableToolbar>
          <Can permission={PERMISSIONS.fileWrite}>
            <FileButton onChange={(file) => void upload(file)} accept="image/*,application/pdf,text/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip">
              {(props) => (
                <Button
                  {...props}
                  leftSection={<IconUpload size={16} />}
                  loading={uploading}
                >
                  {labels.create}
                </Button>
              )}
            </FileButton>
          </Can>
        </DataTableToolbar>
        <DataTableContent>
          <DataTableTable />
          <DataTableCardList />
        </DataTableContent>
        <DataTablePagination />
      </DataTableProvider>

      {canWrite && <DataTableBatchBar table={table} actions={batchActions} />}
    </Stack>
  );
};
