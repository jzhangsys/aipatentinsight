import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
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
    <main className="mx-auto max-w-7xl px-6 py-10 md:px-10">
      <SchemaScript data={schemaData} />

      <section className="brand-card rounded-[36px] p-6 md:p-8">
        <p className="brand-kicker">Company Briefs</p>
        <h1 className="mt-2 text-4xl font-semibold brand-title md:text-5xl">公司觀測卡</h1>
        <p className="mt-5 max-w-3xl text-base leading-8 text-[var(--brand-text-soft)]">
          用更像研究卡片的形式呈現公司定位與供應鏈角色，方便日後持續擴充。
        </p>
      </section>

      <section className="mt-8 grid gap-4">
        {sampleItems.map((item, index) => (
          <article
            key={item}
            className="rounded-[26px] border border-[var(--brand-line)] bg-[rgba(19,28,46,0.82)] px-5 py-5"
          >
            <p className="brand-data text-xs text-[var(--brand-blue)]">{String(index + 1).padStart(2, "0")}</p>
            <h2 className="mt-3 text-xl font-semibold text-white">{item}</h2>
          </article>
        ))}
      </section>

      <section className="mt-10">
        <Link href="/reports" className="brand-button-primary">
          前往深度解析報告
        </Link>
      </section>
    </main>
  );
}
