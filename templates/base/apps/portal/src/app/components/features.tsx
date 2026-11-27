import { SectionTitle } from "./ui";

const features = [
  {
    tag: "pipeline",
    title: "五阶段交付流水线",
    desc: "PRD → 技术方案 → 开发 → QA → 归档，每阶段都有门禁",
  },
  {
    tag: "skills",
    title: "规范即代码",
    desc: "workspace / nestjs / react / next 按栈拆分，按 description 自动加载",
  },
  {
    tag: "agents",
    title: "两个角色，各司其职",
    desc: "chief 编排与门禁，qa 独立测试且禁止改业务代码",
  },
  {
    tag: "docker",
    title: "项目自包含环境",
    desc: "PostgreSQL(pgvector) + Redis，容器/卷/网络带项目前缀",
  },
  {
    tag: "cli",
    title: "CLI 一键创建",
    desc: "yyx-new 替换项目名与端口，pnpm dlx 即用",
  },
  {
    tag: "auth",
    title: "租户与 RBAC 骨架",
    desc: "tenantId 由 Prisma 中间件注入；NestJS 官方认证授权",
  },
];

export const Features = () => (
  <section id="features" className="px-6 pb-24">
    <div className="mx-auto max-w-[1360px] rounded-[40px] bg-white px-10 py-20 sm:px-14">
      <SectionTitle
        kicker="核心特性"
        lines={["End-to-End", "Agent Kit"]}
        description="不是一堆配置，是一套交付体系：流程有门禁、有独立测试角色、有可追溯的交付文档。"
      />
      <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((feature) => (
          <article
            key={feature.tag}
            className="rounded-3xl bg-[var(--color-ink)] p-7 shadow-lg shadow-[0_12px_30px_-12px_var(--color-ink)]"
          >
            <span className="inline-flex rounded-full bg-[#27272A] px-3 py-1 text-xs font-medium text-[var(--color-muted-light)]">
              {feature.tag}
            </span>
            <h3 className="mt-5 text-xl font-bold text-white">
              {feature.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--color-muted-light)]">
              {feature.desc}
            </p>
          </article>
        ))}
      </div>
    </div>
  </section>
);
