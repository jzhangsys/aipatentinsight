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
    <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
      <SchemaScript data={schemaData} />

      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold">精選專利摘要</h1>
        <p className="mt-4 text-lg leading-8 text-neutral-600">
          針對關鍵專利內容進行摘要整理，協助快速理解技術重點、專利脈絡與應用方向。
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">最新專利主題</h2>
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
          若你希望從摘要整理延伸到更完整的專利比較、技術脈絡與研究內容，可進一步查看深度解析報告。
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
