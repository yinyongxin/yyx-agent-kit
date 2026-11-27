const navItems = [
  { label: "首页", href: "#top" },
  { label: "特性", href: "#features" },
  { label: "流水线", href: "#workflow" },
  { label: "技术栈", href: "#stack" },
  { label: "FAQ", href: "#faq" },
];

// 毛玻璃胶囊导航：backdrop-blur 是真 backdrop-filter，比 Penpot 的近似效果更贴近参考站
export const SiteNav = () => (
  <header className="absolute inset-x-0 top-8 z-20 flex flex-col items-center gap-3 px-6">
    <nav className="flex w-full max-w-[720px] items-center justify-between gap-6 rounded-full border border-white/70 bg-white/55 px-7 py-3 shadow-[0_10px_40px_rgba(9,9,11,0.08)] backdrop-blur-2xl">
      <a
        href="#top"
        className="text-[21px] font-bold tracking-tight text-[var(--color-ink)]"
      >
        yyx-agent-kit
      </a>
      <ul className="hidden items-center gap-7 text-sm font-medium text-[var(--color-muted)] md:flex">
        {navItems.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="transition-colors hover:text-[var(--color-brand)]"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
      <a
        href="#cta"
        className="rounded-full bg-[var(--color-ink)] px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[var(--color-ink-soft)]"
      >
        开始使用
      </a>
    </nav>
    {/* 小屏没有桌面菜单，补一行可点的快捷导航，避免手机上无法跳转 */}
    <ul className="flex gap-5 rounded-full bg-white/70 px-5 py-2 text-xs font-medium text-[var(--color-muted)] shadow-sm backdrop-blur-xl md:hidden">
      {navItems.slice(1).map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            className="transition-colors hover:text-[var(--color-brand)]"
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  </header>
);
