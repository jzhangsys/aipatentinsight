import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import { reports } from "@/content/reports/reports";
import { getWebPageSchema } from "@/lib/pageSchema";

const homeTabs = [
  { href: "/insights", label: "Insights", meta: "公司專利圖譜與類別聚焦" },
  { href: "/reports", label: "Flagship", meta: "深度報告與封面牆" },
  { href: "/api-services", label: "API", meta: "研究資料介面與客製輸出" },
  { href: "/contact", label: "Contact", meta: "合作與採購入口" },
];

const signalStats = [
  { label: "Reports", value: String(reports.length).padStart(2, "0") },
  { label: "Focus", value: "TW" },
  { label: "Mode", value: "LIVE" },
];

const labelCloud = [
  "Semiconductor",
  "Display",
  "Memory",
  "Thermal",
  "Optics",
  "Wireless",
];

export default function HomePage() {
  const schema = getWebPageSchema({
    title: "AI Patent Insight｜熊貓看產業",
    description:
      "以技術演化為核心的研究平台，透過專利、產業訊號與技術結構分析，辨識主流技術、分支路徑與企業在技術地圖中的位置。",
    path: "/",
  });

  return (
    <main className="px-0 pb-10 pt-0">
      <SchemaScript data={schema} />

      <section className="brand-vignette relative min-h-[calc(100vh-84px)] overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute left-[8%] top-[18%] h-56 w-56 rounded-full bg-[radial-gradient(circle,rgba(125,249,255,0.18)_0%,rgba(125,249,255,0.03)_38%,transparent_72%)]" />
          <div className="absolute right-[16%] top-[24%] h-40 w-40 rounded-full bg-[radial-gradient(circle,rgba(125,249,255,0.12)_0%,rgba(125,249,255,0.02)_42%,transparent_72%)]" />
          <div className="brand-grid absolute inset-x-[8%] top-[18%] h-[58%] rounded-[32px] border border-[rgba(125,249,255,0.06)] opacity-45" />
          <svg
            className="absolute inset-0 h-full w-full opacity-55"
            viewBox="0 0 1200 800"
            aria-hidden="true"
          >
            <path d="M220 540L420 410L650 470L860 320L1020 390" stroke="rgba(125,249,255,0.18)" strokeWidth="1" fill="none" />
            <path d="M260 280L420 410L520 240L720 210L860 320" stroke="rgba(125,249,255,0.12)" strokeWidth="1" fill="none" />
            {[["220", "540"], ["420", "410"], ["650", "470"], ["860", "320"], ["1020", "390"], ["260", "280"], ["520", "240"], ["720", "210"]].map(
              ([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="5" fill="rgba(125,249,255,0.85)" />
              )
            )}
          </svg>
        </div>

        <div className="relative mx-auto flex max-w-7xl flex-col px-6 pb-8 pt-24 md:px-10">
          <div className="max-w-4xl">
            <p className="brand-panel-label">Research Interface</p>
            <h1 className="mt-4 text-5xl font-light tracking-[0.16em] text-white md:text-7xl">
              AIPatentInsight
            </h1>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.28em] text-[var(--brand-text-muted)]">
              Patent Signal Desk · Structured Industry Intelligence
            </p>
            <p className="mt-8 max-w-2xl text-lg font-light leading-9 text-[var(--brand-text-soft)]">
              根據你給的 `insights-inline.html`，首頁現在先往沉浸式研究終端修正：
              深色星圖背景、極簡導覽、螢光青介面，以及像 control room 一樣的資訊分區。
            </p>

            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/insights" className="brand-button-primary">
                Enter Insights
              </Link>
              <Link href="/reports" className="brand-button-secondary">
                View Reports
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-4 md:grid-cols-[0.8fr_1.2fr]">
            <div className="brand-card brand-glow rounded-[10px] p-5">
              <p className="brand-panel-label">Category Labels</p>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-4">
                {labelCloud.map((label) => (
                  <span key={label} className="font-mono text-[11px] uppercase tracking-[0.24em] text-[rgba(255,255,255,0.58)]">
                    <span className="mr-2 inline-block h-2 w-2 rounded-full bg-[var(--brand-blue)] shadow-[0_0_8px_rgba(125,249,255,0.72)]" />
                    {label}
                  </span>
                ))}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-[0.9fr_1.1fr]">
              <div className="brand-card rounded-[10px] p-5">
                <p className="brand-panel-label">Stats</p>
                <div className="mt-5 grid grid-cols-3 gap-4">
                  {signalStats.map((stat) => (
                    <div key={stat.label}>
                      <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-[var(--brand-text-muted)]">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-light tracking-[0.08em] text-white brand-data">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="brand-card rounded-[10px] p-5">
                <p className="brand-panel-label">Featured Stream</p>
                <div className="mt-4 space-y-3">
                  {reports.slice(0, 3).map((report) => (
                    <Link
                      key={report.slug}
                      href={`/reports/${report.slug}`}
                      className="flex items-center justify-between gap-4 border-b border-[var(--brand-line)] pb-3 last:border-b-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-white">{report.title}</p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--brand-text-muted)]">
                          {report.category}
                        </p>
                      </div>
                      <span className="brand-data text-[10px] text-[var(--brand-blue)]">
                        {report.publishedAt}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-4">
            {homeTabs.map((tab) => (
              <Link
                key={tab.href}
                href={tab.href}
                className="brand-card rounded-[10px] p-5 transition hover:border-[var(--brand-line-strong)] hover:bg-[rgba(125,249,255,0.04)]"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--brand-blue)]">
                  {tab.label}
                </p>
                <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">{tab.meta}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
