import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "API 服務｜AI Patent Insight",
  description:
    "提供可供企業與研究團隊規劃導入的 API 服務架構，目前僅接受客製預定。",
};

export default function ApiServicesPage() {
  return (
    <main className="mx-auto max-w-7xl px-6 py-16 md:px-10">
      <section className="max-w-3xl">
        <h1 className="text-4xl font-bold">API 服務</h1>
        <p className="mt-4 text-lg leading-8 text-neutral-600">
          提供可供企業與研究團隊規劃導入的 API 服務架構，支援資料整合、研究流程與系統應用。
        </p>
        <p className="mt-4 text-base font-medium text-neutral-900">
          目前僅接受客製預定。
        </p>
      </section>

      <section className="mt-12 grid gap-6 md:grid-cols-2">
        <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">可規劃資料類型</h2>
          <ul className="mt-4 space-y-3 text-sm leading-7 text-neutral-600">
            <li>產業研究資料</li>
            <li>專利摘要與技術脈絡資料</li>
            <li>公司研究與技術定位資料</li>
          </ul>
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold">合作方式</h2>
          <p className="mt-4 text-sm leading-7 text-neutral-600">
            第一版先以商務洽談與客製預定為主，未來可延伸為正式方案、文件入口與開發者介面。
          </p>
          <div className="mt-6">
            <Link
              href="/contact"
              className="text-sm font-medium text-neutral-900 underline underline-offset-4"
            >
              洽詢 API 需求
            </Link>
          </div>
        </article>
      </section>
    </main>
  );
}