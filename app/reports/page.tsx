import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import TerminalPage from "@/components/terminal/TerminalPage";
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
    <TerminalPage
      eyebrow="Flagship"
      title="深度報告資料庫"
      description="舊版報告列表頁已完全移除，現在只保留新版 terminal library。所有報告用同一種封面卡與 metadata 節奏展示。"
      stats={reportStats}
    >
      <SchemaScript data={schema} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {reports.map((report) => (
          <article
            key={report.slug}
            className="group overflow-hidden rounded-[8px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.03)] transition hover:-translate-y-1 hover:border-[var(--brand-line-strong)]"
          >
            <Link href={`/reports/${report.slug}`} className="block h-full">
              <div className="relative">
                <div className="absolute left-4 top-4 z-10 rounded-[4px] border border-[var(--brand-line)] bg-[rgba(3,5,15,0.82)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--brand-blue)]">
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
                  <span className="rounded-[4px] border border-[var(--brand-line)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--brand-text-soft)]">
                    {report.status === "custom-only" ? "Custom only" : "Published"}
                  </span>
                  <span className="brand-data text-xs text-[var(--brand-text-muted)]">
                    {report.publishedAt}
                  </span>
                </div>

                <h2 className="mt-5 line-clamp-3 text-2xl font-light leading-tight tracking-[0.04em] text-white">
                  {report.title}
                </h2>

                <p className="mt-4 line-clamp-4 text-sm leading-7 text-[var(--brand-text-soft)]">
                  {report.summary}
                </p>

                <div className="mt-auto pt-6">
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-[var(--brand-blue)]">
                    Open dossier →
                  </span>
                </div>
              </div>
            </Link>
          </article>
        ))}
      </div>
    </TerminalPage>
  );
}
