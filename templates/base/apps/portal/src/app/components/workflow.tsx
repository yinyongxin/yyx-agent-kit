import { GradientIcon, SectionTitle } from "./ui";

const stages = [
  { no: "01", title: "产品需求", desc: "01-prd.md：功能与验收标准", tag: "PRD" },
  { no: "02", title: "技术方案", desc: "逐条可行性评估与技术选型", tag: "TECH" },
  { no: "03", title: "开发实施", desc: "03-dev-log.md 记录改动", tag: "DEV" },
  { no: "04", title: "测试回归", desc: "判定通过，qa 独立于实现者", tag: "QA" },
  { no: "05", title: "记录归档", desc: "05-record.md 沉淀交付", tag: "DONE" },
];

export const Workflow = () => (
  <section id="workflow" className="px-6 pb-24">
    <div className="mx-auto max-w-[1360px] rounded-[40px] bg-white px-10 py-20 sm:px-14">
      <div className="flex flex-wrap items-end justify-between gap-8">
        <SectionTitle
          kicker="交付流水线"
          lines={["From Idea", "to Production"]}
          description="每个阶段都有明确的产出与门禁，方案不可行回 01 修订，测试不通过回 03 修复。"
        />
        <div className="flex gap-3">
          <a
            href="#faq"
            aria-label="跳转到 FAQ"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface)] text-xl text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-brand)]"
          >
            ‹
          </a>
          <a
            href="#stack"
            aria-label="跳转到技术栈"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--color-surface)] text-xl text-[var(--color-ink-soft)] transition-colors hover:text-[var(--color-brand)]"
          >
            ›
          </a>
        </div>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        {stages.map((stage) => (
          <article
            key={stage.no}
            className="flex flex-col rounded-3xl bg-[var(--color-surface)] p-6"
          >
            <GradientIcon>{stage.no}</GradientIcon>
            <h3 className="mt-6 text-xl font-bold text-[var(--color-ink-soft)]">
              {stage.title}
            </h3>
            <p className="mt-3 min-h-14 text-sm leading-6 text-[var(--color-muted)]">
              {stage.desc}
            </p>
            <div className="mt-6 flex items-end justify-between gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-ink-soft)]">
                {stage.tag}
              </span>
              <span className="text-2xl font-bold text-[var(--color-muted-light)]">
                {stage.no} / 05
              </span>
            </div>
          </article>
        ))}
      </div>

      <p className="mt-8 text-sm text-[var(--color-muted-light)]">
        方案不可行 → 回 01 修订 · 测试不通过 → 回 03 修复 · 判定的 qa 独立于实现者
      </p>
    </div>
  </section>
);
