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

const reportStats = [
  { label: "Total dossiers", value: String(reports.length).padStart(2, "0") },
  {
    label: "Published",
    value: String(reports.filter((item) => item.status === "published").length).padStart(2, "0"),
  },
  {
    label: "Custom queue",
    value: String(reports.filter((item) => item.status === "custom-only").length).padStart(2, "0"),
  },
];

export default function ReportsPage() {
  const schema = getCollectionPageSchema({
    title: "深度報告｜AI Patent Insight",
    description:
      "以技術地圖、關鍵公司與產業結構為核心的研究報告頁，聚焦主流技術、分支路徑與企業技術定位。",
    path: "/reports",
  });

  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <SchemaScript data={schema} />

      <section className="brand-card overflow-hidden rounded-[36px] p-6 md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr]">
          <div className="max-w-4xl">
            <p className="brand-kicker">Report Library</p>
            <h1 className="mt-2 text-4xl font-semibold brand-title md:text-5xl">深度報告資料庫</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--brand-text-soft)]">
              報告頁改成封面牆與資料庫模式，不再只是單純文章列表。
              每一張卡都像研究商品頁的封面，先給主題、狀態、發布日期，再進報告詳頁。
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <span className="brand-chip">Longform dossiers</span>
              <span className="brand-chip">Terminal cover wall</span>
              <span className="brand-chip">Research product surface</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {reportStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[26px] border border-[var(--brand-line)] bg-[rgba(9,17,29,0.76)] p-5"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-text-muted)]">
                  {stat.label}
                </p>
                <p className="brand-data mt-4 text-4xl font-semibold text-white">{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <article
            key={report.slug}
            className="group overflow-hidden rounded-[30px] border border-[var(--brand-line)] bg-[linear-gradient(180deg,rgba(21,30,48,0.96)_0%,rgba(11,17,29,0.96)_100%)] transition hover:-translate-y-1 hover:border-[var(--brand-line-strong)]"
          >
            <Link href={`/reports/${report.slug}`} className="block h-full">
              <div className="relative">
                <div className="absolute left-4 top-4 z-10 rounded-full border border-[var(--brand-line)] bg-[rgba(10,15,25,0.78)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--brand-blue)] backdrop-blur">
                  {report.category}
                </div>

                {report.coverImage ? (
                  <img
                    src={report.coverImage}
                    alt={report.title}
                    className="h-64 w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="brand-grid flex h-64 items-center justify-center bg-[rgba(9,17,29,0.96)]">
                    <img
                      src="/brand/logo-panda.png"
                      alt="AI Patent Insight"
                      className="h-16 w-16 rounded-full border border-[var(--brand-line)] bg-[var(--brand-surface)] p-2"
                    />
                  </div>
                )}
              </div>

              <div className="flex h-[calc(100%-16rem)] flex-col p-6">
                <div className="flex items-center justify-between gap-4">
                  <span className="rounded-full border border-[var(--brand-line)] px-3 py-1 text-xs text-[var(--brand-text-soft)]">
                    {report.status === "custom-only" ? "Custom only" : "Published"}
                  </span>
                  <span className="brand-data text-xs text-[var(--brand-text-muted)]">
                    {report.publishedAt}
                  </span>
                </div>

                <h2 className="mt-5 line-clamp-3 text-2xl font-semibold leading-tight text-white brand-title">
                  {report.title}
                </h2>

                <p className="mt-4 line-clamp-4 text-sm leading-7 text-[var(--brand-text-soft)]">
                  {report.summary}
                </p>

                <div className="mt-auto pt-6">
                  <span className="text-sm font-semibold text-white">Open dossier →</span>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </section>
    </main>
  );
}
