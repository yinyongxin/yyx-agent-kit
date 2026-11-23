import { useEffect, useState } from "react";
import { createApiClient } from "@starter/api";
import { APP_NAME, type Todo } from "@starter/shared";

const api = createApiClient();

export const App = () => {
  const [health, setHealth] = useState<{ status: string } | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.health(), api.todos()])
      .then(([h, t]) => {
        setHealth(h);
        setTodos(t);
        setError(null);
      })
      .catch((err: unknown) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">{APP_NAME} 管理端</h1>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium text-slate-800">后端连通状态</h2>
        {loading && <p className="mt-2 text-slate-500">加载中…</p>}
        {error && <p className="mt-2 text-red-600">错误：{error}</p>}
        {!loading && !error && health && (
          <p className="mt-2">
            <span className="rounded bg-green-100 px-2 py-1 text-green-800">
              {health.status === "ok" ? "已连接" : health.status}
            </span>
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-medium text-slate-800">待办列表</h2>
        {!loading && todos.length === 0 && (
          <p className="mt-2 text-slate-500">暂无数据</p>
        )}
        {todos.length > 0 && (
          <ul className="mt-3 space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="flex items-center justify-between rounded border border-slate-100 px-3 py-2"
              >
                <span className="text-slate-800">{todo.title}</span>
                <span className="text-sm text-slate-500">{todo.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
};
