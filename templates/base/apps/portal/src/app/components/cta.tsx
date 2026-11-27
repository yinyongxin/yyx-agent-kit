import { Kicker } from "./ui";

const fields = [
  { label: "Your Name", placeholder: "Enter your full name" },
  { label: "Work Email", placeholder: "you@company.com" },
  { label: "Project Details", placeholder: "Tell us about your project" },
];

export const Cta = () => (
  <section id="cta" className="px-6 pb-24">
    <div className="mx-auto max-w-[1360px] overflow-hidden rounded-[40px] bg-gradient-to-br from-[var(--color-brand)] via-[var(--color-brand-warm)] to-[#B91C1C] px-10 py-20 sm:px-14">
      <div className="grid gap-12 lg:grid-cols-2">
        <div>
          <Kicker tone="glass">立即开始</Kicker>
          <h2 className="mt-6 text-[clamp(2.25rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.03em] text-white">
            Ready to Build?
            <span className="block">Let us ship.</span>
          </h2>
          <p className="mt-6 max-w-lg text-base leading-7 text-white/90">
            从下一个项目开始，让交付有章可循。yyx-agent-kit 是开源配置源，一条命令即刻生成。
          </p>
          <a
            href="https://www.npmjs.com/package/yyx-agent-kit"
            className="mt-10 inline-flex rounded-full bg-white px-8 py-3.5 text-base font-semibold text-[var(--color-ink-soft)] shadow-lg transition-colors hover:bg-[var(--color-surface)]"
          >
            pnpm dlx yyx-agent-kit
          </a>
        </div>

        <div className="rounded-[32px] bg-white p-9 shadow-xl">
          <h3 className="text-2xl font-bold text-[var(--color-ink-soft)]">
            Fill this form below
          </h3>
          <div className="mt-8 space-y-6">
            {fields.map((field) => (
              <div key={field.label}>
                <p className="text-[13px] font-semibold text-[var(--color-ink-soft)]">
                  {field.label}
                </p>
                <div className="mt-2 border-b border-[var(--color-line)] pb-2 text-sm text-[var(--color-muted-light)]">
                  {field.placeholder}
                </div>
              </div>
            ))}
          </div>
          <a
            href="https://www.npmjs.com/package/yyx-agent-kit"
            className="mt-10 flex items-center justify-center rounded-full bg-[var(--color-ink)] py-3.5 text-base font-semibold text-white transition-colors hover:bg-[var(--color-ink-soft)]"
          >
            Get Started →
          </a>
        </div>
      </div>
    </div>
  </section>
);
