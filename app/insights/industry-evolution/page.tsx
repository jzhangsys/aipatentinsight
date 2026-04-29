import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import TerminalPage from "@/components/terminal/TerminalPage";
import { getWebPageSchema, siteUrl } from "@/lib/schema";

export const metadata: Metadata = {
  title: "產業演化趨勢",
  description:
    "追蹤技術路線、產業動能與主流演化方向，建立對關鍵產業的結構化理解。",
};

const sampleItems = [
  "AI 伺服器產業演化觀察",
  "先進封裝主流技術路徑整理",
  "生技與 AI 結合的技術動能變化",
];

export default function IndustryEvolutionPage() {
  const schemaData = getWebPageSchema({
    name: "產業演化趨勢",
    description:
      "追蹤技術路線、產業動能與主流演化方向，建立對關鍵產業的結構化理解。",
    url: `${siteUrl}/insights/industry-evolution`,
    about: sampleItems,
  });

  return (
    <TerminalPage
      eyebrow="Industry Evolution"
      title="產業演化速覽"
      description="舊版的短篇內容頁面樣式已移除，這裡只保留終端式 watchlist 入口，作為後續擴寫成長文報告的前置區。"
      stats={[
        { label: "List", value: "03" },
        { label: "Mode", value: "Watch" },
        { label: "Output", value: "Brief" },
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
