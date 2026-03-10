import Link from "next/link";
import SchemaScript from "@/components/SchemaScript";
import { getWebPageSchema } from "@/lib/pageSchema";

export default function HomePage() {
  const schema = getWebPageSchema({
    title: "AI Patent Insight｜熊貓看產業",
    description:
      "以技術演化為核心的研究平台，透過專利、產業訊號與技術結構分析，辨識主流技術、分支路徑與企業在技術地圖中的位置。",
    path: "/",
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-16 md:px-10">
      <SchemaScript data={schema} />

      <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="max-w-4xl">
          <p className="brand-kicker">Panda Industry Watch</p>
          <h1 className="mt-3 text-4xl font-bold leading-tight md:text-6xl brand-title">
            熊貓看產業，
            <br className="hidden md:block" />
            看見技術主幹與產業結構
          </h1>
          <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--brand-text-soft)]">
            AI Patent Insight 是一個以技術演化為核心的研究平台。
            我們透過專利資料、產業輿情、總體環境與資金脈動等多源訊號，
            建立可持續更新的技術地圖，協助理解主流技術、分支路徑與企業在技術結構中的位置。
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <span className="brand-chip">技術演化地圖</span>
            <span className="brand-chip">專利研究</span>
            <span className="brand-chip">產業觀察</span>
            <span className="brand-chip">熊貓看產業</span>
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/reports/taiwan-technology-evolution-map" className="brand-button-primary">
              閱讀旗艦研究
            </Link>
            <Link href="/reports" className="brand-button-secondary">
              查看全部報告
            </Link>
          </div>
        </div>

        <div className="brand-card-soft rounded-[32px] p-8">
          <div className="flex items-center gap-4">
            <img
              src="/brand/logo-panda.png"
              alt="熊貓看產業"
              className="h-20 w-20 rounded-full border border-[var(--brand-line)] bg-white p-2"
            />
            <div>
              <p className="text-sm font-semibold tracking-wide text-[var(--brand-blue)]">
                Brand Signal
              </p>
              <h2 className="mt-1 text-2xl font-semibold brand-title">
                Panda as Observer
              </h2>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <p className="text-base leading-8 text-[var(--brand-text-soft)]">
              熊貓不是可愛裝飾，而是研究平台的觀察者符號。
            </p>
            <p className="text-base leading-8 text-[var(--brand-text-soft)]">
              它代表從複雜的產業結構中，冷靜辨識技術主幹、支撐層、橋接節點與應用擴散方向。
            </p>
            <p className="text-base leading-8 text-[var(--brand-text-soft)]">
              這也是 AI Patent Insight 的品牌核心：以結構視角理解產業世界。
            </p>
          </div>
        </div>
      </section>

      <section className="mt-16 brand-card rounded-[32px] p-8">
        <div className="max-w-4xl">
          <p className="brand-kicker">Featured Research</p>
          <h2 className="mt-2 text-3xl font-semibold brand-title">
            台灣產業技術演化地圖
          </h2>
          <p className="mt-4 text-base leading-8 text-[var(--brand-text-soft)]">
            從台灣申請專利出發，結合多源訊號與技術結構分析，辨識哪些技術正在形成主流，
            哪些技術屬於支撐層、橋接層與應用擴散層，並進一步觀察關鍵企業在技術地圖中的位置與角色。
          </p>
        </div>
        <div className="mt-6">
          <Link href="/reports/taiwan-technology-evolution-map" className="brand-button-primary">
            前往閱讀
          </Link>
        </div>
      </section>

      <section className="mt-16">
        <p className="brand-kicker">Methodology</p>
        <h2 className="mt-2 text-3xl font-semibold brand-title">研究方法框架</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          <article className="brand-card rounded-[28px] p-6">
            <p className="text-sm font-semibold tracking-wide text-[var(--brand-blue)]">01</p>
            <h3 className="mt-3 text-xl font-semibold">Evolutionary Landscape Modeling</h3>
            <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">
              整合專利、輿情、總經與資金脈動等多源訊號，辨識主流技術與分支技術的動能與路徑。
            </p>
          </article>

          <article className="brand-card rounded-[28px] p-6">
            <p className="text-sm font-semibold tracking-wide text-[var(--brand-blue)]">02</p>
            <h3 className="mt-3 text-xl font-semibold">Topological Structure Analysis</h3>
            <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">
              透過技術結構分析觀察不同主題之間的連接關係，理解哪些技術位於主幹、橋接或支撐位置。
            </p>
          </article>

          <article className="brand-card rounded-[28px] p-6">
            <p className="text-sm font-semibold tracking-wide text-[var(--brand-blue)]">03</p>
            <h3 className="mt-3 text-xl font-semibold">Strategic Interaction Analysis</h3>
            <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">
              將企業放回技術地圖之中，觀察公司在不同技術區塊中的位置，以及其技術選擇與策略取捨。
            </p>
          </article>
        </div>
      </section>

      <section className="mt-16 grid gap-6 md:grid-cols-3">
        <article className="brand-card rounded-[28px] p-6">
          <h2 className="text-xl font-semibold">洞察 Insights</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">
            聚焦短篇技術觀察，快速整理近期產業動態、技術節點與公司位置變化。
          </p>
          <div className="mt-6">
            <Link href="/insights" className="text-sm font-medium text-[var(--brand-blue)] underline underline-offset-4">
              前往洞察
            </Link>
          </div>
        </article>

        <article className="brand-card rounded-[28px] p-6">
          <h2 className="text-xl font-semibold">深度報告 Reports</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">
            以旗艦研究頁形式，系統整理技術地圖、關鍵公司、產業結構與演化方向。
          </p>
          <div className="mt-6">
            <Link href="/reports" className="text-sm font-medium text-[var(--brand-blue)] underline underline-offset-4">
              查看報告
            </Link>
          </div>
        </article>

        <article className="brand-card rounded-[28px] p-6">
          <h2 className="text-xl font-semibold">API 服務</h2>
          <p className="mt-4 text-sm leading-7 text-[var(--brand-text-soft)]">
            未來將逐步提供結構化技術資料與研究型 API 服務，作為企業內部分析與應用的基礎。
          </p>
          <div className="mt-6">
            <Link href="/api-services" className="text-sm font-medium text-[var(--brand-blue)] underline underline-offset-4">
              查看 API 服務
            </Link>
          </div>
        </article>
      </section>

      <section className="mt-16 border-t border-[var(--brand-line)] pt-12">
        <p className="brand-kicker">Research Notes</p>
        <h2 className="mt-2 text-2xl font-semibold brand-title">研究說明</h2>
        <div className="mt-5 max-w-4xl space-y-5">
          <p className="text-base leading-8 text-[var(--brand-text-soft)]">
            本站目前之專利技術分析，主要以台灣申請或公開之專利文件為主要研究來源，
            尚未完整納入其他國家或地區之專利資料。
          </p>
          <p className="text-base leading-8 text-[var(--brand-text-soft)]">
            本站內容僅供技術研究、產業觀察與資訊整理之用途，不構成任何形式之投資建議、
            證券推薦、投資邀約或財務建議。
          </p>
        </div>
      </section>
    </main>
  );
}
