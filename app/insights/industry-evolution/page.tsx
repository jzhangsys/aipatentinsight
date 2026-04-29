import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import { getWebPageSchema, siteUrl } from "@/lib/schema";

export const metadata: Metadata = {
  title: "產業演化趨勢",
  description:
    "追蹤技術路線、產業動能與主流演化方向，建立對關鍵產業的結構化理解。",
};

const sampleItems = [
  "AI 伺服器產業演化觀察",
  "先進封裝主流技術路徑整理",
  "生技與 AI 結合的技術動能變化",
];

export default function IndustryEvolutionPage() {
  const schemaData = getWebPageSchema({
    name: "產業演化趨勢",
    description:
      "追蹤技術路線、產業動能與主流演化方向，建立對關鍵產業的結構化理解。",
    url: `${siteUrl}/insights/industry-evolution`,
    about: sampleItems,
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <SchemaScript data={schemaData} />

      <section className="brand-card rounded-[36px] p-6 md:p-8">
        <p className="brand-kicker">Industry Evolution</p>
        <h1 className="mt-2 text-4xl font-semibold brand-title md:text-5xl">產業演化速覽</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--brand-text-soft)]">
          把短篇產業主題整理成可滾動的 watchlist，當作深度報告之前的熱身頁。
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
