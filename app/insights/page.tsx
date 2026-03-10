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

      <section className="max-w-4xl">
        <p className="brand-kicker">Research Signals</p>
        <h1 className="mt-2 text-4xl font-bold brand-title">洞察 Insights</h1>
        <p className="mt-4 text-lg leading-8 text-[var(--brand-text-soft)]">
          聚焦短篇技術觀察，快速整理近期產業訊號、技術節點與公司位置變化，
          作為深度研究之前的快速入口。
        </p>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-3">
        <article className="brand-card rounded-[28px] p-6">
          <h2 className="text-xl font-semibold">主流技術訊號</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">
            快速觀察哪些技術主題正在形成主流，哪些仍屬支撐、橋接或分支階段。
          </p>
        </article>

        <article className="brand-card rounded-[28px] p-6">
          <h2 className="text-xl font-semibold">公司位置變化</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">
            用結構化方式整理公司在技術地圖中的位置變化，而不是只看單一新聞事件。
          </p>
        </article>

        <article className="brand-card rounded-[28px] p-6">
          <h2 className="text-xl font-semibold">研究前哨站</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">
            將洞察頁作為深度研究的前哨站，先建立技術訊號，再擴展為完整報告。
          </p>
        </article>
      </section>
    </main>
  );
}
