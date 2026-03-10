import type { Metadata } from "next";
import SchemaScript from "@/components/SchemaScript";
import { getCollectionPageSchema } from "@/lib/pageSchema";

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
    <main className="mx-auto max-w-6xl px-6 py-16 md:px-10">
      <SchemaScript data={schema} />

      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold">洞察 Insights</h1>
        <p className="mt-4 text-lg leading-8 text-neutral-600">
          以短篇觀察整理近期產業訊號、技術節點與公司位置變化，作為深度研究之前的快速入口。
        </p>
      </section>
    </main>
  );
}
