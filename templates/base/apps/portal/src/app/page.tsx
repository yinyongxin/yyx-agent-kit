import { APP_NAME, formatDateTime } from "@starter/shared";

// 门户面向未登录访客，内容以展示为主；后续接入接口时优先用服务端组件 + 缓存策略
export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">{APP_NAME} 门户</h1>
      <p className="mt-2 text-slate-600">面向外部访客的公开站点。</p>
      <p className="mt-6 text-sm text-slate-400">构建时间：{formatDateTime(new Date())}</p>
    </main>
  );
}
