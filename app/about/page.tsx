import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "關於我們｜AI Patent Insight",
  description:
    "了解 AI Patent Insight 的研究定位、內容方向與未來服務架構。",
};

const methodBlocks = [
  {
    title: "Signal first",
    body: "先建可追蹤的技術與產業訊號，再把訊號整理成可閱讀的研究敘事。",
  },
  {
    title: "Structure over noise",
    body: "重點不是追逐單一新聞，而是理解技術主幹、橋接節點與公司位置。",
  },
  {
    title: "Research as product",
    body: "把報告、洞察與 API 視為同一套資料層的不同輸出介面。",
  },
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <section className="brand-card rounded-[36px] p-6 md:p-8">
        <p className="brand-kicker">Method</p>
        <h1 className="mt-2 text-4xl font-semibold brand-title md:text-5xl">研究方法與平台定位</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--brand-text-soft)]">
          AI Patent Insight 不是一般內容站，而是把專利研究、產業敘事與未來資料服務放進同一個產品介面。
          這次改版後，整體視覺與資訊層級都更接近研究終端。
        </p>
      </section>

      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {methodBlocks.map((block) => (
          <article key={block.title} className="brand-card-soft rounded-[30px] p-6">
            <h2 className="text-2xl font-semibold text-white brand-title">{block.title}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">{block.body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
