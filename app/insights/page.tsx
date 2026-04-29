import type { Metadata } from "next";
import SchemaScript from "@/components/SchemaScript";
import InsightsTerminal from "@/components/insights/InsightsTerminal";
import { getCollectionPageSchema } from "@/lib/pageSchema";
import dataset from "@/content/insights/company-patent-map.json";
import type { InsightsDataset } from "@/lib/insights";

const insightsDataset = dataset as unknown as InsightsDataset;

export const metadata: Metadata = {
  title: "洞察 Insights",
  description:
    "聚焦短篇技術觀察，快速整理產業動態、技術節點與公司在技術地圖中的位置變化。",
};

export default function InsightsPage() {
  const schema = getCollectionPageSchema({
    title: "洞察 Insights｜AI Patent Insight",
    description:
      "聚焦短篇技術觀察，快速整理產業動態、技術節點與公司在技術地圖中的位置變化。",
    path: "/insights",
  });

  return (
    <main className="px-0 pb-0 pt-0">
      <SchemaScript data={schema} />
      <InsightsTerminal dataset={insightsDataset} />
    </main>
  );
}
