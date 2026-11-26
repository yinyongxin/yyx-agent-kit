import { createContext, useContext, type ReactNode } from "react";
import type { DataTableApi } from "./useDataTable";

const DataTableContext = createContext<DataTableApi<never> | null>(null);

export interface DataTableProviderProps<TRow> {
  table: DataTableApi<TRow>;
  children: ReactNode;
}

/**
 * 纯 Provider：只传实例，不渲染 DOM。
 * 组合组件可自由摆放（侧栏、头部、任意嵌套），不受表格根节点限制。
 */
export const DataTableProvider = <TRow,>({ table, children }: DataTableProviderProps<TRow>) => (
  <DataTableContext.Provider value={table as unknown as DataTableApi<never>}>
    {children}
  </DataTableContext.Provider>
);

/**
 * 组合组件统一入口：显式传 table 优先，没传才从 Provider 读。
 * 因此「先 Provider 再使用」只是可选糖，不是必须条件。
 */
export const useDataTableApi = <TRow,>(
  propTable?: DataTableApi<TRow>,
): DataTableApi<TRow> => {
  const ctx = useContext(DataTableContext) as DataTableApi<TRow> | null;
  const table = propTable ?? ctx;
  if (!table) {
    throw new Error(
      "DataTable 组合组件需要 table prop 或外层 <DataTableProvider table={...}>",
    );
  }
  return table;
};
