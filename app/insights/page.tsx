import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import { getCollectionPageSchema, siteUrl } from "@/lib/schema";

export const metadata: Metadata = {
  title: "洞察 Insights",
  description:
    "瀏覽產業演化趨勢、精選專利摘要與精選公司簡介，建立可持續累積的研究內容入口。",
};

const insightCards = [
  {
    href: "/insights/industry-evolution",
    title: "產業演化趨勢",
    description:
      "追蹤技術主題、產業路線與演化動能，理解關鍵產業如何從萌芽走向主流。",
  },
  {
    href: "/insights/patent-highlights",
    title: "精選專利摘要",
    description:
      "從大量專利中提煉關鍵技術資訊，快速掌握專利內容、應用方向與技術意義。",
  },
  {
    href: "/insights/company-briefs",
    title: "精選公司簡介",
    description:
      "整理重點公司的技術定位、產品方向與競爭位置，建立更清楚的公司理解框架。",
  },
];

export default function InsightsPage() {
  const schemaData = getCollectionPageSchema({
    name: "洞察 Insights",
    description:
      "瀏覽產業演化趨勢、精選專利摘要與精選公司簡介，建立可持續累積的研究內容入口。",
    url: `${siteUrl}/insights`,
    itemNames: insightCards.map((card) => card.title),
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
      <SchemaScript data={schemaData} />

      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold">洞察 Insights</h1>
        <p className="mt-4 text-lg leading-8 text-neutral-600">
          以產業、專利與公司三條主線，逐步建立可持續累積的研究內容平台。
        </p>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-3">
        {insightCards.map((card) => (
          <article
            key={card.href}
            className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-xl font-semibold">{card.title}</h2>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              {card.description}
            </p>
            <div className="mt-6">
              <Link
                href={card.href}
                className="text-sm font-medium text-neutral-900 underline underline-offset-4"
              >
                進入頁面
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className="text-2xl font-semibold">延伸閱讀與研究服務</h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-neutral-600">
          若你希望從公開洞察內容延伸到更完整的圖文研究內容，可進一步查看深度解析報告頁面。
        </p>
        <div className="mt-6">
          <Link
            href="/reports"
            className="text-sm font-medium text-neutral-900 underline underline-offset-4"
          >
            前往深度解析報告
          </Link>
        </div>
      </section>
    </main>
  );
}
