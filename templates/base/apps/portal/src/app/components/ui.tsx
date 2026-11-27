import type { ReactNode } from "react";

type KickerTone = "light" | "dark" | "glass";

// 统一的小标签：白底橙点 / 深色底 / 玻璃底
export const Kicker = ({
  children,
  tone = "light",
}: {
  children: ReactNode;
  tone?: KickerTone;
}) => {
  const toneClass =
    tone === "dark"
      ? "bg-[#27272A] text-[var(--color-muted-light)]"
      : tone === "glass"
        ? "bg-white/25 text-white backdrop-blur-md"
        : "bg-white text-[var(--color-brand)] shadow-sm";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-[13px] font-semibold ${toneClass}`}
    >
      <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-brand)]" />
      {children}
    </span>
  );
};

// 区块标题：kicker + 双行大标题 + 说明，全站统一节奏
export const SectionTitle = ({
  kicker,
  lines,
  description,
  tone = "light",
  align = "left",
}: {
  kicker: string;
  lines: [string, string];
  description?: string;
  tone?: "light" | "dark";
  align?: "left" | "center";
}) => {
  const headingColor = tone === "dark" ? "text-white" : "text-[var(--color-ink-soft)]";
  const descColor = tone === "dark" ? "text-[var(--color-muted-light)]" : "text-[var(--color-muted)]";

  return (
    <div className={align === "center" ? "text-center" : "text-left"}>
      <Kicker tone={tone === "dark" ? "glass" : "light"}>{kicker}</Kicker>
      <h2
        className={`mt-6 text-[clamp(2.25rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.03em] ${headingColor}`}
      >
        <span className="block">{lines[0]}</span>
        <span className="block">{lines[1]}</span>
      </h2>
      {description ? (
        <p className={`mt-6 max-w-xl text-base leading-7 ${descColor}`}>
          {description}
        </p>
      ) : null}
    </div>
  );
};

// 橙红渐变图标块，流程/技术栈卡片复用
export const GradientIcon = ({ children }: { children: ReactNode }) => (
  <span className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-brand-warm)] text-lg font-bold text-white shadow-lg shadow-[#FD3A25]/25">
    {children}
  </span>
);
