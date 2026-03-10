import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import { getCollectionPageSchema } from "@/lib/pageSchema";
import { reports } from "@/content/reports/reports";

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
          每篇報告皆以結構化方式整理主流技術、支撐層、橋接節點與企業位置。
        </p>
      </section>

      <section className="mt-10 brand-card rounded-[32px] p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
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
                研究封面牆
              </h2>
            </div>
          </div>

          <div className="max-w-2xl text-sm leading-7 text-[var(--brand-text-soft)]">
            這裡收錄以技術演化、專利研究、公司定位與產業結構為核心的深度研究內容。
            你可以先從旗艦報告開始，再逐步延伸到不同技術主題與公司層級的專題研究。
          </div>
        </div>
      </section>

      <section className="mt-12 grid gap-8 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <article
            key={report.slug}
            className="group overflow-hidden rounded-[30px] border border-[var(--brand-line)] bg-white shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg"
          >
            <Link href={`/reports/${report.slug}`} className="block">
              <div className="relative">
                <div className="absolute left-4 top-4 z-10 flex items-center gap-2 rounded-full border border-white/60 bg-white/85 px-3 py-1 backdrop-blur">
                  <img
                    src="/brand/logo-panda.png"
                    alt="熊貓看產業"
                    className="h-6 w-6 rounded-full border border-[var(--brand-line)] bg-white p-0.5"
                  />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--brand-blue)]">
                    Panda Watch
                  </span>
                </div>

                {report.coverImage ? (
                  <img
                    src={report.coverImage}
                    alt={report.title}
                    className="h-64 w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                  />
                ) : (
                  <div className="flex h-64 w-full items-center justify-center bg-[linear-gradient(135deg,#eef4ff_0%,#ede9fe_100%)]">
                    <div className="text-center">
                      <img
                        src="/brand/logo-panda.png"
                        alt="熊貓看產業"
                        className="mx-auto h-20 w-20 rounded-full border border-[var(--brand-line)] bg-white p-2"
                      />
                      <p className="mt-4 text-sm font-semibold text-[var(--brand-blue)]">
                        AI Patent Insight
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-[var(--brand-surface-2)] px-3 py-1 text-xs font-semibold text-[var(--brand-blue)]">
                    {report.category}
                  </span>

                  <span className="rounded-full border border-[var(--brand-line)] px-3 py-1 text-xs font-medium text-[var(--brand-text-muted)]">
                    {report.status === "custom-only" ? "客製預定" : "已發布"}
                  </span>
                </div>

                <h2 className="mt-4 line-clamp-2 text-2xl font-semibold leading-tight text-[var(--brand-ink)] brand-title">
                  {report.title}
                </h2>

                <p className="mt-4 line-clamp-4 text-sm leading-7 text-[var(--brand-text-soft)]">
                  {report.summary}
                </p>

                <div className="mt-6 flex items-center justify-between border-t border-[var(--brand-line)] pt-4">
                  <div className="text-xs text-[var(--brand-text-muted)]">
                    發布日期：{report.publishedAt}
                  </div>
                  <span className="text-sm font-semibold text-[var(--brand-blue)] underline underline-offset-4">
                    閱讀報告
                  </span>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </section>

      <section className="mt-16 border-t border-[var(--brand-line)] pt-12">
        <p className="brand-kicker">Research Notes</p>
        <h2 className="mt-2 text-2xl font-semibold brand-title">研究說明</h2>
        <div className="mt-5 max-w-4xl space-y-5">
          <p className="text-base leading-8 text-[var(--brand-text-soft)]">
            本站目前之專利技術分析，主要以台灣申請或公開之專利文件為主要研究來源，
            尚未完整納入其他國家或地區之專利資料。
          </p>
          <p className="text-base leading-8 text-[var(--brand-text-soft)]">
            本站內容僅供技術研究、產業觀察與資訊整理之用途，不構成任何形式之投資建議、
            證券推薦、投資邀約或財務建議。
          </p>
        </div>
      </section>
    </main>
  );
}
