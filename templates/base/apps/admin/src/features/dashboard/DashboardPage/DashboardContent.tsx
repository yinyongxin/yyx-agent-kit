import { Alert, Loader, Table, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { createApiClient } from "@starter/api";
import type { Todo } from "@starter/shared";

const api = createApiClient();

/** 工作台内容：待办列表（可复用于其它页面/弹窗）。 */
export const DashboardContent = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.todos()
      .then((t) => {
        setTodos(t);
        setError(null);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Title order={3} size="h5">
        待办列表
      </Title>
      {loading && <Loader size="sm" mt="sm" />}
      {error && (
        <Alert color="red" title="错误" mt="sm">
          {error}
        </Alert>
      )}
      {!loading && !error && todos.length === 0 && (
        <p className="mt-2 text-slate-500">暂无数据</p>
      )}
      {todos.length > 0 && (
        <Table mt="md">
          <Table.Thead>
            <Table.Tr>
              <Table.Th>标题</Table.Th>
              <Table.Th>状态</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {todos.map((todo) => (
              <Table.Tr key={todo.id}>
                <Table.Td>{todo.title}</Table.Td>
                <Table.Td>{todo.status}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}
    </>
  );
};
