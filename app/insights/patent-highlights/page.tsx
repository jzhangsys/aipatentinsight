import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import { getWebPageSchema, siteUrl } from "@/lib/schema";

export const metadata: Metadata = {
  title: "精選專利摘要",
  description:
    "從大量專利中提煉重點技術內容，快速掌握專利主張、應用方向與技術意義。",
};

const sampleItems = [
  "高頻傳輸與封裝相關專利摘要",
  "生成式 AI 推論加速技術專利摘要",
  "CPO 共封裝光學專利重點摘要",
];

export default function PatentHighlightsPage() {
  const schemaData = getWebPageSchema({
    name: "精選專利摘要",
    description:
      "從大量專利中提煉重點技術內容，快速掌握專利主張、應用方向與技術意義。",
    url: `${siteUrl}/insights/patent-highlights`,
    about: sampleItems,
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <SchemaScript data={schemaData} />

      <section className="brand-card rounded-[36px] p-6 md:p-8">
        <p className="brand-kicker">Patent Highlights</p>
        <h1 className="mt-2 text-4xl font-semibold brand-title md:text-5xl">專利亮點摘要</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--brand-text-soft)]">
          把專利摘要改成 watchlist 卡片，作為報告、簡報與後續 API 輸出的基礎素材頁。
        </p>
      </section>

      <section className="mt-8 grid gap-4">
        {sampleItems.map((item, index) => (
          <article
            key={item}
            className="rounded-[26px] border border-[var(--brand-line)] bg-[rgba(19,28,46,0.82)] px-5 py-5"
          >
            <p className="brand-data text-xs text-[var(--brand-blue)]">{String(index + 1).padStart(2, "0")}</p>
            <h2 className="mt-3 text-xl font-semibold text-white">{item}</h2>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <Link href="/reports" className="brand-button-primary">
          前往深度解析報告
        </Link>
      </section>
    </main>
  );
}
