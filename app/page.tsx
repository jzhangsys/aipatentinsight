import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import { getWebPageSchema } from "@/lib/pageSchema";

export default function HomePage() {
  const schema = getWebPageSchema({
    title: "AI Patent Insight｜技術演化研究平台",
    description:
      "以技術演化為核心的研究平台，透過專利、產業訊號與技術結構分析，辨識主流技術、分支路徑與企業在技術地圖中的位置。",
    path: "/",
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:px-10">
      <SchemaScript data={schema} />

      <section className="max-w-4xl">
        <p className="text-sm font-semibold tracking-wide text-neutral-500">
          AI Patent Insight
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight md:text-5xl">
          從專利、產業訊號與技術結構，
          <br className="hidden md:block" />
          看見產業技術演化的主幹與分支
        </h1>
        <p className="mt-6 max-w-3xl text-lg leading-8 text-neutral-600">
          AI Patent Insight 是一個以技術演化為核心的研究平台，透過專利資料、
          產業輿情、總體環境與資金脈動等多源訊號，建立可持續更新的技術地圖，
          協助理解主流技術、分支路徑與企業在技術結構中的位置。
        </p>
      </section>

      <section className="mt-12 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <article className="rounded-3xl border border-neutral-200 bg-neutral-50 p-8">
          <p className="text-sm font-semibold tracking-wide text-neutral-500">
            Featured Research
          </p>
          <h2 className="mt-3 text-2xl font-semibold">
            台灣產業技術演化地圖
          </h2>
          <p className="mt-4 text-base leading-8 text-neutral-700">
            從台灣申請專利出發，結合多源訊號與技術結構分析，辨識哪些技術正在形成主流，
            哪些技術屬於支撐層、橋接層與應用擴散層，並進一步觀察關鍵企業在技術地圖中的位置與角色。
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href="/reports/taiwan-technology-evolution-map"
              className="rounded-full bg-neutral-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-neutral-700"
            >
              閱讀旗艦研究
            </Link>
            <Link
              href="/reports"
              className="rounded-full border border-neutral-300 px-5 py-3 text-sm font-medium text-neutral-900 transition hover:bg-white"
            >
              查看全部報告
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-8">
          <p className="text-sm font-semibold tracking-wide text-neutral-500">
            AI Summary
          </p>
          <div className="mt-4 space-y-4">
            <p className="text-base leading-8 text-neutral-700">
              本站的研究不是只看單一產業新聞，而是從技術主題之間的結構關係出發。
            </p>
            <p className="text-base leading-8 text-neutral-700">
              研究重點在於辨識哪些技術構成產業主幹，哪些技術扮演支撐、橋接與擴散角色。
            </p>
            <p className="text-base leading-8 text-neutral-700">
              企業分析的目的，不是給出投資建議，而是理解公司位於技術地圖中的哪個位置。
            </p>
          </div>
        </article>
      </section>

      <section className="mt-16">
        <h2 className="text-2xl font-semibold">研究方法框架</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <article className="rounded-3xl border border-neutral-200 bg-white p-6">
            <p className="text-sm font-semibold tracking-wide text-neutral-500">
              01
            </p>
            <h3 className="mt-3 text-xl font-semibold">
              Evolutionary Landscape Modeling
            </h3>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              整合專利、輿情、總經與資金脈動等多源訊號，辨識主流技術與分支技術的動能與路徑。
            </p>
          </article>

          <article className="rounded-3xl border border-neutral-200 bg-white p-6">
            <p className="text-sm font-semibold tracking-wide text-neutral-500">
              02
            </p>
            <h3 className="mt-3 text-xl font-semibold">
              Topological Structure Analysis
            </h3>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              透過技術結構分析觀察不同主題之間的連接關係，理解哪些技術位於主幹、橋接或支撐位置。
            </p>
          </article>

          <article className="rounded-3xl border border-neutral-200 bg-white p-6">
            <p className="text-sm font-semibold tracking-wide text-neutral-500">
              03
            </p>
            <h3 className="mt-3 text-xl font-semibold">
              Strategic Interaction Analysis
            </h3>
            <p className="mt-4 text-sm leading-7 text-neutral-600">
              將企業放回技術地圖之中，觀察公司在不同技術區塊中的位置，以及其技術選擇與策略取捨。
            </p>
          </article>
        </div>
      </section>

      <section className="mt-16 grid gap-6 md:grid-cols-3">
        <article className="rounded-3xl border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-semibold">洞察 Insights</h2>
          <p className="mt-4 text-sm leading-7 text-neutral-600">
            聚焦短篇技術觀察，快速整理近期產業動態、技術節點與公司位置變化。
          </p>
          <div className="mt-6">
            <Link
              href="/insights"
              className="text-sm font-medium text-neutral-900 underline underline-offset-4"
            >
              前往洞察
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-semibold">深度報告 Reports</h2>
          <p className="mt-4 text-sm leading-7 text-neutral-600">
            以旗艦研究頁形式，系統整理技術地圖、關鍵公司、產業結構與演化方向。
          </p>
          <div className="mt-6">
            <Link
              href="/reports"
              className="text-sm font-medium text-neutral-900 underline underline-offset-4"
            >
              查看報告
            </Link>
          </div>
        </article>

        <article className="rounded-3xl border border-neutral-200 bg-white p-6">
          <h2 className="text-xl font-semibold">API 服務</h2>
          <p className="mt-4 text-sm leading-7 text-neutral-600">
            未來將逐步提供結構化技術資料與研究型 API 服務，作為企業內部分析與應用的基礎。
          </p>
          <div className="mt-6">
            <Link
              href="/api-services"
              className="text-sm font-medium text-neutral-900 underline underline-offset-4"
            >
              查看 API 服務
            </Link>
          </div>
        </article>
      </section>

      <section className="mt-16 border-t border-neutral-200 pt-12">
        <h2 className="text-2xl font-semibold">研究說明</h2>
        <div className="mt-5 max-w-4xl space-y-5">
          <p className="text-base leading-8 text-neutral-700">
            本站目前之專利技術分析，主要以台灣申請或公開之專利文件為主要研究來源，
            尚未完整納入其他國家或地區之專利資料。
          </p>
          <p className="text-base leading-8 text-neutral-700">
            本站內容僅供技術研究、產業觀察與資訊整理之用途，不構成任何形式之投資建議、
            證券推薦、投資邀約或財務建議。
          </p>
        </div>
      </section>
    </main>
  );
}
