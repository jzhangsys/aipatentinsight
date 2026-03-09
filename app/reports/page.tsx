import type { Metadata } from "next";
import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import { reports } from "@/content/reports/reports";
import { getCollectionPageSchema, siteUrl } from "@/lib/schema";

export const metadata: Metadata = {
  title: "深度解析報告",
  description:
    "提供產業、技術、專利與公司主題的深度解析服務，未來可延伸為圖文研究報告庫；目前僅接受客製預定。",
};

export default function ReportsPage() {
  const schemaData = getCollectionPageSchema({
    name: "深度解析報告",
    description:
      "提供產業、技術、專利與公司主題的深度解析服務，未來可延伸為圖文研究報告庫；目前僅接受客製預定。",
    url: `${siteUrl}/reports`,
    itemNames: reports.map((report) => report.title),
  });

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <SchemaScript data={schemaData} />

      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold">深度解析報告</h1>
        <p className="mt-4 text-lg leading-8 text-neutral-600">
          提供產業、技術、專利與公司主題的深度解析服務，未來可延伸為標準化研究報告庫與圖文內容頁。
        </p>
        <p className="mt-4 text-base font-medium text-neutral-900">
          目前僅接受客製預定。
        </p>
      </section>

      <section className="mt-12 space-y-10 border-t border-neutral-200 pt-12">
        <article>
          <h2 className="text-2xl font-semibold">未來報告呈現方式</h2>
          <p className="mt-4 text-base leading-8 text-neutral-600">
            報告頁將以圖文內容為核心，可包含標題、摘要、分段內文、研究圖表、重點圖片與延伸連結，使每份報告不只可閱讀，也能作為可被搜尋引擎理解與索引的研究內容頁。
          </p>
        </article>

        <article>
          <h2 className="text-2xl font-semibold">現有報告樣本</h2>
          <div className="mt-6 space-y-6">
            {reports.map((report) => (
              <article
                key={report.slug}
                className="rounded-3xl border border-neutral-200 p-6"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="max-w-2xl">
                    <p className="text-sm font-medium text-neutral-500">
                      {report.category}
                    </p>
                    <h3 className="mt-2 text-2xl font-semibold">
                      {report.title}
                    </h3>
                    <p className="mt-4 text-base leading-8 text-neutral-600">
                      {report.summary}
                    </p>
                    <p className="mt-4 text-sm text-neutral-500">
                      發布日期：{report.publishedAt}
                    </p>
                    <p className="mt-2 text-sm font-medium text-neutral-900">
                      狀態：
                      {report.status === "custom-only"
                        ? " 目前僅接受客製預定"
                        : " 已發布"}
                    </p>
                  </div>

                  <div className="shrink-0">
                    <Link
                      href={`/reports/${report.slug}`}
                      className="text-sm font-medium text-neutral-900 underline underline-offset-4"
                    >
                      查看報告
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article>
          <h2 className="text-2xl font-semibold">客製化研究需求</h2>
          <p className="mt-4 text-base leading-8 text-neutral-600">
            目前可依指定產業、公司、專利範圍與技術主題，規劃客製化深度解析方向，並依需求調整研究深度與交付形式。
          </p>

          <div className="mt-6">
            <Link
              href="/contact"
              className="text-sm font-medium text-neutral-900 underline underline-offset-4"
            >
              洽詢客製需求
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}
