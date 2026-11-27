import { GradientIcon, SectionTitle } from "./ui";

const stacks = [
  { name: "workspace", desc: "pnpm / mise / monorepo", detail: "端口 47xxx、Docker 与数据库迁移" },
  { name: "nestjs", desc: "模块分层 / Prisma 多租户", detail: "NestJS 官方认证授权、异常处理" },
  { name: "react", desc: "Vite + Tailwind + Mantine", detail: "路由、组件与文件命名约定" },
  { name: "next", desc: "App Router / Server Component", detail: "SEO 与 monorepo 共享包搭配" },
];

export const Stack = () => (
  <section id="stack" className="px-6 pb-24">
    <div className="mx-auto max-w-[1360px] rounded-[40px] bg-white px-10 py-20 sm:px-14">
      <SectionTitle
        kicker="技术栈规范"
        lines={["Stack by Stack", "Rules That Scale"]}
        description="按栈拆分，需要哪个加载哪个：规范以 skill 形式组织，由 description 自动触发。"
      />
      <div className="mt-12 grid gap-5 md:grid-cols-2">
        {stacks.map((stack) => (
          <article key={stack.name} className="rounded-3xl bg-[var(--color-surface)] p-7">
            <div className="flex items-center gap-4">
              <GradientIcon>◇</GradientIcon>
              <h3 className="text-xl font-bold text-[var(--color-ink-soft)]">{stack.name}</h3>
            </div>
            <p className="mt-5 text-base font-semibold text-[var(--color-ink-soft)]">
              {stack.desc}
            </p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">{stack.detail}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
