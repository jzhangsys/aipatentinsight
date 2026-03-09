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
    <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
      <SchemaScript data={schemaData} />

      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold">產業演化趨勢</h1>
        <p className="mt-4 text-lg leading-8 text-neutral-600">
          追蹤技術主題、產業路線與市場變化，理解產業如何從萌芽逐步走向主流。
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">最新主題</h2>
        <ul className="mt-6 space-y-4">
          {sampleItems.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-neutral-200 px-5 py-4"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className="text-2xl font-semibold">延伸到深度解析報告</h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-neutral-600">
          若你需要更完整的圖文研究內容、比較框架與客製化分析方向，可進一步查看深度解析報告。
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
