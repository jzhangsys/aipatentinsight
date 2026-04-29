import type { Metadata } from "next";
import Link from "next/link";
import TerminalPage from "@/components/terminal/TerminalPage";

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
    <TerminalPage
      eyebrow="API Console"
      title="研究資料服務介面"
      description="舊版產品說明區塊已移除。這頁現在只保留終端式模組列表，專注描述資料輸出能力與導入情境。"
      stats={[
        { label: "Format", value: "JSON" },
        { label: "Access", value: "Custom" },
        { label: "Target", value: "B2B" },
      ]}
    >
      <div className="mb-6 flex flex-wrap gap-4">
        <Link href="/contact" className="brand-button-primary">
          洽詢 API 導入
        </Link>
        <span className="brand-button-secondary">Custom only</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {apiCards.map((card) => (
          <article key={card.title} className="brand-card rounded-[8px] p-6">
            <p className="brand-panel-label">Module</p>
            <h2 className="mt-3 text-2xl font-light tracking-[0.08em] text-white">{card.title}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">{card.body}</p>
          </article>
        ))}
      </div>
    </TerminalPage>
  );
}
