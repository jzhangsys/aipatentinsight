import type { Metadata } from "next";
import TerminalPage from "@/components/terminal/TerminalPage";

export const metadata: Metadata = {
  title: "聯絡我們｜AI Patent Insight",
  description:
    "與 AI Patent Insight 聯絡，洽詢 API 服務、深度解析報告與研究合作需求。",
};

const contactCards = [
  {
    title: "API 客製",
    body: "研究資料欄位、內部系統串接、策略分析桌面整合。",
  },
  {
    title: "報告合作",
    body: "深度報告採購、客製白皮書與產業主題研究。",
  },
  {
    title: "研究聯繫",
    body: "針對內容授權、策略合作與方法論交流的正式接洽。",
  },
];

export default function ContactPage() {
  return (
    <TerminalPage
      eyebrow="Contact Desk"
      title="合作與聯繫入口"
      description="聯絡頁已完全切到新版，舊式宣傳文案與多餘區塊都不保留。這裡只留合作入口、需求分類與主聯絡通道。"
      stats={[
        { label: "Channel", value: "Email" },
        { label: "Priority", value: "B2B" },
        { label: "Status", value: "Open" },
      ]}
    >
      <div className="mb-6 rounded-[8px] border border-[var(--brand-line)] bg-[rgba(125,249,255,0.03)] p-6">
        <p className="brand-panel-label">Primary Channel</p>
        <p className="mt-3 text-2xl font-light tracking-[0.04em] text-white">
          hello@aipatentinsight.com
        </p>
        <p className="mt-3 text-sm leading-7 text-[var(--brand-text-soft)]">
          來信時直接附上需求類型、產業主題、交付格式與預計時程。
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {contactCards.map((card) => (
          <article key={card.title} className="brand-card rounded-[8px] p-6">
            <p className="brand-panel-label">Route</p>
            <h2 className="mt-3 text-2xl font-light tracking-[0.08em] text-white">{card.title}</h2>
            <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">{card.body}</p>
          </article>
        ))}
      </div>
    </TerminalPage>
  );
}
