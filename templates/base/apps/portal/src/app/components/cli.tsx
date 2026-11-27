import { SectionTitle } from "./ui";

const params = [
  { name: "<项目名>", desc: "小写字母/数字/-/_，作为 npm scope" },
  { name: "-p, --path", desc: "生成到哪个目录（默认当前目录）" },
  { name: "--port-base", desc: "端口基址，client/admin/portal/server 依次 +73/+74/+75/+00" },
  { name: "-f, --force", desc: "目标目录已存在时覆盖" },
];

export const Cli = () => (
  <section id="cli" className="px-6 pb-24">
    <div className="mx-auto max-w-[1360px] rounded-[40px] bg-[var(--color-ink)] px-10 py-20 sm:px-14">
      <div className="grid gap-12 lg:grid-cols-2">
        <SectionTitle
          kicker="CLI"
          lines={["One Command,", "Full Project"]}
          description="一条命令生成完整项目：模板 + skills + agents + 内置 Docker 依赖。"
          tone="dark"
        />
        <div className="rounded-3xl bg-[#18181B] p-7">
          <div className="flex gap-2">
            <span className="h-3 w-3 rounded-full bg-[var(--color-brand)]" />
            <span className="h-3 w-3 rounded-full bg-[var(--color-brand-gold)]" />
            <span className="h-3 w-3 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-7 break-all font-mono text-base text-[var(--color-brand)]">
            $ pnpm dlx yyx-agent-kit myapp -p D:/projects
          </p>
          <p className="mt-5 text-sm text-[var(--color-muted-light)]">
            ==&gt; 已生成项目 · 23 个文件内容已更新
          </p>
          <p className="mt-2 text-sm text-[var(--color-muted-light)]">
            ==&gt; skills 与 agents 已内置到项目
          </p>
          <div className="my-6 h-px bg-[#3F3F46]" />
          <dl className="space-y-4">
            {params.map((param) => (
              <div key={param.name} className="flex flex-wrap gap-x-6 gap-y-1">
                <dt className="w-40 shrink-0 font-mono text-sm text-[var(--color-brand)]">
                  {param.name}
                </dt>
                <dd className="flex-1 text-sm text-[var(--color-muted-light)]">{param.desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  </section>
);
