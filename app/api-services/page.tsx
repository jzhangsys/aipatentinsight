import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API 服務｜AI Patent Insight",
  description:
    "提供可供企業與研究團隊規劃導入的 API 服務架構，目前僅接受客製預定。",
};

const apiCards = [
  {
    title: "Patent signals",
    body: "輸出專利摘要、技術主題、分類群組與重點敘事欄位。",
  },
  {
    title: "Company mapping",
    body: "將公司放進技術地圖，提供位置、橋接角色與主題曝險。",
  },
  {
    title: "Research delivery",
    body: "支援內部 dashboard、投研流程與報告自動化輸出場景。",
  },
];

export default function ApiServicesPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <section className="brand-card overflow-hidden rounded-[36px] p-6 md:p-8">
        <div className="grid gap-8 xl:grid-cols-[1fr_0.9fr]">
          <div className="max-w-4xl">
            <p className="brand-kicker">API Console</p>
            <h1 className="mt-2 text-4xl font-semibold brand-title md:text-5xl">研究資料服務介面</h1>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--brand-text-soft)]">
              這頁不再像靜態說明，而是用產品控制台的語言展示未來 API 可以提供什麼欄位、
              接到哪裡、適合誰導入。目前仍是客製預定模式。
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link href="/contact" className="brand-button-primary">
                洽詢 API 導入
              </Link>
              <span className="brand-button-secondary">Custom only</span>
            </div>
          </div>

          <div className="rounded-[30px] border border-[var(--brand-line)] bg-[rgba(9,17,29,0.82)] p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-text-muted)]">
              Delivery modes
            </p>
            <div className="mt-5 space-y-4">
              <div className="rounded-[22px] border border-[var(--brand-line)] bg-[rgba(19,28,46,0.84)] p-4">
                <p className="brand-data text-xl font-semibold text-[var(--brand-green)]">JSON</p>
                <p className="mt-2 text-sm text-[var(--brand-text-soft)]">研究資料流與內部系統串接</p>
              </div>
              <div className="rounded-[22px] border border-[var(--brand-line)] bg-[rgba(19,28,46,0.84)] p-4">
                <p className="brand-data text-xl font-semibold text-white">Brief API</p>
                <p className="mt-2 text-sm text-[var(--brand-text-soft)]">公司簡報、技術摘要與主題拉取</p>
              </div>
              <div className="rounded-[22px] border border-[var(--brand-line)] bg-[rgba(19,28,46,0.84)] p-4">
                <p className="brand-data text-xl font-semibold text-white">Research feed</p>
                <p className="mt-2 text-sm text-[var(--brand-text-soft)]">投研桌面、知識庫與客製報告底層資料</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {apiCards.map((card) => (
          <article key={card.title} className="brand-card-soft rounded-[30px] p-6">
            <p className="text-xs uppercase tracking-[0.18em] text-[var(--brand-text-muted)]">
              Module
            </p>
            <h2 className="mt-4 text-2xl font-semibold text-white brand-title">{card.title}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">{card.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
