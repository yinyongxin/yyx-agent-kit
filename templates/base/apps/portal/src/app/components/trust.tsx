const logos = ["OpenCode", "pnpm", "NestJS", "React", "Next.js", "Prisma", "Docker"];

export const Trust = () => (
  <section
    id="trust"
    className="mx-auto flex max-w-[1360px] flex-wrap items-center justify-center gap-x-12 gap-y-4 px-6 pb-24 text-[var(--color-muted-light)]"
  >
    <p className="text-sm leading-6">
      Trusted by 100+
      <br />
      top-tier agents
    </p>
    <ul className="flex flex-wrap items-center gap-x-10 gap-y-4">
      {logos.map((logo) => (
        <li key={logo} className="text-lg font-bold">
          {logo}
        </li>
      ))}
    </ul>
  </section>
);
