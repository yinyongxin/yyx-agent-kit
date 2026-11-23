import { APP_NAME } from "@starter/shared";

export const App = () => {
  return (
    <main className="min-h-screen bg-slate-50 p-8">
      <h1 className="text-2xl font-semibold text-slate-900">{APP_NAME} 管理端</h1>
      <p className="mt-2 text-slate-600">流水线模板项目</p>
    </main>
  );
};
