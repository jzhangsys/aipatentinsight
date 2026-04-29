import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import TerminalPage from "@/components/terminal/TerminalPage";
import { getWebPageSchema, siteUrl } from "@/lib/schema";

export const metadata: Metadata = {
  title: "精選專利摘要",
  description:
    "從大量專利中提煉重點技術內容，快速掌握專利主張、應用方向與技術意義。",
};

const sampleItems = [
  "高頻傳輸與封裝相關專利摘要",
  "生成式 AI 推論加速技術專利摘要",
  "CPO 共封裝光學專利重點摘要",
];

export default function PatentHighlightsPage() {
  const schemaData = getWebPageSchema({
    name: "精選專利摘要",
    description:
      "從大量專利中提煉重點技術內容，快速掌握專利主張、應用方向與技術意義。",
    url: `${siteUrl}/insights/patent-highlights`,
    about: sampleItems,
  });

  return (
    <TerminalPage
      eyebrow="Patent Highlights"
      title="專利亮點摘要"
      description="專利亮點頁也切成同一套終端介面，不再保留舊網站式內容節奏。它現在只是研究桌面上的摘要清單。"
      stats={[
        { label: "List", value: "03" },
        { label: "Mode", value: "Digest" },
        { label: "Focus", value: "Patent" },
      ]}
    >
      <SchemaScript data={schemaData} />
      <div className="grid gap-4">
        {sampleItems.map((item, index) => (
          <article
            key={item}
            className="brand-card rounded-[8px] px-5 py-5"
          >
            <p className="brand-panel-label">{String(index + 1).padStart(2, "0")}</p>
            <h2 className="mt-3 text-xl font-light tracking-[0.06em] text-white">{item}</h2>
          </article>
        ))}
      </div>

      <div className="mt-10">
        <Link href="/reports" className="brand-button-primary">
          前往深度解析報告
        </Link>
      </div>
    </TerminalPage>
  );
}
