import { Alert, Loader, Paper, Stack, Table, Title } from "@mantine/core";
import { useEffect, useState } from "react";
import { createApiClient } from "@starter/api";
import type { Todo } from "@starter/shared";

const api = createApiClient();

export const DashboardPage = () => {
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
    <Stack gap="md">
      <Title order={2}>工作台</Title>
      <Paper withBorder p="md">
        <Title order={3} size="h5">
          待办列表
        </Title>
        {loading && <Loader size="sm" className="mt-2" />}
        {error && (
          <Alert color="red" title="错误" className="mt-2">
            {error}
          </Alert>
        )}
        {!loading && !error && todos.length === 0 && (
          <p className="mt-2 text-slate-500">暂无数据</p>
        )}
        {todos.length > 0 && (
          <Table className="mt-3">
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
      </Paper>
    </Stack>
  );
};
