import {
  Cli,
  Cta,
  Faq,
  Features,
  Hero,
  SiteFooter,
  Stack,
  Trust,
  Workflow,
} from "./components";

// 门户面向未登录访客，全部为静态 server component；只有 FAQ 交互下沉为 client component
export default function HomePage() {
  return (
    <>
      <main>
        <Hero />
        <Trust />
        <Features />
        <Workflow />
        <Stack />
        <Cli />
        <Faq />
        <Cta />
      </main>
      <SiteFooter />
    </>
  );
}
