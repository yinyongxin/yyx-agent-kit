import { useEffect, useState } from "react";
import { createApiClient } from "@starter/api";
import { APP_NAME } from "@starter/shared";

const api = createApiClient();

export const App = () => {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .health()
      .then((result) => setStatus(result.status))
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : "加载失败");
      });
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">{APP_NAME} 客户端</h1>
      <p className="mt-2 text-sm text-slate-600">后端运行状态（公开探活接口）</p>

      {error ? <p className="mt-4 text-red-600">{error}</p> : null}
      {status ? (
        <p className="mt-4 text-slate-900">
          状态：<span className={status === "ok" ? "text-green-600" : "text-red-600"}>{status}</span>
        </p>
      ) : null}
    </main>
  );
};
