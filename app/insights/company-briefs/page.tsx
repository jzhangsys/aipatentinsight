import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import TerminalPage from "@/components/terminal/TerminalPage";
import { getWebPageSchema, siteUrl } from "@/lib/schema";

export const metadata: Metadata = {
  title: "精選公司簡介",
  description:
    "整理重點公司的技術定位、產品方向與競爭位置，建立更清楚的公司理解框架。",
};

const sampleItems = [
  "NVIDIA 公司技術定位簡介",
  "TSMC 技術與供應鏈角色簡介",
  "ASML 關鍵設備與產業位置簡介",
];

export default function CompanyBriefsPage() {
  const schemaData = getWebPageSchema({
    name: "精選公司簡介",
    description:
      "整理重點公司的技術定位、產品方向與競爭位置，建立更清楚的公司理解框架。",
    url: `${siteUrl}/insights/company-briefs`,
    about: sampleItems,
  });

  return (
    <TerminalPage
      eyebrow="Company Briefs"
      title="公司觀測卡"
      description="這裡只保留新版研究終端語法，不再混用上一版卡片內容站風格。頁面定位是 company brief watchlist。"
      stats={[
        { label: "List", value: "03" },
        { label: "Mode", value: "Brief" },
        { label: "Target", value: "Desk" },
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
