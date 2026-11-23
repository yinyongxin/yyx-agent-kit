import type { Metadata } from "next";
import type { ReactNode } from "react";
import { APP_NAME } from "@agent-test/shared";
import "./globals.css";

export const metadata: Metadata = {
  title: APP_NAME,
  description: "面向外部访客的公开门户站点",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
