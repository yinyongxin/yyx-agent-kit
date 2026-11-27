import { SiteNav } from "./site-nav";
import { Kicker } from "./ui";

// 右侧红橙光晕 + 左侧淡灰弧：Penpot 里渐变渲染受限，这里用 CSS radial-gradient 完整还原参考站
export const Hero = () => (
  <section
    id="top"
    className="relative isolate overflow-hidden bg-[var(--color-surface)] pb-28 pt-44 md:pt-40"
  >
    <div
      aria-hidden
      className="pointer-events-none absolute -left-[18%] -top-[35%] -z-10 h-[150%] w-[65%] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,212,216,0.75)_0%,rgba(244,244,245,0)_68%)] opacity-50 md:opacity-100"
    />
    <div
      aria-hidden
      className="pointer-events-none absolute -right-[22%] -top-[28%] -z-10 h-[145%] w-[78%] rounded-full bg-[radial-gradient(circle_at_center,#FD3A25_0%,#F5772E_32%,rgba(244,244,245,0)_70%)] opacity-25 md:opacity-95"
    />

    <SiteNav />

    <div className="mx-auto flex max-w-5xl flex-col items-center px-6 text-center">
      <Kicker>AGENT CONFIG</Kicker>
      <h1 className="mt-9 text-[clamp(2.75rem,7vw,5.5rem)] font-bold leading-[1.05] tracking-[-0.04em]">
        <span className="block text-[var(--color-ink-soft)]">让 AI Agent</span>
        <span className="block text-[var(--color-brand)]">按规范交付</span>
      </h1>
      <p className="mt-8 max-w-2xl text-base leading-8 text-[var(--color-muted)]">
        个人 OpenCode 配置与全栈项目模板：五阶段交付流水线、按技术栈拆分的规范、项目自包含的
        Docker 环境，以及一条命令创建项目的 CLI。
      </p>
      <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
        <a
          href="#cta"
          className="rounded-full bg-[var(--color-ink)] px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[var(--color-ink-soft)]"
        >
          快速开始 →
        </a>
        <a
          href="#cli"
          className="rounded-full border border-[var(--color-line)] bg-white px-8 py-3.5 text-base font-semibold text-[var(--color-ink-soft)] shadow-sm transition-colors hover:border-[var(--color-muted-light)]"
        >
          查看源码
        </a>
      </div>

      {/* 标题旁的浮动小卡，呼应参考站 */}
      <div
        aria-hidden
        className="pointer-events-none relative mt-14 hidden h-0 w-full md:block"
      >
        <div className="absolute right-[13%] top-[-118px] h-16 w-16 rotate-6 rounded-2xl bg-white p-2 shadow-xl">
          <div className="h-full w-full rounded-xl bg-[var(--color-brand)]" />
        </div>
        <div className="absolute right-[7%] top-[-58px] h-14 w-14 -rotate-6 rounded-2xl bg-white p-2 shadow-xl">
          <div className="h-full w-full rounded-xl bg-[var(--color-ink)]" />
        </div>
        <div className="absolute right-[16%] top-[8px] h-12 w-12 rotate-12 rounded-2xl bg-white p-2 shadow-xl">
          <div className="h-full w-full rounded-xl bg-[var(--color-brand-warm)]" />
        </div>
      </div>
    </div>

    <a
      href="#trust"
      className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/80 px-5 py-2.5 text-sm font-medium text-[var(--color-ink-soft)] shadow-sm backdrop-blur-md transition-colors hover:text-[var(--color-brand)]"
    >
      Scroll for more <span aria-hidden>↓</span>
    </a>
  </section>
);
