import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import { getCollectionPageSchema } from "@/lib/pageSchema";

export const metadata: Metadata = {
  title: "深度報告",
  description:
    "以技術地圖、關鍵公司與產業結構為核心的研究報告頁，聚焦主流技術、分支路徑與企業技術定位。",
};

export default function ReportsPage() {
  const schema = getCollectionPageSchema({
    title: "深度報告｜AI Patent Insight",
    description:
      "以技術地圖、關鍵公司與產業結構為核心的研究報告頁，聚焦主流技術、分支路徑與企業技術定位。",
    path: "/reports",
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
      <SchemaScript data={schema} />

      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold">深度報告</h1>
        <p className="mt-4 text-lg leading-8 text-neutral-600">
          提供產業、技術、專利與公司主題的深度解析服務，包含標準化研究架構與客製化研究方向。
        </p>
        <p className="mt-4 text-base font-medium text-neutral-900">
          目前僅接受客製預定。
        </p>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">標準化研究架構</h2>
          <p className="mt-4 text-sm leading-7 text-neutral-600">
            預留未來可延伸為標準化深度報告的產品架構，便於後續擴充為可展示、可販售的研究模組。
          </p>
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">客製化研究需求</h2>
          <p className="mt-4 text-sm leading-7 text-neutral-600">
            可依指定產業、公司、專利範圍與技術主題，規劃客製化深度解析方向。
          </p>
          <div className="mt-6">
            <Link
              href="/contact"
              className="text-sm font-medium text-neutral-900 underline underline-offset-4"
            >
              洽詢客製需求
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
