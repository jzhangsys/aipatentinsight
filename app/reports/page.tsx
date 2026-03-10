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

      <section className="max-w-4xl">
        <p className="brand-kicker">Research Reports</p>
        <h1 className="mt-2 text-4xl font-bold brand-title">深度報告</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--brand-text-soft)]">
          以旗艦研究頁形式，系統整理技術地圖、關鍵公司、產業結構與演化方向。
        </p>
      </section>

      <section className="mt-10 brand-card rounded-[32px] p-8">
        <div className="flex items-center gap-4">
          <img
            src="/brand/logo-panda.png"
            alt="熊貓看產業"
            className="h-16 w-16 rounded-full border border-[var(--brand-line)] bg-white p-2"
          />
          <div>
            <p className="text-sm font-semibold tracking-wide text-[var(--brand-blue)]">
              Panda Industry Watch
            </p>
            <h2 className="mt-1 text-2xl font-semibold brand-title">
              研究型內容集合
            </h2>
          </div>
        </div>

        <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--brand-text-soft)]">
          這裡收錄以技術演化、產業結構與公司定位為核心的深度研究內容。
          每一篇報告皆以結構化方式整理主流技術、分支路徑與企業在技術地圖中的位置。
        </p>

        <div className="mt-6">
          <Link href="/contact" className="brand-button-secondary">
            洽詢客製研究
          </Link>
        </div>
      </section>
    </main>
  );
}
