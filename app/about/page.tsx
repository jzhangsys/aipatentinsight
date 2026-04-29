import type { Metadata } from "next";
import TerminalPage from "@/components/terminal/TerminalPage";

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
    <TerminalPage
      eyebrow="Method"
      title="研究方法與平台定位"
      description="這頁不再保留舊式品牌介紹頁，只留下終端系統裡必要的方法論說明。AI Patent Insight 被視為一個研究介面，而不是傳統內容網站。"
      stats={[
        { label: "System", value: "Terminal" },
        { label: "Focus", value: "Signals" },
        { label: "Mode", value: "Live" },
      ]}
    >
      <div className="grid gap-4 md:grid-cols-3">
        {methodBlocks.map((block) => (
          <article key={block.title} className="brand-card rounded-[8px] p-6">
            <p className="brand-panel-label">Module</p>
            <h2 className="mt-3 text-2xl font-light tracking-[0.08em] text-white">{block.title}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">{block.body}</p>
          </article>
        ))}
      </div>
    </TerminalPage>
  );
}
