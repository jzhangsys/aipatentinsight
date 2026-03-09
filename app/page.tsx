import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import {
  getHomepageSchema,
  getOrganizationSchema,
  getWebsiteSchema,
} from "@/lib/schema";
import { reports } from "@/content/reports/reports";

export const metadata: Metadata = {
  title: "AI Patent Insight｜產業演化趨勢、專利摘要、公司簡介與研究平台",
  description:
    "以產業演化趨勢、精選專利摘要、精選公司簡介、API 服務與深度解析報告為核心的研究平台；目前 API 與深度報告服務僅接受客製預定。",
};

const insightLinks = [
  {
    title: "產業演化趨勢",
    description: "追蹤技術路線、產業動能與主流演化方向。",
    href: "/insights/industry-evolution",
  },
  {
    title: "精選專利摘要",
    description: "從大量專利中提煉關鍵技術內容與應用意義。",
    href: "/insights/patent-highlights",
  },
  {
    title: "精選公司簡介",
    description: "整理重點公司的技術定位、產品方向與競爭位置。",
    href: "/insights/company-briefs",
  },
];

export default function HomePage() {
  const schemaData = [
    getOrganizationSchema(),
    getWebsiteSchema(),
    getHomepageSchema(),
  ];

  return (
    <main className="bg-white text-neutral-900">
      <SchemaScript data={schemaData} />

      <section className="mx-auto max-w-5xl px-6 py-20">
        <p className="text-sm font-medium tracking-wide text-neutral-500">
          AI Patent Insight
        </p>

        <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
          以產業演化趨勢、精選專利摘要、精選公司簡介為核心的研究平台
        </h1>

        <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
          提供可持續更新的研究內容，並預留 API 服務與深度解析報告的商務合作架構；目前 API 與深度報告服務僅接受客製預定。
        </p>

        <div className="mt-8 flex flex-wrap gap-4">
          <Link
            href="/insights"
            className="border border-neutral-900 px-5 py-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-900 hover:text-white"
          >
            查看洞察內容
          </Link>
          <Link
            href="/reports"
            className="border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
          >
            查看深度報告
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-5xl border-t border-neutral-200 px-6 py-16">
        <h2 className="text-2xl font-semibold">研究內容入口</h2>
        <div className="mt-8 space-y-8">
          {insightLinks.map((item) => (
            <article
              key={item.href}
              className="border-b border-neutral-200 pb-8 last:border-b-0"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <h3 className="text-xl font-semibold">{item.title}</h3>
                  <p className="mt-2 text-base leading-7 text-neutral-600">
                    {item.description}
                  </p>
                </div>
                <Link
                  href={item.href}
                  className="text-sm font-medium text-neutral-900 underline underline-offset-4"
                >
                  進入頁面
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl border-t border-neutral-200 px-6 py-16">
        <h2 className="text-2xl font-semibold">精選報告</h2>
        <div className="mt-8 space-y-8">
          {reports.map((report) => (
            <article
              key={report.slug}
              className="border-b border-neutral-200 pb-8 last:border-b-0"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="max-w-2xl">
                  <p className="text-sm font-medium text-neutral-500">
                    {report.category}
                  </p>
                  <h3 className="mt-2 text-xl font-semibold">{report.title}</h3>
                  <p className="mt-2 text-base leading-7 text-neutral-600">
                    {report.summary}
                  </p>
                </div>
                <Link
                  href={`/reports/${report.slug}`}
                  className="text-sm font-medium text-neutral-900 underline underline-offset-4"
                >
                  查看報告
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl border-t border-neutral-200 px-6 py-16">
        <div className="grid gap-10 md:grid-cols-2">
          <section>
            <h2 className="text-2xl font-semibold">API 服務</h2>
            <p className="mt-4 text-base leading-8 text-neutral-600">
              規劃中的 API 服務將以產業、專利與公司研究資料為核心，支援企業、研究團隊與系統整合需求。
            </p>
            <p className="mt-4 text-sm font-medium text-neutral-900">
              目前僅接受客製預定。
            </p>
            <div className="mt-6">
              <Link
                href="/api-services"
                className="text-sm font-medium text-neutral-900 underline underline-offset-4"
              >
                查看 API 服務
              </Link>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold">深度解析報告</h2>
            <p className="mt-4 text-base leading-8 text-neutral-600">
              深度解析報告將涵蓋產業、技術、專利與公司主題，可延伸為標準化研究架構與客製化研究服務。
            </p>
            <p className="mt-4 text-sm font-medium text-neutral-900">
              目前僅接受客製預定。
            </p>
            <div className="mt-6">
              <Link
                href="/reports"
                className="text-sm font-medium text-neutral-900 underline underline-offset-4"
              >
                查看報告服務
              </Link>
            </div>
          </section>
        </div>
      </section>

      <section className="mx-auto max-w-5xl border-t border-neutral-200 px-6 py-16">
        <h2 className="text-2xl font-semibold">關於平台</h2>
        <p className="mt-4 max-w-3xl text-base leading-8 text-neutral-600">
          AI Patent Insight 以研究內容為基礎，逐步建立產業演化趨勢、精選專利摘要、精選公司簡介，以及未來可延伸的 API 服務與深度解析報告平台。
        </p>
        <div className="mt-6">
          <Link
            href="/about"
            className="text-sm font-medium text-neutral-900 underline underline-offset-4"
          >
            了解更多
          </Link>
        </div>
      </section>
    </main>
  );
}
