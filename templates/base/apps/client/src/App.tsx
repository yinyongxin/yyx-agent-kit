import { useEffect, useState } from "react";
import { createApiClient } from "@starter/api";
import { APP_NAME, TODO_STATUS, formatDateTime, type Todo } from "@starter/shared";

const api = createApiClient();

export const App = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .todos()
      .then(setTodos)
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "加载失败");
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">{APP_NAME} 客户端</h1>

      {error ? <p className="mt-4 text-red-600">{error}</p> : null}

      {todos.length === 0 && !error ? <p className="mt-4 text-slate-600">暂无待办</p> : null}

      <ul className="mt-4 space-y-2">
        {todos.map((todo) => (
          <li key={todo.id} className="rounded border border-slate-200 bg-white p-3">
            <span className="text-slate-900">{todo.title}</span>
            <span className="ml-2 text-sm text-slate-500">
              {todo.status === TODO_STATUS.done ? "已完成" : "待办"}
            </span>
            <span className="ml-2 text-xs text-slate-400">{formatDateTime(todo.createdAt)}</span>
          </li>
        ))}
      </ul>
    </main>
  );
};
