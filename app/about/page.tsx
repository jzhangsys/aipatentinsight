import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "關於我們｜AI Patent Insight",
  description:
    "了解 AI Patent Insight 的研究定位、內容方向與未來服務架構。",
};

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:px-10">
      <h1 className="text-4xl font-bold">關於我們</h1>
      <p className="mt-6 text-lg leading-8 text-neutral-600">
        AI Patent Insight 以研究內容為基礎，逐步建立產業演化趨勢、精選專利摘要、精選公司簡介，以及未來可延伸的 API 服務與深度解析報告平台。
      </p>
    </main>
  );
}