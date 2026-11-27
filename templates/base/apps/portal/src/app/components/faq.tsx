"use client";

import { useState } from "react";

const qas = [
  {
    q: "和直接让 AI 写代码有什么不同？",
    a: "流程有门禁、有独立测试角色、有可追溯的交付文档，按验收标准判定通过，不是生成一段代码就结束。",
  },
  {
    q: "必须在 OpenCode 里用吗？",
    a: "规范与流程以 skill/agent 形式组织，为 OpenCode 设计；模板里的工程约定对任何工具链都适用。",
  },
  {
    q: "新项目从零配环境很麻烦？",
    a: "CLI 会一并生成 skills、agents、Docker compose 与工程规范，且 skills 内置进项目，换机器也能直接用。",
  },
  {
    q: "以后能接入 SSO 吗？",
    a: "后端用 NestJS 官方认证授权包，Google OIDC 开箱即用，微信扫码需要自定义 provider。",
  },
];

export const Faq = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className="px-6 pb-24">
      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-[var(--color-brand)] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[var(--color-brand)]" />
            FAQ
          </span>
          <h2 className="mt-6 text-[clamp(2.25rem,4vw,3.25rem)] font-bold leading-[1.1] tracking-[-0.03em] text-[var(--color-ink-soft)]">
            Frequently Asked
            <span className="block">Questions</span>
          </h2>
        </div>

        <div className="mt-12 space-y-4">
          {qas.map((qa, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={qa.q}
                className="rounded-[28px] bg-white px-8 py-5 shadow-sm"
              >
                <button
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq-answer-${index}`}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="flex w-full items-center justify-between gap-4 text-left"
                >
                  <span className="text-base font-semibold text-[var(--color-ink-soft)]">
                    {qa.q}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-lg text-white">
                    {isOpen ? "−" : "+"}
                  </span>
                </button>
                <p
                  id={`faq-answer-${index}`}
                  hidden={!isOpen}
                  className="mt-4 max-w-2xl text-sm leading-6 text-[var(--color-muted)]"
                >
                  {qa.a}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
