const footerLinks = [
  { label: "首页", href: "#top" },
  { label: "特性", href: "#features" },
  { label: "流水线", href: "#workflow" },
  { label: "技术栈", href: "#stack" },
  { label: "FAQ", href: "#faq" },
  { label: "文档", href: "https://www.npmjs.com/package/yyx-agent-kit" },
];

export const SiteFooter = () => (
  <footer className="bg-[var(--color-ink)] px-6 py-14 text-white">
    <div className="mx-auto max-w-[1360px]">
      <div className="flex flex-wrap items-start justify-between gap-8">
        <div>
          <p className="text-2xl font-bold tracking-tight">yyx-agent-kit</p>
          <p className="mt-2 text-sm text-[var(--color-muted-light)]">让每次交付都有据可查</p>
        </div>
        <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-[var(--color-muted-light)]">
          {footerLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="transition-colors hover:text-[var(--color-brand)]"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </div>
      <div className="mt-10 h-px bg-[#27272A]" />
      <p className="mt-6 text-xs text-[var(--color-muted-light)]">
        © 2026 yyx-agent-kit · OpenCode / pnpm / NestJS / React
      </p>
    </div>
  </footer>
);
