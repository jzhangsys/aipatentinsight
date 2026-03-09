import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "聯絡我們｜AI Patent Insight",
  description:
    "與 AI Patent Insight 聯絡，洽詢 API 服務、深度解析報告與研究合作需求。",
};

export default function ContactPage() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16 md:px-10">
      <h1 className="text-4xl font-bold">聯絡我們</h1>
      <p className="mt-6 text-lg leading-8 text-neutral-600">
        若你想洽詢 API 客製需求、深度解析報告合作，或研究內容相關合作，歡迎與我們聯絡。
      </p>

      <div className="mt-10 rounded-3xl border border-neutral-200 p-6">
        <h2 className="text-xl font-semibold">聯絡方式</h2>
        <p className="mt-4 text-sm leading-7 text-neutral-600">
          Email：hello@aipatentinsight.com
        </p>
      </div>
    </main>
  );
}