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
    <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
      <SchemaScript data={schemaData} />

      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold">精選公司簡介</h1>
        <p className="mt-4 text-lg leading-8 text-neutral-600">
          以研究導向整理重點公司的技術定位、產品布局與產業位置，協助建立清楚的理解框架。
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">最新公司主題</h2>
        <ul className="mt-6 space-y-4">
          {sampleItems.map((item) => (
            <li
              key={item}
              className="rounded-2xl border border-neutral-200 px-5 py-4"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className="text-2xl font-semibold">延伸到深度解析報告</h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-neutral-600">
          若你希望從公司簡介延伸到更完整的技術定位、競爭格局與研究分析，可進一步查看深度解析報告。
        </p>
        <div className="mt-6">
          <Link
            href="/reports"
            className="text-sm font-medium text-neutral-900 underline underline-offset-4"
          >
            前往深度解析報告
          </Link>
        </div>
      </section>
    </main>
  );
}
